const LOCAL_API = 'http://localhost:5050/api/jobs';

document.getElementById('btn-detect').addEventListener('click', async () => {
  const statusMsg = document.getElementById('status-msg');
  statusMsg.textContent = 'Inspecting current page...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: extractJobFromPage,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const data = results[0].result;
          if (data.title) document.getElementById('ext-title').value = data.title;
          if (data.company) document.getElementById('ext-company').value = data.company;
          if (data.description) document.getElementById('ext-desc').value = data.description;
          statusMsg.textContent = 'Auto-detected successfully!';
          statusMsg.className = 'status text-success';
        } else {
          statusMsg.textContent = 'Could not auto-detect. Fill manually.';
          statusMsg.className = 'status';
        }
      }
    );
  } catch (err) {
    statusMsg.textContent = 'Error reading page.';
    statusMsg.className = 'status text-error';
  }
});

function extractJobFromPage() {
  const title =
    document.querySelector('.job-details-jobs-unified-top-card__job-title, h1, .jobsearch-JobInfoHeader-title')?.innerText || '';
  const company =
    document.querySelector('.job-details-jobs-unified-top-card__company-name, .company-name, [data-company-name]')?.innerText || '';
  const description =
    document.querySelector('#job-details, .jobsearch-jobDescriptionText, .description__text')?.innerText || '';

  return { title: title.trim(), company: company.trim(), description: description.trim() };
}

document.getElementById('btn-save').addEventListener('click', async () => {
  const statusMsg = document.getElementById('status-msg');
  const title = document.getElementById('ext-title').value.trim();
  const company = document.getElementById('ext-company').value.trim();
  const description = document.getElementById('ext-desc').value.trim();

  if (!description) {
    statusMsg.textContent = 'Job description is required.';
    statusMsg.className = 'status text-error';
    return;
  }

  statusMsg.textContent = 'Sending to local agent...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await fetch(LOCAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || 'Target Position',
        company: company || 'Company',
        description,
        url: tab?.url || '',
        autoAnalyze: true,
      }),
    });

    const data = await res.json();
    if (data.success) {
      statusMsg.textContent = 'Saved & Analyzed in Local Agent! 🚀';
      statusMsg.className = 'status text-success';
    } else {
      statusMsg.textContent = data.error || 'Failed to save.';
      statusMsg.className = 'status text-error';
    }
  } catch (err) {
    statusMsg.textContent = 'Agent server offline on :5050';
    statusMsg.className = 'status text-error';
  }
});
