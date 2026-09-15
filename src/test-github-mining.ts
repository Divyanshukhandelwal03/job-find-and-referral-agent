import { discoverDecisionMakers, mineGitHubEmployeesAndEvents } from './services/contactDiscovery.js';

async function runTests() {
  console.log('=== TEST 1: GitHub Public Event Mining Direct Test (Swiggy) ===');
  const swiggyMining = await mineGitHubEmployeesAndEvents({
    company: 'Swiggy',
    domain: 'swiggy.in',
    jobTitle: 'Android Engineer',
  });
  console.log(`Discovered ${swiggyMining.length} contacts for Swiggy:`);
  for (const c of swiggyMining) {
    console.log(`- [${c.source}] ${c.name} | ${c.role} | Official: ${c.officialEmail} | Alt: ${c.secondaryEmail || 'none'} | Verified: ${c.verified} (${c.deliveryRisk}) | GitHub: ${c.githubUrl || 'N/A'}`);
  }

  console.log('\n=== TEST 2: Primary Pipeline Orchestration (Swiggy) ===');
  const contacts = await discoverDecisionMakers({
    company: 'Swiggy',
    jobTitle: 'Android Engineer',
  });
  console.log(`Orchestrator returned ${contacts.length} contacts for Swiggy:`);
  for (const c of contacts) {
    console.log(`- [${c.source}] ${c.name} | ${c.role} | ${c.officialEmail} | Priority: ${c.priorityLabel}`);
  }

  console.log('\n=== TEST 3: Secondary Fallback Pipeline Test (Non-tech company with 0 GitHub contacts) ===');
  const fallbackContacts = await discoverDecisionMakers({
    company: 'NonExistentLocalBakeryXYZ',
    domain: 'localbakeryxyz.com',
  });
  console.log(`Fallback pipeline returned ${fallbackContacts.length} contacts:`);
  for (const c of fallbackContacts) {
    console.log(`- [${c.source}] ${c.name} | ${c.role} | ${c.officialEmail}`);
  }

  console.log('\n✅ All Tests Completed Successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
