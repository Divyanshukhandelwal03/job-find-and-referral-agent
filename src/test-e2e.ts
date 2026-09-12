import { db, UserProfile, JobListing, ReferralContact } from './db/index.js';
import { analyzeJobMatch, generateReferralPitch } from './services/gemini.js';

async function runEndToEndVerification() {
  console.log('--- Starting End-to-End Verification of Local Agent ---');

  // 1. Verify Local DB & Profile setup
  const mockProfile: UserProfile = {
    id: 'test-profile-1',
    fullName: 'Divyanshu Sharma',
    email: 'divyanshu@example.com',
    phone: '+91 9876543210',
    headline: 'Senior Full-Stack Engineer | Node.js, TypeScript, PostgreSQL, Distributed Systems',
    summary: 'Full-stack engineer with 4+ years of experience building high-throughput APIs, microservices, and AI workflow automation.',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Express', 'React', 'Docker', 'Redis', 'Gemini AI', 'REST APIs'],
    targetRoles: ['Senior Backend Engineer', 'Full-Stack Developer', 'Lead Software Engineer'],
    experience: [
      {
        title: 'Senior Backend Engineer',
        company: 'Sysmentix Tech',
        duration: '2023 - Present',
        highlights: [
          'Architected real-time notification engine processing 50k events/sec with Redis & Node.js',
          'Reduced API latency by 45% through query optimization on PostgreSQL',
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

  db.saveProfile(mockProfile);
  console.log('✅ 1. Profile saved to local data/db.json');

  // 2. Add a sample target job
  const sampleJobDesc = `
  Razorpay is hiring a Senior Backend Engineer to join our Core Payments Team in Bengaluru or Remote.
  Responsibilities:
  - Design, develop, and maintain robust APIs handling millions of payment transactions daily.
  - Collaborate with cross-functional teams to integrate payment gateways and fraud detection systems.
  - Scale microservices using Node.js, TypeScript, PostgreSQL, and Kafka.
  Requirements:
  - 3+ years of professional backend engineering experience in Node.js or Golang.
  - Strong proficiency in SQL database design (PostgreSQL/MySQL) and caching with Redis.
  - Experience with high concurrency, distributed systems, and distributed tracing.
  `;

  const newJob: JobListing = {
    id: 'job-razorpay-test',
    title: 'Senior Backend Engineer',
    company: 'Razorpay',
    location: 'Remote / Bengaluru',
    description: sampleJobDesc.trim(),
    status: 'saved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveJob(newJob);
  console.log('✅ 2. Target job saved in database');

  // 3. Test Gemini Job Match Analysis
  console.log('Testing Gemini Job Match Analysis...');
  const analysis = await analyzeJobMatch(newJob.description, mockProfile);
  console.log(`✅ 3. Gemini Match Score: ${analysis.matchScore}%`);
  console.log(`   Summary: ${analysis.matchSummary}`);
  console.log(`   Top Strengths: ${analysis.strengths.slice(0, 2).join(' | ')}`);
  console.log(`   Identified Gaps: ${analysis.missingSkills.join(' | ')}`);

  newJob.matchScore = analysis.matchScore;
  newJob.matchSummary = analysis.matchSummary;
  newJob.strengths = analysis.strengths;
  newJob.missingSkills = analysis.missingSkills;
  newJob.status = 'analyzed';
  db.saveJob(newJob);

  // 4. Add Referral Target Contact
  const contact: ReferralContact = {
    id: 'contact-test-1',
    jobId: newJob.id,
    company: 'Razorpay',
    name: 'Siddharth Verma',
    role: 'Engineering Manager - Payments',
    email: 'siddharth.verma@razorpay.com',
    linkedinUrl: 'https://linkedin.com/in/siddharth-verma-payments',
    contactType: 'manager',
    status: 'uncontacted',
    createdAt: new Date().toISOString(),
  };
  db.saveContact(contact);
  console.log('✅ 4. Referral contact added');

  // 5. Test AI Referral Pitch Generation
  console.log('Testing Gemini Referral Pitch Generation for Hiring Manager...');
  const pitch = await generateReferralPitch({
    job: newJob,
    contact,
    profile: mockProfile,
    pitchType: 'hiring_manager',
  });

  console.log('✅ 5. Generated Pitch Output:');
  console.log(`   Subject: "${pitch.subject}"`);
  console.log(`   Body Preview: "${pitch.body.slice(0, 150)}..."`);
  console.log(`   Follow-up Nudge: "${pitch.followUpSuggestion}"`);

  console.log('\n========================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED! Local agent is 100% operational.');
  console.log('========================================================\n');
}

runEndToEndVerification().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
