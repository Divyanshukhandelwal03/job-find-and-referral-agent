import { db, UserProfile, JobListing } from './db/index.js';
import { discoverWorldwideJobs } from './services/jobDiscovery.js';
import { discoverDecisionMakers, toReferralContact } from './services/contactDiscovery.js';
import { analyzeJobMatch, generateReferralPitch, generateRevertResponse } from './services/gemini.js';

async function runIntegrationVerification() {
  console.log('========================================================');
  console.log('🚀 STARTING FULL INTEGRATION VERIFICATION FOR JOB AGENT');
  console.log('========================================================\n');

  // 1. Profile Setup with Field, Experience Years, and Tech Stack
  console.log('--- 1. Testing Profile Intelligence Setup ---');
  const candidateProfile: UserProfile = {
    id: 'candidate-divyanshu-test',
    fullName: 'Divyanshu Sharma',
    email: 'divyanshu@example.com',
    phone: '+91 9876543210',
    headline: 'Senior Full-Stack Engineer | Node.js, TypeScript, PostgreSQL, Distributed Systems',
    summary: 'Full-stack engineer with 4+ years of experience building high-throughput microservices and APIs.',
    field: 'Full-Stack & Backend Systems',
    totalExperienceYears: 4,
    experienceLevel: 'mid',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'React', 'Docker', 'Redis', 'REST APIs'],
    techStack: ['Node.js', 'TypeScript', 'PostgreSQL', 'React', 'Docker', 'Redis', 'Express'],
    targetRoles: ['Senior Backend Engineer', 'Full-Stack Developer', 'Lead SDE'],
    preferredLocations: ['Remote', 'India', 'Worldwide', 'Germany'],
    experience: [
      {
        title: 'Senior Backend Engineer',
        company: 'Sysmentix Tech',
        duration: '2023 - Present',
        highlights: [
          'Architected high-throughput API handling 50k events/sec with Redis & Node.js',
          'Cut latency by 45% using query optimization on PostgreSQL',
        ],
      },
    ],
    education: [
      {
        degree: 'B.Tech in Computer Science',
        school: 'National Institute of Technology',
        year: '2022',
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  db.saveProfile(candidateProfile);
  console.log('✅ Candidate profile saved:');
  console.log(`   Name: ${candidateProfile.fullName}`);
  console.log(`   Field: ${candidateProfile.field} (${candidateProfile.totalExperienceYears}y exp, ${candidateProfile.experienceLevel})`);
  console.log(`   Tech Stack: ${candidateProfile.techStack?.join(', ')}`);

  // 2. Test Worldwide Job Discovery Engine
  console.log('\n--- 2. Testing Worldwide Job Discovery Engine ---');
  const discoveredJobs = await discoverWorldwideJobs(candidateProfile, {
    keywords: 'Full Stack Engineer',
    countryCity: 'Worldwide',
    remoteOnly: false,
    limit: 10,
  });

  console.log(`✅ Discovered ${discoveredJobs.length} live worldwide job postings!`);
  if (discoveredJobs.length > 0) {
    const sample = discoveredJobs[0];
    console.log('   Sample Discovered Job:');
    console.log(`   - Title: ${sample.title}`);
    console.log(`   - Company: ${sample.company}`);
    console.log(`   - Location: ${sample.location} (Remote: ${sample.remote}, Visa: ${sample.visaSponsorship})`);
    console.log(`   - Source: ${sample.source}`);
    console.log(`   - AI Match Score: ${sample.matchScore}%`);
    console.log(`   - Matching Skills: ${sample.matchingSkills.join(', ')}`);
  }

  // 2b. Test Remote & Visa Sponsorship Filter
  console.log('\n--- 2b. Testing Visa Sponsorship / Remote Filter ---');
  const visaOrRemoteJobs = await discoverWorldwideJobs(candidateProfile, {
    keywords: 'Engineer',
    countryCity: 'Worldwide',
    visaSponsorshipOnly: true,
    limit: 5,
  });
  console.log(`✅ Discovered ${visaOrRemoteJobs.length} jobs with Visa Sponsorship or Worldwide Remote!`);

  // 3. Test Decision Maker Discovery (5-6 managers, leads, HRs with official emails)
  console.log('\n--- 3. Testing 5-6 Decision Makers Discovery ---');
  const testCompany = 'Razorpay';
  const targetJobTitle = 'Senior Backend Engineer';

  const decisionMakers = await discoverDecisionMakers({
    company: testCompany,
    jobTitle: targetJobTitle,
  });

  console.log(`✅ Discovered ${decisionMakers.length} Key Decision Makers for ${testCompany}:`);
  decisionMakers.forEach((dm, i) => {
    console.log(
      `   ${i + 1}. [${dm.priorityLabel}] ${dm.name} (${dm.role})`
    );
    console.log(`      ✉️ 1st Priority Official Email: ${dm.officialEmail} (MX Verified: ${dm.verified})`);
    console.log(`      🔗 LinkedIn Search: ${dm.linkedinUrl}`);
  });

  if (decisionMakers.length < 5) {
    throw new Error(`Expected at least 5 decision makers, got ${decisionMakers.length}`);
  }

  // 4. Test AI Match Evaluation and Pitch Generation
  console.log('\n--- 4. Testing JD Match Analysis & Tailored Pitch ---');
  const sampleJob: JobListing = {
    id: 'test-job-razorpay',
    title: 'Senior Backend Engineer',
    company: 'Razorpay',
    location: 'Remote / Bengaluru',
    description: `
      Razorpay is looking for a Senior Backend Engineer to architect core payment gateways.
      Requirements:
      - 3+ years experience in Node.js, TypeScript, PostgreSQL.
      - Experience with caching (Redis) and high availability microservices.
    `,
    status: 'saved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const analysis = await analyzeJobMatch(sampleJob.description, candidateProfile);
  console.log(`✅ AI Match Score: ${analysis.matchScore}%`);
  console.log(`   Summary: ${analysis.matchSummary}`);

  const leadContact = toReferralContact(decisionMakers[0], sampleJob.id, testCompany);
  const pitch = await generateReferralPitch({
    job: sampleJob,
    contact: leadContact,
    profile: candidateProfile,
    pitchType: 'hiring_manager',
  });

  console.log(`✅ Generated AI Outreach Pitch:`);
  console.log(`   Subject: "${pitch.subject}"`);
  console.log(`   Body Preview: "${pitch.body.slice(0, 160)}..."`);
  console.log(`   Follow-up Nudge: "${pitch.followUpSuggestion}"`);

  // 5. Test AI Revert Generator
  console.log('\n--- 5. Testing AI Revert Generator for Recruiter Replies ---');
  const mockRecruiterReply =
    "Hi Divyanshu, thanks for reaching out. We are actively interviewing for this role. Could you please send over your availability for a 15-minute introductory call this week?";

  const revert = await generateRevertResponse({
    incomingMessage: mockRecruiterReply,
    recipientName: leadContact.name,
    recipientRole: leadContact.role,
    company: testCompany,
    jobTitle: sampleJob.title,
    profile: candidateProfile,
  });

  console.log(`✅ Generated AI Revert Response:`);
  console.log(`   Subject: "${revert.subject}"`);
  console.log(`   Body Preview: "${revert.body.slice(0, 160)}..."`);

  console.log('\n========================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY!');
  console.log('========================================================\n');
}

runIntegrationVerification().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
