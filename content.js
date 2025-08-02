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

// Search for applies and views data in API response
function searchForApplies(data, sourceUrl) {
  let foundData = {};
  
  const searchObj = (obj, path = '') => {
    if (typeof obj === 'object' && obj !== null) {
      if (typeof obj.applies !== 'undefined') {
        foundData.applies = obj.applies;
        console.log(`🎯 FOUND applies: ${obj.applies}`);
      }
      if (typeof obj.views !== 'undefined') {
        foundData.views = obj.views;
        console.log(`👁️ FOUND views: ${obj.views}`);
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
  
  // Inject into UI if we found any data
  if (foundData.applies !== undefined || foundData.views !== undefined) {
    injectApplyCountIntoUI(foundData.applies, foundData.views);
  }
}

// Inject apply count and views into LinkedIn UI
function injectApplyCountIntoUI(appliesCount, viewsCount) {
  // Remove existing element
  const existingApplyCount = document.getElementById('linkedin-apply-count-inject');
  if (existingApplyCount) {
    existingApplyCount.remove();
  }
  
  // Primary target: job details container
  const targetContainer = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container');
  
  if (targetContainer) {
    const applyCountElement = document.createElement('div');
    applyCountElement.id = 'linkedin-apply-count-inject';
    applyCountElement.className = 't-black--light mt2';
    applyCountElement.style.cssText = `
      margin-top: 8px;
      padding: 6px 0;
    `;
    
    const mainSpan = document.createElement('span');
    mainSpan.setAttribute('dir', 'ltr');
    
    let innerHTML = '';
    
    if (appliesCount !== undefined) {
      innerHTML += `
        <span class="tvm__text tvm__text--low-emphasis">📊 </span>
        <span class="tvm__text tvm__text--positive">
          <strong>${appliesCount} clicked apply</strong>
        </span>
      `;
    }
    
    if (viewsCount !== undefined) {
      if (innerHTML) innerHTML += '<br>';
      innerHTML += `
        <span class="tvm__text tvm__text--low-emphasis">👁️ </span>
        <span class="tvm__text tvm__text--positive">
          <strong>${viewsCount} views</strong>
        </span>
      `;
    }
    
    mainSpan.innerHTML = innerHTML;
    applyCountElement.appendChild(mainSpan);
    targetContainer.insertAdjacentElement('afterend', applyCountElement);
    
    console.log('✅ Successfully injected data into job details!');
    return;
  }
  
  // Fallback: tertiary container
  const fallbackContainer = document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container');
  if (fallbackContainer) {
    const applyCountElement = document.createElement('div');
    applyCountElement.id = 'linkedin-apply-count-inject';
    applyCountElement.className = 't-black--light mt2';
    applyCountElement.style.cssText = `
      margin-top: 8px;
      margin-left: 24px;
      padding: 6px 0;
    `;
    
    const mainSpan = document.createElement('span');
    mainSpan.setAttribute('dir', 'ltr');
    
    let innerHTML = '';
    
    if (appliesCount !== undefined) {
      innerHTML += `
        <span class="tvm__text tvm__text--low-emphasis">📊 </span>
        <span class="tvm__text tvm__text--positive">
          <strong>${appliesCount} clicked apply</strong>
        </span>
      `;
    }
    
    if (viewsCount !== undefined) {
      if (innerHTML) innerHTML += '<br>';
      innerHTML += `
        <span class="tvm__text tvm__text--low-emphasis">👁️ </span>
        <span class="tvm__text tvm__text--positive">
          <strong>${viewsCount} views</strong>
        </span>
      `;
    }
    
    mainSpan.innerHTML = innerHTML;
    applyCountElement.appendChild(mainSpan);
    fallbackContainer.insertAdjacentElement('afterend', applyCountElement);
    
    console.log('✅ Successfully injected data into tertiary container!');
    return;
  }
  
  // Final fallback: floating element
  console.log('📍 No suitable container found, creating floating element');
  createFloatingApplyCount(appliesCount, viewsCount);
}

// Create floating notification as last resort
function createFloatingApplyCount(appliesCount, viewsCount) {
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
    font-size: 14px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: slideIn 0.3s ease-out;
    line-height: 1.5;
  `;
  
  let content = '';
  if (appliesCount !== undefined) {
    content += `📊 ${appliesCount} clicked apply`;
  }
  if (viewsCount !== undefined) {
    if (content) content += '<br>';
    content += `👁️ ${viewsCount} views`;
  }
  
  floatingElement.innerHTML = content;
  
  // Add CSS animation
  if (!document.getElementById('apply-count-styles')) {
    const style = document.createElement('style');
    style.id = 'apply-count-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(floatingElement);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (floatingElement.parentNode) {
      floatingElement.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => floatingElement.remove(), 300);
    }
  }, 5000);
  
  console.log('✅ Created floating notification!');
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