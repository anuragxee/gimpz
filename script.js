/* ============================================================
   GIMPZ — MAIN SCRIPT (everything: coupons, reviews, wishlist,
   recently viewed, abandoned cart, PWA, newsletter)
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';
  var CART_KEY = 'gimpz_cart';
  var WISHLIST_KEY = 'gimpz_wishlist';
  var RECENT_KEY = 'gimpz_recent';
  var COUPON_KEY = 'gimpz_coupon';
  var MAX_RECENT = 8;
  var MAX_IMAGES_PER_PRODUCT = 10;

  var CACHE_KEY = 'gimpz_products_cache_v1';
  var CACHE_TTL = 5 * 60 * 1000;

  var PRODUCTS = [];
  var SAVED_ADDRESSES = [];
  var ACTIVE_COUPON = null;

  /* ============ ANALYTICS ============ */
  function track(eventName, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', eventName, params || {}); } catch (e) {}
  }
  function trackViewItemList(listName, products) {
    if (!products || !products.length) return;
    track('view_item_list', {
      item_list_name: listName,
      items: products.slice(0, 10).map(function (p, i) {
        return { item_id: String(p.id), item_name: p.name, item_brand: p.brand || '', item_category: p.category || '', price: Number(p.price) || 0, index: i };
      })
    });
  }

  /* ============ HELPERS ============ */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtPrice(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function mapRow(row) {
    return {
      id: row.id, name: row.name, brand: row.brand, category: row.category,
      price: row.price, mrp: row.mrp,
      rating: typeof row.rating === 'number' ? row.rating : parseFloat(row.rating || 4.5),
      stock: row.stock || 0, description: row.description || '',
      folder: row.image_folder ? ('assets/products/' + row.image_folder) : '',
      image_folder: row.image_folder || ''
    };
  }

  /* ============ CACHE ============ */
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ts || !Array.isArray(obj.products)) return null;
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.products;
    } catch (e) { return null; }
  }
  function writeCache(products) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products: products })); } catch (e) {}
  }

  /* ============ FETCH ============ */
  function fetchProducts() {
    var url = SUPABASE_URL + '/rest/v1/products?select=id,name,brand,category,price,mrp,rating,stock,description,image_folder&active=eq.true&order=id.asc';
    return fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Accept': 'application/json' }
    })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        PRODUCTS = rows.map(mapRow);
        writeCache(PRODUCTS);
        console.log('[GIMPZ] Loaded ' + PRODUCTS.length + ' products');
        return PRODUCTS;
      })
      .catch(function (err) { console.error('[GIMPZ] Fetch failed:', err); return []; });
  }
  function fetchSingleProduct(id) {
    var url = SUPABASE_URL + '/rest/v1/products?select=*&active=eq.true&id=eq.' + encodeURIComponent(id) + '&limit=1';
    return fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Accept': 'application/json' }
    })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) { if (!Array.isArray(rows) || !rows.length) return null; return mapRow(rows[0]); });
  }

  /* ============ WISHLIST ============ */
  function getWishlist() {
    try { var raw = localStorage.getItem(WISHLIST_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveWishlist(list) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch (e) {}
    updateWishlistBadge();
  }
  function isWishlisted(id) {
    var list = getWishlist();
    for (var i = 0; i < list.length; i++) if (list[i] === id) return true;
    return false;
  }
  function toggleWishlist(id) {
    var list = getWishlist();
    var idx = list.indexOf(id);
    var added = false;
    if (idx === -1) { list.push(id); added = true; }
    else { list.splice(idx, 1); }
    saveWishlist(list);
    document.querySelectorAll('[data-wishlist-id="' + id + '"]').forEach(function (btn) {
      btn.classList.toggle('active', added);
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
    });
    if (added) {
      showToast('❤️ Added to wishlist');
      track('add_to_wishlist', { currency: 'INR', value: 0, items: [{ item_id: String(id) }] });
    } else {
      showToast('Removed from wishlist');
      track('remove_from_wishlist', { items: [{ item_id: String(id) }] });
    }
  }
  function updateWishlistBadge() {
    var count = getWishlist().length;
    document.querySelectorAll('.wishlist-badge').forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? 'grid' : 'none';
    });
  }

  /* ============ RECENTLY VIEWED ============ */
  function getRecent() {
    try { var raw = localStorage.getItem(RECENT_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function addToRecent(id) {
    var list = getRecent().filter(function (x) { return x !== id; });
    list.unshift(id);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function renderRecentlyViewed() {
    var section = $('recentlyViewedSection');
    var grid = $('recentlyViewedGrid');
    if (!section || !grid) return;
    var recentIds = getRecent();
    if (!recentIds.length) { section.style.display = 'none'; return; }
    var currentId = null;
    if ($('productDetail')) {
      try { currentId = parseInt(new URLSearchParams(location.search).get('id'), 10); } catch (e) {}
    }
    var items = recentIds
      .filter(function (id) { return id !== currentId; })
      .map(function (id) { return getProduct(id); })
      .filter(Boolean)
      .slice(0, 6);
    if (!items.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    renderGrid(grid, items);
    trackViewItemList('Recently Viewed', items);
  }

  /* ============ COUPON ============ */
  function getSavedCoupon() {
    try { var raw = localStorage.getItem(COUPON_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function saveCoupon(c) {
    try {
      if (c) localStorage.setItem(COUPON_KEY, JSON.stringify(c));
      else localStorage.removeItem(COUPON_KEY);
    } catch (e) {}
  }
  function calculateDiscount(coupon, subtotal) {
    if (!coupon) return 0;
    if (subtotal < (coupon.min_order || 0)) return 0;
    if (coupon.discount_type === 'flat') return Math.min(coupon.discount_value, subtotal);
    return Math.round(subtotal * coupon.discount_value / 100);
  }
  function validateCoupon(code, subtotal) {
    var cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return Promise.reject(new Error('Enter a coupon code'));
    var url = SUPABASE_URL + '/rest/v1/coupons?code=eq.' + encodeURIComponent(cleanCode) + '&active=eq.true&limit=1';
    return fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) throw new Error('Invalid coupon code');
        var c = rows[0];
        if (c.expires_at && new Date(c.expires_at) < new Date()) throw new Error('This coupon has expired');
        if (c.max_uses && c.times_used >= c.max_uses) throw new Error('This coupon has reached its limit');
        if (subtotal < (c.min_order || 0)) {
          throw new Error('Minimum order ' + fmtPrice(c.min_order) + ' required for this coupon');
        }
        return c;
      });
  }
  function applyCoupon() {
    var input = $('couponInput');
    var status = $('couponStatus');
    var btn = $('couponApplyBtn');
    if (!input || !status) return;
    var code = input.value.trim();
    if (!code) { status.textContent = 'Enter a coupon code'; status.className = 'coupon-status err'; return; }
    btn.disabled = true;
    btn.textContent = '...';
    status.textContent = '';
    var subtotal = cartTotal();
    validateCoupon(code, subtotal)
      .then(function (c) {
        ACTIVE_COUPON = c;
        saveCoupon(c);
        status.textContent = '✓ Coupon applied';
        status.className = 'coupon-status ok';
        renderCouponUI();
        updateSummary();
        track('coupon_applied', { code: c.code, discount: calculateDiscount(c, subtotal) });
      })
      .catch(function (err) {
        ACTIVE_COUPON = null;
        saveCoupon(null);
        status.textContent = err.message || 'Could not apply coupon';
        status.className = 'coupon-status err';
        renderCouponUI();
        updateSummary();
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Apply';
      });
  }
  function removeCoupon() {
    ACTIVE_COUPON = null;
    saveCoupon(null);
    var s = $('couponStatus');
    if (s) { s.textContent = ''; s.className = 'coupon-status'; }
    var inp = $('couponInput');
    if (inp) inp.value = '';
    renderCouponUI();
    updateSummary();
  }
  function renderCouponUI() {
    var appliedEl = $('couponApplied');
    var codeEl = $('couponAppliedCode');
    var inputRow = document.querySelector('.coupon-row');
    var input = $('couponInput');
    if (!appliedEl) return;
    if (ACTIVE_COUPON) {
      appliedEl.style.display = 'flex';
      if (codeEl) codeEl.textContent = ACTIVE_COUPON.code;
      if (inputRow) inputRow.style.display = 'none';
      if (input) input.value = '';
    } else {
      appliedEl.style.display = 'none';
      if (inputRow) inputRow.style.display = 'flex';
    }
  }
  function initCouponOnCart() {
    if (!$('couponInput')) return;
    ACTIVE_COUPON = getSavedCoupon();
    renderCouponUI();
    var btn = $('couponApplyBtn');
    var inp = $('couponInput');
    var rm = $('couponRemoveBtn');
    if (btn) btn.addEventListener('click', applyCoupon);
    if (inp) inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
    });
    if (rm) rm.addEventListener('click', removeCoupon);
    if (ACTIVE_COUPON) {
      var subtotal = cartTotal();
      if (subtotal < (ACTIVE_COUPON.min_order || 0)) {
        removeCoupon();
      }
    }
  }

  /* ============ REVIEWS ============ */
  function loadReviews(productId) {
    var section = $('reviewsSection');
    var list = $('reviewsList');
    var summary = $('reviewsSummary');
    if (!section || !list) return;
    section.style.display = 'block';
    fetch(SUPABASE_URL + '/rest/v1/reviews?product_id=eq.' + productId + '&status=eq.Published&order=created_at.desc', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        if (summary) {
          if (rows.length) {
            var total = 0;
            rows.forEach(function (r) { total += Number(r.rating) || 0; });
            var avg = total / rows.length;
            summary.innerHTML =
              '<div class="review-avg-block">' +
                '<span class="review-avg-num">' + avg.toFixed(1) + '</span>' +
                '<div class="review-avg-stars">' + starHtml(Math.round(avg)) + '</div>' +
                '<span class="review-avg-count">' + rows.length + ' review' + (rows.length === 1 ? '' : 's') + '</span>' +
              '</div>';
          } else {
            summary.innerHTML = '<span class="review-avg-count" style="color:#94a3b8;">No reviews yet — be the first!</span>';
          }
        }
        if (!rows.length) {
          list.innerHTML = '<div class="reviews-empty">No reviews yet. Be the first to review this product!</div>';
          return;
        }
        var html = '';
        rows.forEach(function (r) {
          var initial = (r.user_name || '?').charAt(0).toUpperCase();
          html += '<div class="review-card">' +
            '<div class="review-head">' +
              '<div class="review-avatar">' + initial + '</div>' +
              '<div class="review-meta">' +
                '<strong>' + esc(r.user_name) + '</strong>' +
                '<div class="review-stars">' + starHtml(r.rating) + '</div>' +
              '</div>' +
              '<div class="review-date">' + formatDateShort(r.created_at) + '</div>' +
            '</div>' +
            (r.title ? '<div class="review-title">' + esc(r.title) + '</div>' : '') +
            '<div class="review-body">' + esc(r.comment || '').replace(/\n/g, '<br>') + '</div>' +
          '</div>';
        });
        list.innerHTML = html;
      })
      .catch(function () {
        list.innerHTML = '<div class="reviews-empty">Could not load reviews.</div>';
      });
  }
  function starHtml(n) {
    var full = Math.max(0, Math.min(5, Math.round(n || 0)));
    var out = '';
    for (var i = 0; i < 5; i++) out += '<span class="star ' + (i < full ? 'full' : '') + '">★</span>';
    return out;
  }
  function formatDateShort(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function setupReviewForm(productId, productName) {
    var form = $('reviewForm');
    var signedOut = $('reviewSignedOut');
    var signInBtn = $('reviewSignInBtn');
    var starPicker = $('starPicker');
    var ratingInput = $('reviewRating');
    var status = $('reviewStatus');
    if (!form || !starPicker) return;
    var user = getUser();
    if (!user || !user.uid) {
      form.style.display = 'none';
      if (signedOut) signedOut.style.display = 'block';
      if (signInBtn) signInBtn.href = 'login.html?redirect=' + encodeURIComponent('product.html?id=' + productId);
      return;
    }
    if (signedOut) signedOut.style.display = 'none';
    form.style.display = 'block';

    starPicker.querySelectorAll('.star-btn').forEach(function (btn, i) {
      btn.addEventListener('mouseenter', function () {
        starPicker.querySelectorAll('.star-btn').forEach(function (b, j) { b.classList.toggle('hover', j <= i); });
      });
      btn.addEventListener('mouseleave', function () {
        starPicker.querySelectorAll('.star-btn').forEach(function (b) { b.classList.remove('hover'); });
      });
      btn.addEventListener('click', function () {
        var v = parseInt(btn.getAttribute('data-star'), 10);
        ratingInput.value = v;
        starPicker.querySelectorAll('.star-btn').forEach(function (b, j) { b.classList.toggle('filled', j < v); });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var rating = parseInt(ratingInput.value, 10) || 0;
      var title = $('reviewTitle').value.trim();
      var comment = $('reviewComment').value.trim();
      if (rating < 1) { status.textContent = 'Please select a rating'; status.className = 'form-status err'; return; }
      if (comment.length < 5) { status.textContent = 'Review must be at least 5 characters'; status.className = 'form-status err'; return; }
      var btn = $('reviewSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      status.textContent = '';
      fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.uid) + '&select=full_name,email', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
      })
        .then(function (r) { return r.json(); })
        .then(function (rows) {
          var name = (rows[0] && rows[0].full_name) || (user.email || 'Anonymous');
          return fetch(SUPABASE_URL + '/rest/v1/reviews', {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              product_id: productId, user_id: user.uid, user_name: name,
              rating: rating, title: title || null, comment: comment, status: 'Published'
            })
          });
        })
        .then(function (r) {
          if (!r.ok) return r.text().then(function () { throw new Error('Submit failed'); });
          status.textContent = '✓ Review published! Thank you.';
          status.className = 'form-status ok';
          form.reset();
          ratingInput.value = 0;
          starPicker.querySelectorAll('.star-btn').forEach(function (b) { b.classList.remove('filled'); });
          loadReviews(productId);
          track('review_submitted', { product_id: productId, rating: rating });
        })
        .catch(function (err) {
          status.textContent = err.message || 'Could not submit. Try again.';
          status.className = 'form-status err';
        })
        .finally(function () { btn.disabled = false; btn.textContent = 'Submit Review'; });
    });
  }

  /* ============ SEARCH AUTOCOMPLETE ============ */
  var searchState = { input: null, dropdown: null, results: [], activeIndex: -1 };
  function initSearchAutocomplete() {
    var form = document.querySelector('.header-search');
    var input = $('searchInput');
    if (!form || !input) return;
    searchState.input = input;
    var dropdown = document.createElement('div');
    dropdown.className = 'search-suggestions';
    dropdown.style.display = 'none';
    form.appendChild(dropdown);
    searchState.dropdown = dropdown;
    form.style.position = 'relative';
    var debounceTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { handleSearchInput(input.value.trim()); }, 120);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 1) handleSearchInput(input.value.trim());
    });
    input.addEventListener('keydown', handleSearchKeydown);
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) closeSearchDropdown(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSearchDropdown(); input.blur(); } });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (searchState.activeIndex >= 0 && searchState.results[searchState.activeIndex]) {
        window.location.href = 'product.html?id=' + searchState.results[searchState.activeIndex].id;
        return;
      }
      closeSearchDropdown();
      if (typeof applyFilters === 'function') applyFilters();
      var grid = $('productGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function handleSearchInput(q) {
    if (!q || q.length < 1) { closeSearchDropdown(); return; }
    var query = q.toLowerCase();
    var results = PRODUCTS.filter(function (p) {
      return (p.name && p.name.toLowerCase().indexOf(query) !== -1) ||
             (p.brand && p.brand.toLowerCase().indexOf(query) !== -1) ||
             (p.category && p.category.toLowerCase().indexOf(query) !== -1);
    }).slice(0, 6);
    results.sort(function (a, b) {
      var aStarts = (a.name || '').toLowerCase().indexOf(query) === 0;
      var bStarts = (b.name || '').toLowerCase().indexOf(query) === 0;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
    searchState.results = results;
    searchState.activeIndex = -1;
    if (!results.length) renderSearchEmpty(q);
    else renderSearchResults(results, query);
  }
  function renderSearchResults(results, query) {
    var dd = searchState.dropdown;
    if (!dd) return;
    var html = '';
    results.forEach(function (p, i) {
      var cover = getCoverImage(p);
      var nameHtml = highlightMatch(p.name, query);
      var brandHtml = p.brand ? highlightMatch(p.brand, query) : '';
      html += '<a class="search-item" href="product.html?id=' + p.id + '" data-index="' + i + '">' +
        '<div class="search-item-thumb"><img src="' + cover + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'assets/products/placeholder.svg\'"></div>' +
        '<div class="search-item-info">' +
          '<div class="search-item-name">' + nameHtml + '</div>' +
          (brandHtml ? '<div class="search-item-brand">' + brandHtml + '</div>' : '') +
        '</div>' +
        '<div class="search-item-price">' + fmtPrice(p.price) + '</div>' +
      '</a>';
    });
    html += '<div class="search-footer">Press <kbd>Enter</kbd> for all results for "<b>' + esc(query) + '</b>"</div>';
    dd.innerHTML = html;
    dd.style.display = 'block';
    dd.querySelectorAll('.search-item').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        searchState.activeIndex = parseInt(el.getAttribute('data-index'), 10);
        updateActiveSearchItem();
      });
    });
  }
  function renderSearchEmpty(q) {
    var dd = searchState.dropdown;
    if (!dd) return;
    dd.innerHTML = '<div class="search-empty"><div class="search-empty-icon">🔍</div><div>No products found for "<b>' + esc(q) + '</b>"</div></div>';
    dd.style.display = 'block';
  }
  function highlightMatch(text, query) {
    var safe = esc(text || '');
    if (!query) return safe;
    var safeQuery = esc(query);
    var idx = safe.toLowerCase().indexOf(safeQuery.toLowerCase());
    if (idx === -1) return safe;
    return safe.substring(0, idx) + '<mark>' + safe.substring(idx, idx + safeQuery.length) + '</mark>' + safe.substring(idx + safeQuery.length);
  }
  function handleSearchKeydown(e) {
    var dd = searchState.dropdown;
    if (!dd || dd.style.display === 'none') return;
    var items = dd.querySelectorAll('.search-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); searchState.activeIndex = (searchState.activeIndex + 1) % items.length; updateActiveSearchItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); searchState.activeIndex = (searchState.activeIndex - 1 + items.length) % items.length; updateActiveSearchItem(); }
    else if (e.key === 'Enter' && searchState.activeIndex >= 0) { e.preventDefault(); items[searchState.activeIndex].click(); }
  }
  function updateActiveSearchItem() {
    var dd = searchState.dropdown;
    if (!dd) return;
    dd.querySelectorAll('.search-item').forEach(function (el, i) { el.classList.toggle('active', i === searchState.activeIndex); });
    var active = dd.querySelector('.search-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
  function closeSearchDropdown() {
    if (searchState.dropdown) {
      searchState.dropdown.style.display = 'none';
      searchState.dropdown.innerHTML = '';
    }
    searchState.activeIndex = -1;
    searchState.results = [];
  }

  /* ============ ADDRESSES ============ */
  function getUser() {
    try { var raw = localStorage.getItem('gimpz_user'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function loadAddresses(uid) {
    if (!uid) return Promise.resolve([]);
    return fetch(SUPABASE_URL + '/rest/v1/addresses?user_id=eq.' + encodeURIComponent(uid) + '&order=created_at.desc', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        SAVED_ADDRESSES = rows;
        renderSavedAddresses();
        return rows;
      })
      .catch(function () { return []; });
  }
  function renderSavedAddresses() {
    var section = $('savedAddressesSection');
    var list = $('savedAddressesList');
    var heading = $('addressFormHeading');
    if (!section || !list) return;
    if (!SAVED_ADDRESSES.length) {
      section.style.display = 'none';
      if (heading) heading.style.display = 'block';
      return;
    }
    section.style.display = 'block';
    if (heading) heading.style.display = 'block';
    var html = '';
    SAVED_ADDRESSES.forEach(function (a) {
      html += '<button type="button" class="saved-address-card" data-address-id="' + a.id + '">' +
        '<div class="saved-address-label">🏠 ' + esc(a.label || 'Address') + '</div>' +
        '<div class="saved-address-body"><strong>' + esc(a.full_name) + '</strong><span> · ' + esc(a.phone) + '</span><br>' +
        esc(a.address) + ', ' + esc(a.city) + ', ' + esc(a.state) + ' — ' + esc(a.pincode) + '</div>' +
      '</button>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-address-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-address-id'), 10);
        var a = SAVED_ADDRESSES.find(function (x) { return x.id === id; });
        if (!a) return;
        fillAddressForm(a);
        list.querySelectorAll('.saved-address-card').forEach(function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
    if (SAVED_ADDRESSES.length) {
      fillAddressForm(SAVED_ADDRESSES[0]);
      var first = list.querySelector('.saved-address-card');
      if (first) first.classList.add('active');
    }
  }
  function fillAddressForm(a) {
    var set = function (id, v) { var el = $(id); if (el) el.value = v || ''; };
    set('cname', a.full_name); set('cphone', a.phone); set('caddress', a.address);
    set('ccity', a.city); set('cstate', a.state); set('cpincode', a.pincode);
    var label = $('addressLabel'); if (label) label.value = '';
  }
  function saveAddressToDb(user, name, phone, address, city, state, pincode, label) {
    if (!user || !user.uid) return Promise.resolve();
    return fetch(SUPABASE_URL + '/rest/v1/addresses', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: user.uid, label: (label || 'Home').trim().slice(0, 20) || 'Home',
        full_name: name, phone: phone, address: address, city: city, state: state, pincode: pincode
      })
    }).catch(function (e) { console.warn('Address save failed:', e); });
  }
  window.gimpzLoadAddresses = function (uid) { loadAddresses(uid); };

  /* ============ ABANDONED CART ============ */
  function saveAbandonedCartSnapshot(cart) {
    var user = getUser();
    if (!user || !user.uid) return;
    if (!cart || !cart.length) return;

    var items = cart.map(function (it) {
      return { id: it.id, name: it.name, price: Number(it.price) || 0, qty: it.qty, image_folder: it.image_folder || '' };
    });
    var subtotal = 0;
    cart.forEach(function (it) { subtotal += (Number(it.price) || 0) * it.qty; });

    fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.uid) + '&select=full_name', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var fullName = (rows[0] && rows[0].full_name) || 'there';
        return fetch(SUPABASE_URL + '/rest/v1/abandoned_carts?on_conflict=user_id', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            user_id: user.uid,
            email: user.email,
            name: fullName,
            items: items,
            subtotal: subtotal,
            updated_at: new Date().toISOString(),
            email_sent: false,
            email_sent_at: null,
            recovered: false
          })
        });
      })
      .catch(function (e) { console.warn('[GIMPZ] Abandoned cart save failed:', e); });
  }

  /* ============ CART ============ */
  function getCart() {
    try { var raw = localStorage.getItem(CART_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    updateCartBadge();
    saveAbandonedCartSnapshot(cart);
  }
  function addToCart(productOrId, qty) {
    qty = qty || 1;
    var product = (typeof productOrId === 'object' && productOrId) ? productOrId : getProduct(productOrId);
    if (!product) return;
    var cart = getCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].id === product.id) { existing = cart[i]; break; }
    if (existing) {
      existing.qty += qty;
      existing.name = product.name; existing.brand = product.brand;
      existing.price = product.price; existing.mrp = product.mrp;
      existing.image_folder = product.image_folder;
    } else {
      cart.push({
        id: product.id, name: product.name, brand: product.brand,
        price: product.price, mrp: product.mrp,
        image_folder: product.image_folder || '', qty: qty
      });
    }
    saveCart(cart);
    track('add_to_cart', {
      currency: 'INR', value: (Number(product.price) || 0) * qty,
      items: [{ item_id: String(product.id), item_name: product.name, item_brand: product.brand || '', item_category: product.category || '', price: Number(product.price) || 0, quantity: qty }]
    });
  }
  function removeFromCart(productId) {
    saveCart(getCart().filter(function (item) { return item.id !== productId; }));
    track('remove_from_cart', { currency: 'INR', items: [{ item_id: String(productId) }] });
  }
  function clearCart() { saveCart([]); }
  function getProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function cartItemCount() {
    var cart = getCart(); var n = 0;
    for (var i = 0; i < cart.length; i++) n += cart[i].qty;
    return n;
  }
  function cartTotal() {
    var cart = getCart(); var total = 0;
    for (var i = 0; i < cart.length; i++) total += (Number(cart[i].price) || 0) * cart[i].qty;
    return total;
  }
  function updateCartBadge() {
    var count = cartItemCount();
    document.querySelectorAll('.cart-badge').forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? 'grid' : 'none';
    });
  }

  /* ============ IMAGES ============ */
  function getCoverImage(p) {
    var folder = p && (p.folder || (p.image_folder ? ('assets/products/' + p.image_folder) : ''));
    return folder ? (folder + '/1.jpg') : 'assets/products/placeholder.svg';
  }
  function attachImageFallbacks(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.fb) return;
      img.dataset.fb = '1';
      img.addEventListener('error', function () {
        var src = img.getAttribute('src') || '';
        if (src.indexOf('placeholder.svg') !== -1) return;
        if (src.indexOf('.jpg') !== -1) { img.setAttribute('src', src.replace('.jpg', '.png')); return; }
        if (src.indexOf('.png') !== -1) { img.setAttribute('src', src.replace('.png', '.webp')); return; }
        img.setAttribute('src', 'assets/products/placeholder.svg');
      });
    });
  }
  function detectProductImages(product, onImage, onComplete) {
    var folder = product && product.folder;
    var found = [];
    if (!folder) { onComplete(found); return; }
    var index = 1, misses = 0, MAX_MISS = 3;
    function tryFormat(formats, fi) {
      if (fi >= formats.length) { misses++; index++; next(); return; }
      var url = folder + '/' + index + '.' + formats[fi];
      var t = new Image();
      t.onload = function () { found.push(url); misses = 0; if (onImage) onImage(url, index); index++; next(); };
      t.onerror = function () { tryFormat(formats, fi + 1); };
      t.src = url;
    }
    function next() {
      if (index > MAX_IMAGES_PER_PRODUCT) { onComplete(found); return; }
      if (misses >= MAX_MISS) { onComplete(found); return; }
      tryFormat(['jpg', 'png', 'webp'], 0);
    }
    next();
  }

  /* ============ PRODUCT CARD ============ */
  function renderProductCard(p) {
    var discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    var cover = getCoverImage(p);
    var rating = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || 4.5);
    var wished = isWishlisted(p.id);
    return '<article class="product-card">' +
      '<button class="wishlist-btn' + (wished ? ' active' : '') + '" data-wishlist-id="' + p.id + '" type="button" aria-label="Wishlist">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="' + (wished ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
        '</svg>' +
      '</button>' +
      '<a class="product-card-link" href="product.html?id=' + p.id + '">' +
        '<div class="product-card-thumb">' +
          '<img src="' + cover + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' +
          (discount > 0 ? '<span class="discount-tag">' + discount + '% OFF</span>' : '') +
        '</div>' +
        '<div class="product-card-body">' +
          '<span class="product-brand">' + esc(p.brand) + '</span>' +
          '<h3 class="product-name">' + esc(p.name) + '</h3>' +
          '<div class="product-rating"><span class="rating-pill">' + rating.toFixed(1) + ' ★</span></div>' +
          '<div class="product-price-row">' +
            '<span class="price">' + fmtPrice(p.price) + '</span>' +
            (p.mrp > p.price ? '<span class="mrp">' + fmtPrice(p.mrp) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</a>' +
      '<button class="add-cart-btn" data-id="' + p.id + '">Add to Cart</button>' +
    '</article>';
  }
  function renderGrid(grid, list) {
    if (!grid) return;
    if (!list || !list.length) { grid.innerHTML = '<div class="no-products">No products found.</div>'; return; }
    var html = '';
    list.forEach(function (p) { html += renderProductCard(p); });
    grid.innerHTML = html;
    attachImageFallbacks(grid);
    grid.querySelectorAll('.add-cart-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-id'), 10);
        addToCart(getProduct(id) || id, 1);
        showToast('Added to cart');
      });
    });
    grid.querySelectorAll('[data-wishlist-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        toggleWishlist(parseInt(btn.getAttribute('data-wishlist-id'), 10));
      });
    });
  }

  function applyFilters() {
    var grid = $('productGrid');
    if (!grid) return;
    var active = document.querySelector('.category-filter.active');
    var cat = active ? active.getAttribute('data-cat') : 'all';
    var searchInput = $('searchInput');
    var q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var filtered = PRODUCTS.filter(function (p) {
      var catOk = cat === 'all' || p.category === cat;
      var sOk = !q || p.name.toLowerCase().indexOf(q) !== -1 || p.brand.toLowerCase().indexOf(q) !== -1 || p.category.toLowerCase().indexOf(q) !== -1;
      return catOk && sOk;
    });
    var sortSel = $('sortSelect');
    var s = sortSel ? sortSel.value : 'popular';
    if (s === 'price-asc') filtered.sort(function (a, b) { return a.price - b.price; });
    else if (s === 'price-desc') filtered.sort(function (a, b) { return b.price - a.price; });
    else if (s === 'rating') filtered.sort(function (a, b) { return b.rating - a.rating; });
    renderGrid(grid, filtered);
    if (filtered.length) trackViewItemList(cat === 'all' ? 'All Products' : cat, filtered);
  }

  function showToast(msg) {
    var t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function showProductSkeleton(container) {
    if (!container) return;
    container.innerHTML =
      '<div class="pd-skeleton">' +
        '<div class="pd-skel-gallery"><div class="pd-skel-image"></div></div>' +
        '<div class="pd-skel-info">' +
          '<div class="pd-skel-line short"></div><div class="pd-skel-line title"></div>' +
          '<div class="pd-skel-line medium"></div><div class="pd-skel-line price"></div>' +
          '<div class="pd-skel-line"></div><div class="pd-skel-line"></div><div class="pd-skel-btn"></div>' +
        '</div>' +
      '</div>';
  }

  function renderProductDetail(overrideProduct) {
    var container = $('productDetail');
    if (!container) return;
    var p = overrideProduct;
    if (!p) {
      var params = new URLSearchParams(window.location.search);
      p = getProduct(parseInt(params.get('id'), 10));
    }
    if (!p) { container.innerHTML = '<p style="text-align:center;padding:60px 20px;">Product not found. <a href="index.html" style="color:#2563eb;">Back to store</a></p>'; return; }
    document.title = p.name + ' — GIMPZ';

    track('view_item', {
      currency: 'INR', value: Number(p.price) || 0,
      items: [{ item_id: String(p.id), item_name: p.name, item_brand: p.brand || '', item_category: p.category || '', price: Number(p.price) || 0, quantity: 1 }]
    });

    addToRecent(p.id);

    var discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    var cover = getCoverImage(p);
    var rating = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || 4.5);
    var wished = isWishlisted(p.id);

    container.innerHTML = '' +
      '<div class="pd-grid">' +
        '<div class="pd-gallery">' +
          '<div class="pd-image">' +
            '<img id="pdMainImage" src="' + cover + '" alt="' + esc(p.name) + '">' +
            '<span class="pd-img-count" id="pdImgCount" style="display:none">0 photos</span>' +
          '</div>' +
          '<div class="pd-thumbs" id="pdThumbs"></div>' +
        '</div>' +
        '<div class="pd-info">' +
          '<div class="pd-brand-row">' +
            '<span class="pd-brand">' + esc(p.brand) + '</span>' +
            '<button class="pd-wishlist-btn' + (wished ? ' active' : '') + '" data-wishlist-id="' + p.id + '" type="button">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="' + (wished ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<h1 class="pd-title">' + esc(p.name) + '</h1>' +
          '<div class="pd-rating">' +
            '<span class="rating-pill">' + rating.toFixed(1) + ' ★</span>' +
            '<span class="pd-stock">' + (p.stock > 0 ? 'In Stock' : 'Out of Stock') + '</span>' +
          '</div>' +
          '<div class="pd-price">' +
            '<span class="pd-now">' + fmtPrice(p.price) + '</span>' +
            (p.mrp > p.price ? '<span class="pd-mrp">' + fmtPrice(p.mrp) + '</span><span class="pd-disc">' + discount + '% OFF</span>' : '') +
          '</div>' +
          '<p class="pd-desc">' + esc(p.description) + '</p>' +
          '<div class="pd-actions">' +
            '<button class="btn btn-outline" id="pdAddCart">Add to Cart</button>' +
            '<button class="btn btn-primary" id="pdBuyNow">Buy Now</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    attachImageFallbacks(container);
    var mainImg = $('pdMainImage');
    var thumbs = $('pdThumbs');
    var countEl = $('pdImgCount');
    var detected = [];
    detectProductImages(p, function (url, idx) {
      detected.push(url);
      var btn = document.createElement('button');
      btn.className = 'pd-thumb' + (detected.length === 1 ? ' active' : '');
      btn.innerHTML = '<img src="' + url + '" alt="" loading="lazy">';
      btn.addEventListener('click', function () {
        if (mainImg) mainImg.src = url;
        thumbs.querySelectorAll('.pd-thumb').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      thumbs.appendChild(btn);
      if (detected.length === 1 && mainImg) mainImg.src = url;
      attachImageFallbacks(thumbs);
    }, function (all) {
      if (countEl && all.length > 1) { countEl.style.display = 'block'; countEl.textContent = all.length + ' photos'; }
      if (all.length <= 1 && thumbs) thumbs.style.display = 'none';
    });

    var addBtn = $('pdAddCart');
    if (addBtn) addBtn.addEventListener('click', function () { addToCart(p, 1); showToast('Added to cart'); });
    var buyBtn = $('pdBuyNow');
    if (buyBtn) buyBtn.addEventListener('click', function () { addToCart(p, 1); window.location.href = 'cart.html'; });

    var wBtn = container.querySelector('.pd-wishlist-btn');
    if (wBtn) wBtn.addEventListener('click', function (e) { e.preventDefault(); toggleWishlist(p.id); });

    loadReviews(p.id);
    setupReviewForm(p.id, p.name);
    renderRelatedProducts(p);
    renderRecentlyViewed();
  }

  function getRelatedProducts(currentProduct, count) {
    count = count || 4;
    if (!currentProduct) return [];
    var currentId = currentProduct.id, currentCat = currentProduct.category, currentPrice = Number(currentProduct.price) || 0;
    var sameCat = PRODUCTS.filter(function (p) { return p.id !== currentId && p.category === currentCat; })
      .sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    var result = sameCat.slice(0, count);
    if (result.length < count) {
      var others = PRODUCTS.filter(function (p) { return p.id !== currentId && p.category !== currentCat; })
        .sort(function (a, b) {
          var aDiff = Math.abs(Number(a.price) - currentPrice);
          var bDiff = Math.abs(Number(b.price) - currentPrice);
          if (aDiff !== bDiff) return aDiff - bDiff;
          return (b.rating || 0) - (a.rating || 0);
        });
      for (var i = 0; i < others.length && result.length < count; i++) {
        var exists = result.some(function (r) { return r.id === others[i].id; });
        if (!exists) result.push(others[i]);
      }
    }
    return result;
  }
  function renderRelatedProducts(currentProduct) {
    var section = $('relatedProductsSection');
    var grid = $('relatedProductsGrid');
    var title = $('relatedProductsTitle');
    if (!section || !grid) return;
    var related = getRelatedProducts(currentProduct, 4);
    if (!related.length) { section.style.display = 'none'; return; }
    if (title) title.textContent = 'More from ' + (currentProduct.category || 'this store');
    section.style.display = 'block';
    renderGrid(grid, related);
    trackViewItemList('Related Products', related);
  }

  /* ============ CART PAGE ============ */
  function renderCartPage() {
    var list = $('cartList');
    if (!list) return;
    var cart = getCart();
    if (!cart.length) {
      list.innerHTML = '<div class="cart-empty"><h2>Your cart is empty</h2><p>Browse our products and add something you like.</p><a class="btn btn-primary" href="index.html">Start Shopping</a></div>';
      if ($('cartSummary')) $('cartSummary').style.display = 'none';
      if ($('checkoutBlock')) $('checkoutBlock').style.display = 'none';
      return;
    }
    var html = '';
    var needsUpgrade = false;
    cart.forEach(function (item) {
      if (!item.name || !item.price) {
        var p = getProduct(item.id);
        if (p) { item.name = p.name; item.brand = p.brand; item.price = p.price; item.mrp = p.mrp; item.image_folder = p.image_folder; }
        else { needsUpgrade = true; return; }
      }
      var lineTotal = Number(item.price) * item.qty;
      var cover = item.image_folder ? ('assets/products/' + item.image_folder + '/1.jpg') : 'assets/products/placeholder.svg';
      html += '<div class="cart-item">' +
        '<div class="cart-item-img"><img src="' + cover + '" alt="' + esc(item.name) + '" loading="lazy"></div>' +
        '<div class="cart-item-info"><h3>' + esc(item.name) + '</h3>' +
          '<p class="cart-item-brand">' + esc(item.brand || '') + '</p>' +
          '<p class="cart-item-price">' + fmtPrice(item.price) + '</p></div>' +
        '<div class="cart-item-qty">' +
          '<button class="qty-btn" data-id="' + item.id + '" data-delta="-1">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button class="qty-btn" data-id="' + item.id + '" data-delta="1">+</button>' +
        '</div>' +
        '<div class="cart-item-total">' + fmtPrice(lineTotal) + '</div>' +
        '<button class="cart-item-remove" data-id="' + item.id + '">×</button>' +
      '</div>';
    });
    list.innerHTML = html;
    attachImageFallbacks(list);
    if (!needsUpgrade) saveCart(cart);
    list.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        var d = parseInt(btn.getAttribute('data-delta'), 10);
        var c = getCart();
        for (var i = 0; i < c.length; i++) if (c[i].id === id) { c[i].qty = Math.max(1, c[i].qty + d); break; }
        saveCart(c);
        renderCartPage();
        if (ACTIVE_COUPON) {
          var st = cartTotal();
          if (st < (ACTIVE_COUPON.min_order || 0)) removeCoupon();
          else updateSummary();
        }
      });
    });
    list.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFromCart(parseInt(btn.getAttribute('data-id'), 10));
        renderCartPage();
        if (ACTIVE_COUPON) {
          var st = cartTotal();
          if (st < (ACTIVE_COUPON.min_order || 0)) removeCoupon();
          else updateSummary();
        }
      });
    });
    updateSummary();
    track('begin_checkout', {
      currency: 'INR', value: cartTotal(),
      items: cart.map(function (it) {
        return { item_id: String(it.id), item_name: it.name, item_brand: it.brand || '', price: Number(it.price) || 0, quantity: it.qty };
      })
    });
  }

  function updateSummary() {
    var sub = $('sumSubtotal'), total = $('sumTotal');
    var discountRow = $('sumDiscountRow'), discountEl = $('sumDiscount');
    if (!sub || !total) return;
    var s = cartTotal();
    var discount = ACTIVE_COUPON ? calculateDiscount(ACTIVE_COUPON, s) : 0;
    var afterDiscount = Math.max(0, s - discount);
    var ship = afterDiscount > 0 && afterDiscount < 499 ? 49 : 0;
    sub.textContent = fmtPrice(s);
    if (discount > 0 && discountRow && discountEl) {
      discountRow.style.display = 'flex';
      discountEl.textContent = '− ' + fmtPrice(discount);
    } else if (discountRow) {
      discountRow.style.display = 'none';
    }
    if ($('sumShipping')) $('sumShipping').textContent = ship === 0 ? 'FREE' : fmtPrice(ship);
    total.textContent = fmtPrice(afterDiscount + ship);
  }

  function generateOrderNumber() {
    var d = new Date();
    var stamp = d.getFullYear().toString().slice(-2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    return 'GIMPZ-' + stamp + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function setupCheckout() {
    var form = $('checkoutForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cart = getCart();
      if (!cart.length) { showToast('Cart is empty'); return; }
      var user = getUser();
      if (!user || !user.uid) {
        alert('Please sign in to place an order.');
        window.location.href = 'login.html?redirect=cart.html';
        return;
      }
      var name = form.cname.value.trim();
      var phone = form.cphone.value.trim();
      var address = form.caddress.value.trim();
      var city = form.ccity.value.trim();
      var state = form.cstate.value.trim();
      var pincode = form.cpincode.value.trim();
      var payment = form.cpayment.value;
      var label = (form.addressLabel && form.addressLabel.value) ? form.addressLabel.value.trim() : '';

      if (!name || name.length < 2) { alert('Enter your name'); return; }
      if (!/^[6-9][0-9]{9}$/.test(phone)) { alert('Enter valid mobile number'); return; }
      if (address.length < 10) { alert('Enter full address'); return; }
      if (!/^[A-Za-z\s]{3,}$/.test(city)) { alert('Enter valid city'); return; }
      if (!/^[A-Za-z\s]{3,}$/.test(state)) { alert('Enter valid state'); return; }
      if (!/^[1-9][0-9]{5}$/.test(pincode)) { alert('Enter valid pincode'); return; }

      var orderNo = generateOrderNumber();
      var subtotal = 0, items = [];
      cart.forEach(function (item) {
        var price = Number(item.price) || 0;
        var lt = price * item.qty;
        subtotal += lt;
        items.push({
          product_id: item.id, product_name: item.name || ('Product #' + item.id),
          product_brand: item.brand || '', image_folder: item.image_folder || '',
          quantity: item.qty, price_at_time: price, line_total: lt
        });
      });

      var discountAmount = ACTIVE_COUPON ? calculateDiscount(ACTIVE_COUPON, subtotal) : 0;
      var afterDiscount = Math.max(0, subtotal - discountAmount);
      var shipping = afterDiscount > 0 && afterDiscount < 499 ? 49 : 0;
      var total = afterDiscount + shipping;

      var btn = $('placeOrderBtn'), statusEl = $('orderStatus');
      btn.disabled = true;
      btn.textContent = 'Placing order...';

      var orderPayload = {
        order_number: orderNo, user_id: user.uid, customer_name: name, phone: phone,
        email: user.email, address: address, city: city, state: state, pincode: pincode,
        payment_method: payment, subtotal: subtotal, shipping: shipping, total: total, status: 'Pending',
        coupon_code: ACTIVE_COUPON ? ACTIVE_COUPON.code : null,
        discount_amount: discountAmount
      };

      fetch(SUPABASE_URL + '/rest/v1/orders', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(orderPayload)
      })
        .then(function (r) { if (!r.ok) return r.text().then(function () { throw new Error('Order failed'); }); return r.json(); })
        .then(function (rows) {
          var orderId = rows[0] && rows[0].id;
          if (!orderId) throw new Error('No order id');
          return fetch(SUPABASE_URL + '/rest/v1/order_items', {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify(items.map(function (it) {
              return { order_id: orderId, product_id: it.product_id, product_name: it.product_name, product_brand: it.product_brand, image_folder: it.image_folder, quantity: it.quantity, price_at_time: it.price_at_time, line_total: it.line_total };
            }))
          }).then(function () { return orderId; });
        })
        .then(function () {
          if (ACTIVE_COUPON) {
            var newCount = (ACTIVE_COUPON.times_used || 0) + 1;
            fetch(SUPABASE_URL + '/rest/v1/coupons?id=eq.' + ACTIVE_COUPON.id, {
              method: 'PATCH',
              headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ times_used: newCount })
            }).catch(function () {});
          }
          track('purchase', {
            transaction_id: orderNo, currency: 'INR', value: total, shipping: shipping, tax: 0,
            coupon: ACTIVE_COUPON ? ACTIVE_COUPON.code : undefined,
            items: items.map(function (it) {
              return { item_id: String(it.product_id), item_name: it.product_name, item_brand: it.product_brand || '', price: Number(it.price_at_time) || 0, quantity: it.quantity };
            })
          });
          if (label) return saveAddressToDb(user, name, phone, address, city, state, pincode, label);
        })
        .then(function () {
          // Clear abandoned cart (order completed)
          fetch(SUPABASE_URL + '/rest/v1/abandoned_carts?user_id=eq.' + encodeURIComponent(user.uid), {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
          }).catch(function () {});
        })
        .then(function () {
          try { localStorage.setItem('gimpz_last_order', JSON.stringify({ orderNumber: orderNo, total: total, name: name })); } catch (err) {}
          ACTIVE_COUPON = null;
          saveCoupon(null);
          clearCart();
          window.location.href = 'order-success.html';
        })
        .catch(function (err) {
          console.error('[GIMPZ] Order failed:', err);
          if (statusEl) { statusEl.textContent = 'Order failed. Please try again.'; statusEl.className = 'form-status err'; }
          btn.disabled = false;
          btn.textContent = 'Place Order →';
        });
    });
  }

  function renderOrderSuccess() {
    var container = $('orderSuccessContent');
    if (!container) return;
    try {
      var raw = localStorage.getItem('gimpz_last_order');
      if (raw) {
        var d = JSON.parse(raw);
        if ($('orderCustomerName') && d.name) $('orderCustomerName').textContent = d.name;
        if ($('orderTotalAmount') && d.total) $('orderTotalAmount').textContent = fmtPrice(d.total);
        if ($('orderSuccessNumber') && d.orderNumber) $('orderSuccessNumber').textContent = d.orderNumber;
      }
    } catch (e) {}
  }

  function prefetchCart() {
    if (document.querySelector('link[data-prefetch="cart"]')) return;
    var link = document.createElement('link');
    link.rel = 'prefetch'; link.href = 'cart.html'; link.setAttribute('data-prefetch', 'cart');
    document.head.appendChild(link);
  }

  window.gimpzRenderGrid = renderGrid;
  window.gimpzFindProduct = function (id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  };
  window.gimpzAllProducts = function () { return PRODUCTS; };

  /* ============ INIT ============ */
  function init() {
    updateCartBadge();
    updateWishlistBadge();
    var detailContainer = $('productDetail');

    if (detailContainer) {
      prefetchCart();
      var params = new URLSearchParams(window.location.search);
      var id = parseInt(params.get('id'), 10);
      if (!id) { detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">No product specified. <a href="index.html" style="color:#2563eb;">Back to store</a></p>'; return; }
      var cached = readCache();
      var cachedProduct = null;
      if (cached) for (var i = 0; i < cached.length; i++) if (cached[i].id === id) { cachedProduct = cached[i]; break; }
      if (cachedProduct) { PRODUCTS = cached; renderProductDetail(cachedProduct); fetchProducts(); return; }
      showProductSkeleton(detailContainer);
      fetchSingleProduct(id)
        .then(function (p) {
          if (!p) { detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">Product not found. <a href="index.html" style="color:#2563eb;">Back to store</a></p>'; return; }
          if (!getProduct(p.id)) PRODUCTS.push(p);
          renderProductDetail(p);
        })
        .catch(function (err) { console.error('[GIMPZ] Product fetch failed:', err); detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">Could not load product. <a href="index.html" style="color:#2563eb;">Back to store</a></p>'; });
      fetchProducts();
      return;
    }

    if ($('cartList')) {
      var cachedCart = readCache();
      if (cachedCart) { PRODUCTS = cachedCart; renderCartPage(); } else { renderCartPage(); }
      fetchProducts().then(function () { renderCartPage(); });
      var u = getUser();
      if (u && u.uid) loadAddresses(u.uid);
      initCouponOnCart();
      setupCheckout();
      return;
    }

    if ($('orderSuccessContent')) { renderOrderSuccess(); return; }

    if ($('wishlistGrid')) {
      var cachedW = readCache();
      if (cachedW) { PRODUCTS = cachedW; }
      fetchProducts().then(function () {});
      return;
    }

    var cachedHome = readCache();
    if (cachedHome && $('productGrid')) {
      PRODUCTS = cachedHome;
      applyFilters();
      renderRecentlyViewed();
      initSearchAutocomplete();
      fetchProducts().then(function () { applyFilters(); renderRecentlyViewed(); });
    } else {
      fetchProducts().then(function () {
        if ($('productGrid')) applyFilters();
        renderRecentlyViewed();
        initSearchAutocomplete();
      });
    }

    var searchInput = $('searchInput');
    if (searchInput) {
      var searchTimer = null;
      searchInput.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilters, 150);
      });
    }
    var sortSel = $('sortSelect');
    if (sortSel) sortSel.addEventListener('change', applyFilters);
    document.querySelectorAll('.category-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.category-filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilters();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ============ IMAGE ZOOM ============ */
  function openImageZoom(src) {
    var existing = document.querySelector('.img-zoom-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'img-zoom-overlay';
    overlay.innerHTML =
      '<button class="img-zoom-close" aria-label="Close">×</button>' +
      '<div class="img-zoom-hint">Pinch or scroll to zoom · Tap outside to close</div>' +
      '<img src="' + src + '" class="img-zoom-img" alt="Zoomed product image">';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('img-zoom-close')) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escHandler);
      }
    });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }
  document.addEventListener('click', function (e) {
    var img = e.target.closest('#pdMainImage');
    if (img && img.src) openImageZoom(img.src);
  });

  /* ============ PWA — Register Service Worker ============ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js')
        .then(function () { console.log('[GIMPZ] PWA service worker ready'); })
        .catch(function (err) { console.log('[GIMPZ] SW registration skipped:', err.message); });
    });
  }

  /* ============ PWA — Install Prompt ============ */
  var deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    var btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'inline-flex';
  });
  window.gimpzInstallApp = function () {
    if (!deferredInstallPrompt) return false;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function (choice) {
      console.log('[GIMPZ] Install choice:', choice.outcome);
      deferredInstallPrompt = null;
    });
    return true;
  };

  /* ============ NEWSLETTER SIGNUP ============ */
  (function () {
    var form = $('newsletterForm');
    if (!form) return;
    var input = $('newsletterEmail');
    var btn = $('newsletterBtn');
    var status = $('newsletterStatus');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim().toLowerCase();
      status.textContent = '';
      status.className = 'newsletter-status';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = 'Please enter a valid email address';
        status.className = 'newsletter-status err';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Subscribing...';
      fetch(SUPABASE_URL + '/rest/v1/newsletter_subscribers', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal,resolution=merge-duplicates'
        },
        body: JSON.stringify({ email: email, source: 'footer', unsubscribed: false })
      })
        .then(function (r) {
          if (!r.ok) {
            return r.text().then(function (txt) {
              if (txt.indexOf('23505') !== -1 || txt.indexOf('duplicate') !== -1) return 'duplicate';
              throw new Error('Subscribe failed');
            });
          }
          return 'ok';
        })
        .then(function (result) {
          status.textContent = result === 'duplicate' ? '✓ You\'re already subscribed!' : '✓ Subscribed! Check your inbox for offers.';
          status.className = 'newsletter-status ok';
          form.reset();
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'newsletter_signup', { email_domain: email.split('@')[1] || '' });
          }
        })
        .catch(function (err) {
          console.error('[GIMPZ] Newsletter error:', err);
          status.textContent = 'Something went wrong. Try again.';
          status.className = 'newsletter-status err';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        });
    });
  })();
})();
