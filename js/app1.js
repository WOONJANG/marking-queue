var SHEET_URL = 'https://script.google.com/macros/s/AKfycbyqW1CGARUyCUSgx0MOcPvBffgZVJwcU_q8DXnzrBA2eHZcbxlKS38QaSx1e1mglaY/exec';
var PUBLIC_API_URL = SHEET_URL + '?mode=public';
var ADMIN_URL = SHEET_URL + '?page=admin';

var allItems = [];
var refreshTimer = null;
var adminClickCount = 0;
var adminClickTimer = null;
var searchDebounceTimer = null;
var activeJsonpScript = null;
var activeJsonpTimer = null;
var hasLoadedOnce = false;

onReady(function () {
  bindEvents();
  refreshList({ silent: false });
  startAutoRefresh();
});

function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

function bindEvents() {
  var searchInput = document.getElementById('searchInput');
  var refreshBtn = document.getElementById('refreshBtn');
  var adminTrigger = document.getElementById('adminTrigger');

  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function (e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      refreshList({ silent: true });
    });
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', handleAdminTriggerClick);
    adminTrigger.addEventListener('touchend', function (e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      handleAdminTriggerClick();
    });
  }
}

function handleSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(function () {
    refreshList({ silent: true });
  }, 250);
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(function () {
    refreshList({ silent: true });
  }, 5000);
}

function refreshList(options) {
  options = options || {};

  var searchInput = document.getElementById('searchInput');
  var keyword = searchInput ? trimSafe(searchInput.value) : '';
  var callbackName = '__queueCallback_' + new Date().getTime();
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');
  var updatedAt = document.getElementById('updatedAt');

  cleanupJsonp();

  if (!options.silent && !hasLoadedOnce) {
    if (body) {
      body.innerHTML = '<tr><td colspan="4" class="muted">데이터를 불러오는 중...</td></tr>';
    }
    if (mobileList) {
      mobileList.innerHTML = '<div class="muted">데이터를 불러오는 중...</div>';
    }
  }

  window[callbackName] = function (data) {
    try {
      allItems = data && data.items ? data.items : [];
      renderStats();
      renderList(allItems);

      if (updatedAt) {
        updatedAt.textContent = data && data.updatedAt ? data.updatedAt : formatNow();
      }

      hasLoadedOnce = true;
    } catch (err) {
      showLoadError('데이터 표시 중 오류가 발생했습니다.');
    } finally {
      safeDeleteCallback(callbackName);
      cleanupJsonp();
    }
  };

  activeJsonpScript = document.createElement('script');
  activeJsonpScript.async = true;
  activeJsonpScript.src = PUBLIC_API_URL
    + '&q=' + encodeURIComponent(keyword)
    + '&callback=' + encodeURIComponent(callbackName)
    + '&_=' + new Date().getTime();

  activeJsonpScript.onerror = function () {
    safeDeleteCallback(callbackName);
    showLoadError('데이터를 불러오지 못했습니다.');
    cleanupJsonp();
  };

  (document.body || document.documentElement).appendChild(activeJsonpScript);

  activeJsonpTimer = setTimeout(function () {
    safeDeleteCallback(callbackName);
    showLoadError('응답 시간이 초과되었습니다.');
    cleanupJsonp();
  }, 7000);
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

function safeDeleteCallback(callbackName) {
  try {
    delete window[callbackName];
  } catch (e) {
    window[callbackName] = void 0;
  }
}

function renderStats() {
  var total = allItems.length;
  var waiting = 0;
  var done = 0;
  var i;
  var status;

  for (i = 0; i < allItems.length; i++) {
    status = allItems[i] && allItems[i].status;
    if (status === '대기중') {
      waiting++;
    } else if (status === '완료') {
      done++;
    }
  }

  setText('statTotal', String(total));
  setText('statWaiting', String(waiting));
  setText('statDone', String(done));
}

function renderList(items) {
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');
  var i;
  var item;
  var statusClass;
  var rows = [];
  var cards = [];

  if (!items || !items.length) {
    if (body) {
      body.innerHTML = '<tr><td colspan="4" class="muted">검색 결과가 없습니다.</td></tr>';
    }
    if (mobileList) {
      mobileList.innerHTML = '<div class="muted">검색 결과가 없습니다.</div>';
    }
    return;
  }

  for (i = 0; i < items.length; i++) {
    item = items[i] || {};
    statusClass = item.status === '완료' ? 'done' : 'waiting';

    rows.push(
      '<tr>' +
        '<td class="big-number">' + escapeHtml(item.queueNo) + '</td>' +
        '<td class="name-cell">' + escapeHtml(item.nameMasked) + '</td>' +
        '<td class="phone-cell">' + escapeHtml(item.phoneMasked) + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span></td>' +
      '</tr>'
    );

    cards.push(
      '<div class="mobile-item">' +
        '<div class="mobile-top">' +
          '<div class="mobile-number">' + escapeHtml(item.queueNo) + '</div>' +
          '<span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span>' +
        '</div>' +
        '<div class="mobile-grid">' +
          '<div class="mobile-box">' +
            '<span class="mobile-label">이름</span>' +
            '<span class="mobile-value">' + escapeHtml(item.nameMasked) + '</span>' +
          '</div>' +
          '<div class="mobile-box">' +
            '<span class="mobile-label">전화번호 뒤 4자리</span>' +
            '<span class="mobile-value">' + escapeHtml(item.phoneMasked) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  if (body) {
    body.innerHTML = rows.join('');
  }
  if (mobileList) {
    mobileList.innerHTML = cards.join('');
  }
}

function showLoadError(message) {
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');

  if (body) {
    body.innerHTML = '<tr><td colspan="4" class="muted">' + escapeHtml(message) + '</td></tr>';
  }
  if (mobileList) {
    mobileList.innerHTML = '<div class="muted">' + escapeHtml(message) + '</div>';
  }
}

function handleAdminTriggerClick() {
  adminClickCount++;

  if (adminClickTimer) {
    clearTimeout(adminClickTimer);
  }

  adminClickTimer = setTimeout(function () {
    adminClickCount = 0;
  }, 2000);

  if (adminClickCount >= 5) {
    adminClickCount = 0;
    window.location.href = ADMIN_URL;
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trimSafe(value) {
  return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function formatNow() {
  try {
    return new Date().toLocaleString('ko-KR');
  } catch (e) {
    return new Date().toString();
  }
}
