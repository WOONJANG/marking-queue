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

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

onReady(function () {
  bindEvents();
  refreshList();
  startAutoRefresh();
});

function bindEvents() {
  var searchInput = document.getElementById('searchInput');
  var refreshBtn = document.getElementById('refreshBtn');
  var adminTrigger = document.getElementById('adminTrigger');

  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      refreshList();
    });
    refreshBtn.addEventListener('touchend', function (e) {
      if (e) {
        e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      refreshList();
    });
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      handleAdminTriggerClick();
    });
    adminTrigger.addEventListener('touchend', function (e) {
      if (e) {
        e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
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
  var searchInput = document.getElementById('searchInput');
  var keyword = searchInput ? trimSafe(searchInput.value) : '';
  var callbackName = '__queueCallback_' + new Date().getTime();
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');

  cleanupJsonp();

  window[callbackName] = function (data) {
    try {
      allItems = data && data.items ? data.items : [];
      renderStats();
      renderList(allItems);

      var updatedAt = document.getElementById('updatedAt');
      if (updatedAt) {
        updatedAt.textContent = data && data.updatedAt ? data.updatedAt : formatNow();
      }
    } catch (err) {
      showLoadError('데이터 표시 중 오류가 발생했습니다.');
    } finally {
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      cleanupJsonp();
    }
  };

  if (body) {
    body.innerHTML = '<tr><td colspan="4" class="muted">데이터를 불러오는 중...</td></tr>';
  }
  if (mobileList) {
    mobileList.innerHTML = '<div class="muted">데이터를 불러오는 중...</div>';
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = PUBLIC_API_URL
    + '&q=' + encodeURIComponent(keyword)
    + '&callback=' + encodeURIComponent(callbackName)
    + '&_=' + new Date().getTime();

  script.onerror = function () {
    try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
    showLoadError('데이터를 불러오지 못했습니다.');
    cleanupJsonp();
  };

  activeJsonpScript = script;
  (document.body || document.documentElement).appendChild(script);

  activeJsonpTimer = setTimeout(function () {
    if (typeof window[callbackName] === 'function') {
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      showLoadError('응답 시간이 초과되었습니다.');
    }
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

function showLoadError(message) {
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');
  var text = message || '데이터를 불러오지 못했습니다.';

  if (body) {
    body.innerHTML = '<tr><td colspan="4" class="muted">' + escapeHtml(text) + '</td></tr>';
  }
  if (mobileList) {
    mobileList.innerHTML = '<div class="muted">' + escapeHtml(text) + '</div>';
  }
}

function renderStats() {
  var total = allItems.length;
  var waiting = 0;
  var done = 0;
  var i;

  for (i = 0; i < allItems.length; i += 1) {
    if (allItems[i] && allItems[i].status === '완료') {
      done += 1;
    } else {
      waiting += 1;
    }
  }

  setText('statTotal', total);
  setText('statWaiting', waiting);
  setText('statDone', done);
}

function renderList(items) {
  var body = document.getElementById('queueBody');
  var mobileList = document.getElementById('mobileList');
  var i;
  var html = '';
  var mobileHtml = '';
  var item;
  var statusClass;

  if (!body || !mobileList) {
    return;
  }

  if (!items || !items.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted">검색 결과가 없습니다.</td></tr>';
    mobileList.innerHTML = '<div class="muted">검색 결과가 없습니다.</div>';
    return;
  }

  for (i = 0; i < items.length; i += 1) {
    item = items[i] || {};
    statusClass = item.status === '완료' ? 'done' : 'waiting';

    html += ''
      + '<tr>'
      + '<td class="big-number">' + escapeHtml(item.queueNo) + '</td>'
      + '<td class="name-cell">' + escapeHtml(item.nameMasked) + '</td>'
      + '<td class="phone-cell">' + escapeHtml(item.phoneMasked) + '</td>'
      + '<td><span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span></td>'
      + '</tr>';

    mobileHtml += ''
      + '<div class="mobile-item">'
      + '<div class="mobile-top">'
      + '<div class="mobile-number">' + escapeHtml(item.queueNo) + '</div>'
      + '<span class="badge ' + statusClass + '">' + escapeHtml(item.status) + '</span>'
      + '</div>'
      + '<div class="mobile-grid">'
      + '<div class="mobile-box">'
      + '<span class="mobile-label">이름</span>'
      + '<span class="mobile-value">' + escapeHtml(item.nameMasked) + '</span>'
      + '</div>'
      + '<div class="mobile-box">'
      + '<span class="mobile-label">전화번호 뒤 4자리</span>'
      + '<span class="mobile-value">' + escapeHtml(item.phoneMasked) + '</span>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  body.innerHTML = html;
  mobileList.innerHTML = mobileHtml;
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
    window.location.href = ADMIN_URL;
  }
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
  var d = new Date();
  var y = d.getFullYear();
  var m = pad2(d.getMonth() + 1);
  var day = pad2(d.getDate());
  var h = pad2(d.getHours());
  var min = pad2(d.getMinutes());
  var s = pad2(d.getSeconds());
  return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
}

function pad2(n) {
  n = Number(n) || 0;
  return n < 10 ? '0' + n : '' + n;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
