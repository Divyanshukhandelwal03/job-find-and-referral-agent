import { discoverWorldwideJobs } from './services/jobDiscovery.js';

async function test() {
  console.log('Testing discoverWorldwideJobs with keywords=React, location=India');
  const t0 = Date.now();
  const jobs = await discoverWorldwideJobs(null, {
    keywords: 'React',
    countryCity: 'India',
  });
  console.log(`Discovered ${jobs.length} jobs in ${Date.now() - t0}ms`);
  
  // Group by source
  const sourceCounts: Record<string, number> = {};
  for (const j of jobs) {
    sourceCounts[j.source] = (sourceCounts[j.source] || 0) + 1;
  }
  console.log('Sources breakdown:', sourceCounts);
  console.log('\nTesting discoverWorldwideJobs with keywords=Full Stack, location=Worldwide');
  const t1 = Date.now();
  const jobs2 = await discoverWorldwideJobs(null, {
    keywords: 'Full Stack',
    countryCity: 'Worldwide',
  });
  console.log(`Discovered ${jobs2.length} jobs in ${Date.now() - t1}ms`);
  const counts2: Record<string, number> = {};
  for (const j of jobs2) {
    counts2[j.source] = (counts2[j.source] || 0) + 1;
  }
  console.log('Sources breakdown:', counts2);
}

test().catch(console.error);
