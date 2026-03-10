const PUBLIC_API_URL = 'https://script.google.com/macros/s/AKfycbzH9kwXG8F-N7VMS7LYEIrvpBQd-ltr0mkEXN8e9uM5vHVHGm8ZxT-WT9tvgPDpyOc/exec?mode=public';
const ADMIN_URL = 'https://script.google.com/macros/s/AKfycbzH9kwXG8F-N7VMS7LYEIrvpBQd-ltr0mkEXN8e9uM5vHVHGm8ZxT-WT9tvgPDpyOc/exec?page=admin';

let allItems = [];
let refreshTimer = null;
let adminClickCount = 0;
let adminClickTimer = null;

window.addEventListener('load', () => {
  bindEvents();
  refreshList();
  startAutoRefresh();
});

function bindEvents() {
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const adminTrigger = document.getElementById('adminTrigger');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshList);
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', handleAdminTriggerClick);
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshList, 5000);
}

function refreshList() {
  const callbackName = '__queueCallback_' + Date.now();

  window[callbackName] = function (data) {
    try {
      allItems = (data && data.items) ? data.items : [];
      renderStats();
      applyFilter();
      document.getElementById('updatedAt').textContent =
        (data && data.updatedAt) ? data.updatedAt : new Date().toLocaleString('ko-KR');
    } finally {
      delete window[callbackName];
    }
  };

  const script = document.createElement('script');
  script.src = `${PUBLIC_API_URL}&callback=${callbackName}&_=${Date.now()}`;

  script.onerror = function () {
    document.getElementById('queueBody').innerHTML =
      '<tr><td colspan="4" class="muted">데이터를 불러오지 못했습니다.</td></tr>';
    document.getElementById('mobileList').innerHTML =
      '<div class="muted">데이터를 불러오지 못했습니다.</div>';
    delete window[callbackName];
  };

  document.body.appendChild(script);

  setTimeout(() => {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  }, 5000);
}

function renderStats() {
  const total = allItems.length;
  const waiting = allItems.filter(item => item.status === '대기중').length;
  const done = allItems.filter(item => item.status === '완료').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statWaiting').textContent = waiting;
  document.getElementById('statDone').textContent = done;
}

function applyFilter() {
  const keyword = document.getElementById('searchInput').value.trim();
  const body = document.getElementById('queueBody');
  const mobileList = document.getElementById('mobileList');

  const filtered = allItems.filter(item => {
    if (!keyword) return true;
    return String(item.queueNo).includes(keyword);
  });

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted">검색 결과가 없습니다.</td></tr>';
    mobileList.innerHTML = '<div class="muted">검색 결과가 없습니다.</div>';
    return;
  }

  body.innerHTML = filtered.map(item => {
    const statusClass = item.status === '완료' ? 'done' : 'waiting';
    return `
      <tr>
        <td class="big-number">${escapeHtml(item.queueNo)}</td>
        <td class="name-cell">${escapeHtml(item.nameMasked)}</td>
        <td class="phone-cell">${escapeHtml(item.phoneMasked)}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(item.status)}</span></td>
      </tr>
    `;
  }).join('');

  mobileList.innerHTML = filtered.map(item => {
    const statusClass = item.status === '완료' ? 'done' : 'waiting';
    return `
      <div class="mobile-item">
        <div class="mobile-top">
          <div class="mobile-number">${escapeHtml(item.queueNo)}</div>
          <span class="badge ${statusClass}">${escapeHtml(item.status)}</span>
        </div>
        <div class="mobile-grid">
          <div class="mobile-box">
            <span class="mobile-label">이름</span>
            <span class="mobile-value">${escapeHtml(item.nameMasked)}</span>
          </div>
          <div class="mobile-box">
            <span class="mobile-label">전화번호 뒤 4자리</span>
            <span class="mobile-value">${escapeHtml(item.phoneMasked)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function handleAdminTriggerClick() {
  adminClickCount++;

  if (adminClickTimer) clearTimeout(adminClickTimer);

  adminClickTimer = setTimeout(() => {
    adminClickCount = 0;
  }, 2000);

  if (adminClickCount >= 5) {
    adminClickCount = 0;
    window.location.href = ADMIN_URL;
  }
}
