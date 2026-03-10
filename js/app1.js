const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyt_KHFqhg-bQbcE3w-TEC7rlVYaTy5RmqiGdklVZJ-ZjQ1WOxnD1l2Kn0CF7dzHhs/exec';
const PUBLIC_API_URL = SHEET_URL + '?mode=public';
const ADMIN_URL = SHEET_URL + '?page=admin';

let allItems = [];
let refreshTimer = null;
let adminClickCount = 0;
let adminClickTimer = null;
let searchDebounceTimer = null;

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
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshList);
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', handleAdminTriggerClick);
  }
}

function handleSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  searchDebounceTimer = setTimeout(() => {
    refreshList();
  }, 250);
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshList, 5000);
}

function refreshList() {
  const searchInput = document.getElementById('searchInput');
  const keyword = searchInput ? searchInput.value.trim() : '';
  const callbackName = '__queueCallback_' + Date.now();

  window[callbackName] = function (data) {
    try {
      allItems = (data && data.items) ? data.items : [];
      renderStats();
      renderList(allItems);
      document.getElementById('updatedAt').textContent =
        (data && data.updatedAt) ? data.updatedAt : new Date().toLocaleString('ko-KR');
    } finally {
      delete window[callbackName];
    }
  };

  const script = document.createElement('script');
  script.src = `${PUBLIC_API_URL}&q=${encodeURIComponent(keyword)}&callback=${callbackName}&_=${Date.now()}`;

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

function renderList(items) {
  const body = document.getElementById('queueBody');
  const mobileList = document.getElementById('mobileList');

  if (!items.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted">검색 결과가 없습니다.</td></tr>';
    mobileList.innerHTML = '<div class="muted">검색 결과가 없습니다.</div>';
    return;
  }

  body.innerHTML = items.map(item => {
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

  mobileList.innerHTML = items.map(item => {
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
