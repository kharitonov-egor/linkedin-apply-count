console.log('[LinkedIn Apply Count] Extension loaded!');

// Performance Observer approach - catch network requests
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name.includes('voyager/api/jobs')) {
        setTimeout(() => {
          fetchJobData(entry.name);
        }, 100);
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
}

// Interval monitoring approach - check for new requests
let lastRequestCheck = Date.now();
setInterval(() => {
  const entries = performance.getEntriesByType('resource');
  entries.forEach(entry => {
    if (entry.startTime > lastRequestCheck && entry.name.includes('voyager/api/jobs')) {
      setTimeout(() => {
        fetchJobData(entry.name);
      }, 100);
    }
  });
  lastRequestCheck = Date.now();
}, 500);

// Get CSRF token from cookies
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'JSESSIONID') {
      return value.replace(/"/g, '');
    }
  }
  return 'ajax:1731828196761240138'; // fallback
}

// Fetch job data from API
async function fetchJobData(url) {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'accept': 'application/vnd.linkedin.normalized+json+2.1',
        'csrf-token': getCsrfToken(),
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      searchForApplies(data, url);
    }
  } catch (e) {
    console.log('❌ Error fetching job data:', e.message);
  }
}

// Search for all relevant job data in API response
function searchForApplies(data, sourceUrl) {
  let foundData = {};
  
  // Extract data from main data object
  if (data && data.data) {
    const p = data.data; // root object
    
    // Basic metrics
    if (typeof p.applies !== 'undefined') {
      foundData.applies = p.applies;
      console.log(`🎯 FOUND applies: ${p.applies}`);
    }
    if (typeof p.views !== 'undefined') {
      foundData.views = p.views;
      console.log(`👁️ FOUND views: ${p.views}`);
    }
    
    // Additional data
    
    if (p.listedAt) {
      foundData.listedAt = p.listedAt;
      foundData.daysLive = Math.floor((Date.now() - p.listedAt) / 86400000); // 24*60*60*1000
      console.log(`📅 FOUND listedAt: ${p.listedAt}, days live: ${foundData.daysLive}`);
    }
    
    if (p.expireAt) {
      foundData.expireAt = p.expireAt;
      foundData.daysUntilClose = Math.floor((p.expireAt - Date.now()) / 86400000);
      console.log(`⏰ FOUND expireAt: ${p.expireAt}, days until close: ${foundData.daysUntilClose}`);
    }
    
    // Remote work info
    if (p.workplaceTypes && p.workplaceTypes[0] && p.workplaceTypesResolutionResults) {
      const workplaceType = p.workplaceTypesResolutionResults[p.workplaceTypes[0]];
      if (workplaceType && workplaceType.localizedName) {
        foundData.remote = workplaceType.localizedName;
        console.log(`🏠 FOUND remote: ${workplaceType.localizedName}`);
      }
    }
    
    // Apply URL
    if (p.applyMethod && p.applyMethod.companyApplyUrl) {
      foundData.applyUrl = p.applyMethod.companyApplyUrl;
      console.log(`🔗 FOUND apply URL: ${p.applyMethod.companyApplyUrl}`);
    }
    
    // Calculate conversion rate
    if (foundData.applies !== undefined && foundData.views !== undefined && foundData.views > 0) {
      foundData.conversionRate = ((foundData.applies / foundData.views) * 100).toFixed(1);
      console.log(`📈 CALCULATED conversion rate: ${foundData.conversionRate}%`);
    }
  }
  
  // Fallback: search in nested objects if main data not found
  if (!foundData.applies && !foundData.views) {
    const searchObj = (obj, path = '') => {
      if (typeof obj === 'object' && obj !== null) {
        if (typeof obj.applies !== 'undefined') {
          foundData.applies = obj.applies;
          console.log(`🎯 FOUND applies at ${path}: ${obj.applies}`);
        }
        if (typeof obj.views !== 'undefined') {
          foundData.views = obj.views;
          console.log(`👁️ FOUND views at ${path}: ${obj.views}`);
        }
        
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            searchObj(item, `${path}[${index}]`);
          });
        } else {
          Object.keys(obj).forEach(key => {
            searchObj(obj[key], path ? `${path}.${key}` : key);
          });
        }
      }
    };
    
    searchObj(data);
    
    // Recalculate conversion rate if found in fallback
    if (foundData.applies !== undefined && foundData.views !== undefined && foundData.views > 0) {
      foundData.conversionRate = ((foundData.applies / foundData.views) * 100).toFixed(1);
    }
  }
  
  // Inject into UI if we found any data
  if (Object.keys(foundData).length > 0) {
    injectJobDataIntoUI(foundData);
  }
}

// Inject comprehensive job data into LinkedIn UI
function injectJobDataIntoUI(jobData) {
  // Remove existing element
  const existingElement = document.getElementById('linkedin-apply-count-inject');
  if (existingElement) {
    existingElement.remove();
  }
  
  // Primary target: job details container
  const targetContainer = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container');
  
  if (targetContainer) {
    const jobDataElement = document.createElement('div');
    jobDataElement.id = 'linkedin-apply-count-inject';
    jobDataElement.className = 't-black--light mt2';
    jobDataElement.style.cssText = `
      margin-top: 8px;
      padding: 8px 0;
      border-top: 1px solid rgba(0,0,0,0.1);
    `;
    
    // Add warning color CSS if not exists
    if (!document.getElementById('job-data-styles')) {
      const style = document.createElement('style');
      style.id = 'job-data-styles';
      style.textContent = `
        .tvm__text--warning {
          color: #e74c3c !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    const mainSpan = document.createElement('span');
    mainSpan.setAttribute('dir', 'ltr');
    
    let lines = [];
    
    // Basic metrics line
    if (jobData.applies !== undefined || jobData.views !== undefined) {
      let metricsLine = '';
      if (jobData.applies !== undefined) {
        metricsLine += `📊 <strong>${jobData.applies} applies</strong>`;
      }
      if (jobData.views !== undefined) {
        if (metricsLine) metricsLine += ' • ';
        metricsLine += `👁️ <strong>${jobData.views} views</strong>`;
      }
      if (jobData.conversionRate !== undefined) {
        if (metricsLine) metricsLine += ' • ';
        const rateColor = jobData.conversionRate > 20 ? 'tvm__text--positive' : 'tvm__text--low-emphasis';
        metricsLine += `📈 <span class="${rateColor}"><strong>${jobData.conversionRate}% conversion</strong></span>`;
      }
      lines.push(metricsLine);
    }
    
    // Timing information line
    if (jobData.daysLive !== undefined || jobData.daysUntilClose !== undefined) {
      let timingLine = '';
      if (jobData.daysLive !== undefined) {
        const liveColor = jobData.daysLive > 30 ? 'tvm__text--low-emphasis' : 'tvm__text--positive';
        timingLine += `📅 <span class="${liveColor}"><strong>${jobData.daysLive} days live</strong></span>`;
      }
      if (jobData.daysUntilClose !== undefined) {
        if (timingLine) timingLine += ' • ';
        const closeColor = jobData.daysUntilClose < 7 ? 'tvm__text--warning' : 'tvm__text--low-emphasis';
        if (jobData.daysUntilClose > 0) {
          timingLine += `⏰ <span class="${closeColor}"><strong>${jobData.daysUntilClose} days left</strong></span>`;
        } else {
          timingLine += `⏰ <span class="tvm__text--warning"><strong>Expired ${Math.abs(jobData.daysUntilClose)} days ago</strong></span>`;
        }
      }
      lines.push(timingLine);
    }
    
    // Additional info line
    if (jobData.remote) {
      const remoteIcon = jobData.remote.toLowerCase().includes('remote') ? '🏠' : '🏢';
      const infoLine = `${remoteIcon} <strong>${jobData.remote}</strong>`;
      lines.push(infoLine);
    }
    
    // Build final HTML
    const innerHTML = lines.map(line => 
      `<span class="tvm__text tvm__text--low-emphasis">${line}</span>`
    ).join('<br>');
    
    mainSpan.innerHTML = innerHTML;
    jobDataElement.appendChild(mainSpan);
    targetContainer.insertAdjacentElement('afterend', jobDataElement);
    
    console.log('✅ Successfully injected comprehensive job data!');
    return;
  }
  
  // Fallback: tertiary container
  const fallbackContainer = document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container');
  if (fallbackContainer) {
    const jobDataElement = document.createElement('div');
    jobDataElement.id = 'linkedin-apply-count-inject';
    jobDataElement.className = 't-black--light mt2';
    jobDataElement.style.cssText = `
      margin-top: 8px;
      margin-left: 24px;
      padding: 6px 0;
    `;
    
    // Compact version for fallback
    let compactInfo = '';
    if (jobData.applies !== undefined) {
      compactInfo += `📊 ${jobData.applies}`;
    }
    if (jobData.views !== undefined) {
      if (compactInfo) compactInfo += ' • ';
      compactInfo += `👁️ ${jobData.views}`;
    }
    if (jobData.conversionRate !== undefined) {
      if (compactInfo) compactInfo += ' • ';
      compactInfo += `📈 ${jobData.conversionRate}%`;
    }
    if (jobData.daysLive !== undefined) {
      if (compactInfo) compactInfo += ' • ';
      compactInfo += `📅 ${jobData.daysLive}d`;
    }
    
    jobDataElement.innerHTML = `<span class="tvm__text tvm__text--low-emphasis">${compactInfo}</span>`;
    fallbackContainer.insertAdjacentElement('afterend', jobDataElement);
    
    console.log('✅ Successfully injected compact job data!');
    return;
  }
  
  // Final fallback: floating element
  console.log('📍 No suitable container found, creating floating element');
  createFloatingJobData(jobData);
}

// Create floating notification as last resort
function createFloatingJobData(jobData) {
  const existingFloat = document.getElementById('linkedin-apply-count-float');
  if (existingFloat) {
    existingFloat.remove();
  }
  
  const floatingElement = document.createElement('div');
  floatingElement.id = 'linkedin-apply-count-float';
  floatingElement.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #0a66c2;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: slideIn 0.3s ease-out;
    line-height: 1.4;
    max-width: 300px;
  `;
  
  let lines = [];
  
  // Basic metrics
  if (jobData.applies !== undefined || jobData.views !== undefined) {
    let line = '';
    if (jobData.applies !== undefined) {
      line += `📊 ${jobData.applies} applies`;
    }
    if (jobData.views !== undefined) {
      if (line) line += ' • ';
      line += `👁️ ${jobData.views} views`;
    }
    if (jobData.conversionRate !== undefined) {
      if (line) line += ' • ';
      line += `📈 ${jobData.conversionRate}%`;
    }
    lines.push(line);
  }
  
  // Timing info
  if (jobData.daysLive !== undefined) {
    lines.push(`📅 ${jobData.daysLive} days live`);
  }
  if (jobData.daysUntilClose !== undefined) {
    if (jobData.daysUntilClose > 0) {
      lines.push(`⏰ ${jobData.daysUntilClose} days left`);
    } else {
      lines.push(`⏰ Expired ${Math.abs(jobData.daysUntilClose)} days ago`);
    }
  }
  
  // Additional info
  if (jobData.remote) {
    const icon = jobData.remote.toLowerCase().includes('remote') ? '🏠' : '🏢';
    lines.push(`${icon} ${jobData.remote}`);
  }
  
  floatingElement.innerHTML = lines.join('<br>');
  
  // Add CSS animation
  if (!document.getElementById('apply-count-styles')) {
    const style = document.createElement('style');
    style.id = 'apply-count-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .tvm__text--warning {
        color: #e74c3c !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(floatingElement);
  
  // Auto-remove after 8 seconds (more time for more data)
  setTimeout(() => {
    if (floatingElement.parentNode) {
      floatingElement.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => floatingElement.remove(), 300);
    }
  }, 8000);
  
  console.log('✅ Created comprehensive floating notification!');
}

// URL-based approach: extract job ID and fetch data
function checkCurrentJobFromURL() {
  const currentUrl = window.location.href;
  const jobIdMatch = currentUrl.match(/\/jobs\/view\/(\d+)/);
  
  if (jobIdMatch) {
    const jobId = jobIdMatch[1];
    const apiUrl = `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65&topN=1&topNRequestedFlavors=List(TOP_APPLICANT,IN_NETWORK,COMPANY_RECRUIT,SCHOOL_RECRUIT,HIDDEN_GEM,ACTIVELY_HIRING_COMPANY)`;
    
    setTimeout(() => {
      fetchJobData(apiUrl);
    }, 1500);
  }
}

// Monitor URL changes
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(checkCurrentJobFromURL, 1500);
  }
}, 1000);

// Check current URL on load
setTimeout(checkCurrentJobFromURL, 3000);

// DOM monitoring for re-injection
const domObserver = new MutationObserver((mutations) => {
  let hasNewJobElements = false;
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.classList && (
            node.classList.contains('job-details-jobs-unified-top-card__primary-description-container') ||
            node.classList.contains('job-details-jobs-unified-top-card__tertiary-description-container') ||
            (node.querySelector && (
              node.querySelector('.job-details-jobs-unified-top-card__primary-description-container') ||
              node.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container')
            ))
          )) {
            hasNewJobElements = true;
          }
        }
      });
    }
  });
  
  if (hasNewJobElements) {
    setTimeout(checkCurrentJobFromURL, 1000);
  }
});

domObserver.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

console.log('[LinkedIn Apply Count] All systems ready!');