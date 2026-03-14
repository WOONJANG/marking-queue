const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyqW1CGARUyCUSgx0MOcPvBffgZVJwcU_q8DXnzrBA2eHZcbxlKS38QaSx1e1mglaY/exec';
const PUBLIC_API_URL = SHEET_URL + '?mode=public';
const ADMIN_URL = SHEET_URL + '?page=admin';

let allItems = [];
let refreshTimer = null;
let adminClickCount = 0;
let adminClickTimer = null;
let searchDebounceTimer = null;
let activeJsonpScript = null;
let activeJsonpTimer = null;

window.addEventListener('load', function () {
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
    refreshBtn.addEventListener('touchend', function (e) {
      e.preventDefault();
      refreshList();
    }, { passive: false });
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', handleAdminTriggerClick);
    adminTrigger.addEventListener('touchend', function (e) {
      e.preventDefault();
      handleAdminTriggerClick();
    }, { passive: false });
  }
}

function handleSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(function () {
    refreshList();
  }, 250);
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(refreshList, 5000);
}

function refreshList() {
  const searchInput = document.getElementById('searchInput');
  const keyword = searchInput ? searchInput.value.trim() : '';
  const callbackName = '__queueCallback_' + Date.now();

  cleanupJsonp();

  window[callbackName] = function (data) {
    try {
      allItems = (data && data.items) ? data.items : [];
      renderStats();
      renderList(allItems);

      const updatedAt = document.getElementById('updatedAt');
      if (updatedAt) {
        updatedAt.textContent = (data && data.updatedAt)
          ? data.updatedAt
          : new Date().toLocaleString('ko-KR');
      }
    } finally {
      delete window[callbackName];
      cleanupJsonp();
    }
  };

  const script = document.createElement('script');
  script.src = PUBLIC_API_URL
    + '&q=' + encodeURIComponent(keyword)
    + '&callback=' + encodeURIComponent(callbackName)
    + '&_=' + Date.now();
  script.async = true;

  script.onerror = function () {
    showLoadError();
    delete window[callbackName];
    cleanupJsonp();
  };

  activeJsonpScript = script;
  document.body.appendChild(script);

  activeJsonpTimer = setTimeout(function () {
    if (window[callbackName]) {
      showLoadError();
      delete window[callbackName];
    }
    cleanupJsonp();
  }, 5000);
}

function cleanupJsonp() {
  if (activeJsonpTimer) {
    clearTimeout(activeJsonpTimer);
    activeJsonpTimer = null;
  }

  if (activeJsonpScript && activeJsonpScript.parentNode) {
    activeJsonpScript.parentNode.removeChild(activeJsonpScript);
  }

  activeJsonpScript = null;
}

function showLoadError() {
  const body = document.getElementById('queueBody');
  const mobileList = document.getElementById('mobileList');

  if (body) {
    body.innerHTML = '<tr><td colspan="4" class="muted">데이터를 불러오지 못했습니다.</td></tr>';
  }

  if (mobileList) {
    mobileList.innerHTML = '<div class="muted">데이터를 불러오지 못했습니다.</div>';
  }
}

function renderStats() {
  const total = allItems.length;
  const waiting = allItems.filter(function (item) {
    return item.status === '대기중';
  }).length;
  const done = allItems.filter(function (item) {
    return item.status === '완료';
  }).length;

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

  body.innerHTML = items.map(function (item) {
    const statusClass = item.status === '완료' ? 'done' : 'waiting';
    return ''
      + '<tr>'
      + '  <td class="big-number">' + escapeHtml(item.queueNo) + '</td>'
      + '  <td class="name-cell">' + escapeHtml(item.nameMasked) + '</td>'
      + '  <td class="phone-cell">' + escapeHtml(item.phoneMasked) + '</td>'
      + '  <td><span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span></td>'
      + '</tr>';
  }).join('');

  mobileList.innerHTML = items.map(function (item) {
    const statusClass = item.status === '완료' ? 'done' : 'waiting';
    return ''
      + '<div class="mobile-item">'
      + '  <div class="mobile-top">'
      + '    <div class="mobile-number">' + escapeHtml(item.queueNo) + '</div>'
      + '    <span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span>'
      + '  </div>'
      + '  <div class="mobile-grid">'
      + '    <div class="mobile-box">'
      + '      <span class="mobile-label">이름</span>'
      + '      <span class="mobile-value">' + escapeHtml(item.nameMasked) + '</span>'
      + '    </div>'
      + '    <div class="mobile-box">'
      + '      <span class="mobile-label">전화번호 뒤 4자리</span>'
      + '      <span class="mobile-value">' + escapeHtml(item.phoneMasked) + '</span>'
      + '    </div>'
      + '  </div>'
      + '</div>';
  }).join('');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handleAdminTriggerClick() {
  adminClickCount += 1;

  if (adminClickTimer) {
    clearTimeout(adminClickTimer);
  }

  adminClickTimer = setTimeout(function () {
    adminClickCount = 0;
  }, 2000);

  if (adminClickCount >= 5) {
    adminClickCount = 0;
    window.location.assign(ADMIN_URL);
  }
}
