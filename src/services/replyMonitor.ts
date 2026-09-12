import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { db, OutreachRecord } from '../db/index.js';

export interface ReplyCheckResult {
  success: boolean;
  message: string;
  checkedCount: number;
  newRepliesFound: number;
  replies: Array<{
    outreachId: string;
    recipientName?: string;
    recipientEmail?: string;
    subject: string;
    snippet: string;
    receivedAt: string;
  }>;
}

/**
 * Checks the user's Gmail inbox for replies to sent referral emails
 */
export async function checkGmailInboxForReplies(): Promise<ReplyCheckResult> {
  const settings = db.getSettings();

  if (!settings.gmailAddress || !settings.gmailAppPassword) {
    return {
      success: false,
      message: 'Gmail address or Google App Password is not configured in Settings.',
      checkedCount: 0,
      newRepliesFound: 0,
      replies: [],
    };
  }

  const sentOutreaches = db.getOutreach().filter((o) => o.status === 'sent' && o.recipientEmail);

  if (sentOutreaches.length === 0) {
    return {
      success: true,
      message: 'No active sent outreach records awaiting replies.',
      checkedCount: 0,
      newRepliesFound: 0,
      replies: [],
    };
  }

  const cleanPassword = settings.gmailAppPassword.replace(/\s+/g, '');
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: settings.gmailAddress.trim(),
      pass: cleanPassword,
    },
    logger: false,
  });

  const matchedReplies: Array<{
    outreachId: string;
    recipientName?: string;
    recipientEmail?: string;
    subject: string;
    snippet: string;
    receivedAt: string;
  }> = [];

  try {
    console.log(`[Reply Monitor] Connecting to Gmail IMAP for ${settings.gmailAddress}...`);
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Map of lowercase recipient emails to outreach records
      const emailMap = new Map<string, OutreachRecord>();
      for (const o of sentOutreaches) {
        if (o.recipientEmail) {
          emailMap.set(o.recipientEmail.toLowerCase(), o);
        }
      }

      // Fetch last 40 messages from INBOX
      const messageCount = client.mailbox ? (client.mailbox as any).exists || 0 : 0;
      const fetchRange = messageCount > 40 ? `${Math.max(1, messageCount - 40)}:*` : '1:*';

      console.log(`[Reply Monitor] Searching inbox messages (range ${fetchRange})...`);

      for await (const msg of client.fetch(fetchRange, { envelope: true, source: true })) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        const fromAddresses = (envelope.from || []).map((addr) => (addr.address || '').toLowerCase());
        const subject = (envelope.subject || '').toLowerCase();

        // Check if message is from one of our recipients or has matching Re: subject
        let matchedOutreach: OutreachRecord | undefined;

        for (const fromAddr of fromAddresses) {
          if (emailMap.has(fromAddr)) {
            matchedOutreach = emailMap.get(fromAddr);
            break;
          }
        }

        if (!matchedOutreach) {
          // Check by subject match
          for (const o of sentOutreaches) {
            const cleanSub = o.subject.toLowerCase().replace(/^(re:\s*)+/i, '').trim();
            if (cleanSub.length > 8 && subject.includes(cleanSub)) {
              matchedOutreach = o;
              break;
            }
          }
        }

        if (matchedOutreach) {
          // Parse the full email source to extract text
          let snippet = '';
          let fullText = '';
          try {
            if (msg.source) {
              const parsed = await simpleParser(msg.source);
              fullText = parsed.text || '';
              snippet = fullText.slice(0, 300).replace(/\s+/g, ' ').trim();
            }
          } catch (_) {
            snippet = envelope.subject || 'Incoming reply received';
          }

          const receivedAt = envelope.date ? new Date(envelope.date).toISOString() : new Date().toISOString();

          // Update record
          matchedOutreach.status = 'replied';
          matchedOutreach.incomingReply = {
            snippet,
            from: fromAddresses[0] || matchedOutreach.recipientEmail || 'Sender',
            receivedAt,
            fullBody: fullText,
          };
          db.saveOutreach(matchedOutreach);

          // Update job status
          if (matchedOutreach.jobId) {
            const job = db.getJobById(matchedOutreach.jobId);
            if (job) {
              job.status = 'replied';
              job.updatedAt = new Date().toISOString();
              db.saveJob(job);
            }
          }

          matchedReplies.push({
            outreachId: matchedOutreach.id,
            recipientName: matchedOutreach.recipientName,
            recipientEmail: matchedOutreach.recipientEmail,
            subject: envelope.subject || matchedOutreach.subject,
            snippet,
            receivedAt,
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return {
      success: true,
      message: `Scanned Gmail inbox successfully. Found ${matchedReplies.length} new replies.`,
      checkedCount: sentOutreaches.length,
      newRepliesFound: matchedReplies.length,
      replies: matchedReplies,
    };
  } catch (err: any) {
    console.error('[Reply Monitor] Error scanning inbox:', err?.message || err);
    try {
      await client.logout();
    } catch (_) {}

    return {
      success: false,
      message: `Failed to check Gmail inbox: ${err?.message || err}`,
      checkedCount: sentOutreaches.length,
      newRepliesFound: 0,
      replies: [],
    };
  }
}
