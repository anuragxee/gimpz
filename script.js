/* ============================================================
   GIMPZ — MAIN SCRIPT (standalone + cache + instant cart + analytics)
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';
  var CART_KEY = 'gimpz_cart';
  var MAX_IMAGES_PER_PRODUCT = 10;

  var CACHE_KEY = 'gimpz_products_cache_v1';
  var CACHE_TTL = 5 * 60 * 1000;

  var PRODUCTS = [];
  var SAVED_ADDRESSES = [];

  /* ============ ANALYTICS ============ */
  function track(eventName, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params || {});
      }
    } catch (e) {}
  }

  function trackViewItemList(listName, products) {
    if (!products || !products.length) return;
    track('view_item_list', {
      item_list_name: listName,
      items: products.slice(0, 10).map(function (p, i) {
        return {
          item_id: String(p.id),
          item_name: p.name,
          item_brand: p.brand || '',
          item_category: p.category || '',
          price: Number(p.price) || 0,
          index: i
        };
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
        '<div class="saved-address-body">' +
          '<strong>' + esc(a.full_name) + '</strong>' +
          '<span>· ' + esc(a.phone) + '</span><br>' +
          esc(a.address) + ', ' + esc(a.city) + ', ' + esc(a.state) + ' — ' + esc(a.pincode) +
        '</div>' +
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
    set('cname', a.full_name);
    set('cphone', a.phone);
    set('caddress', a.address);
    set('ccity', a.city);
    set('cstate', a.state);
    set('cpincode', a.pincode);
    var label = $('addressLabel');
    if (label) label.value = '';
  }

  function saveAddressToDb(user, name, phone, address, city, state, pincode, label) {
    if (!user || !user.uid) return Promise.resolve();
    var payload = {
      user_id: user.uid,
      label: (label || 'Home').trim().slice(0, 20) || 'Home',
      full_name: name,
      phone: phone,
      address: address,
      city: city,
      state: state,
      pincode: pincode
    };
    return fetch(SUPABASE_URL + '/rest/v1/addresses', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(function (e) { console.warn('Address save failed:', e); });
  }

  window.gimpzLoadAddresses = function (uid) { loadAddresses(uid); };

  /* ============ CART ============ */
  function getCart() {
    try { var raw = localStorage.getItem(CART_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    updateCartBadge();
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

    // Analytics
    track('add_to_cart', {
      currency: 'INR',
      value: (Number(product.price) || 0) * qty,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        item_brand: product.brand || '',
        item_category: product.category || '',
        price: Number(product.price) || 0,
        quantity: qty
      }]
    });
  }
  function removeFromCart(productId) {
    var cart = getCart().filter(function (item) { return item.id !== productId; });
    saveCart(cart);
    track('remove_from_cart', {
      currency: 'INR',
      items: [{ item_id: String(productId) }]
    });
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
    var badges = document.querySelectorAll('.cart-badge');
    var count = cartItemCount();
    badges.forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? 'grid' : 'none';
    });
  }

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

  function renderProductCard(p) {
    var discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    var cover = getCoverImage(p);
    var rating = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || 4.5);
    return '<article class="product-card">' +
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
        var product = getProduct(id);
        addToCart(product || id, 1);
        showToast('Added to cart');
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

    // Track visible list
    if (filtered.length) {
      trackViewItemList(cat === 'all' ? 'All Products' : cat, filtered);
    }
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
          '<div class="pd-skel-line short"></div>' +
          '<div class="pd-skel-line title"></div>' +
          '<div class="pd-skel-line medium"></div>' +
          '<div class="pd-skel-line price"></div>' +
          '<div class="pd-skel-line"></div>' +
          '<div class="pd-skel-line"></div>' +
          '<div class="pd-skel-btn"></div>' +
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

    // Analytics: view_item
    track('view_item', {
      currency: 'INR',
      value: Number(p.price) || 0,
      items: [{
        item_id: String(p.id),
        item_name: p.name,
        item_brand: p.brand || '',
        item_category: p.category || '',
        price: Number(p.price) || 0,
        quantity: 1
      }]
    });

    var discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    var cover = getCoverImage(p);
    var rating = typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || 4.5);
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
          '<span class="pd-brand">' + esc(p.brand) + '</span>' +
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
      btn.innerHTML = '<img src="' + url + '" alt="View ' + idx + '" loading="lazy" decoding="async">';
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
    if (buyBtn) buyBtn.addEventListener('click', function () {
      addToCart(p, 1);
      track('begin_checkout', {
        currency: 'INR',
        value: Number(p.price) || 0,
        items: [{ item_id: String(p.id), item_name: p.name, price: Number(p.price) || 0, quantity: 1 }]
      });
      window.location.href = 'cart.html';
    });
  }

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
        '<div class="cart-item-img"><img src="' + cover + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async"></div>' +
        '<div class="cart-item-info">' +
          '<h3>' + esc(item.name) + '</h3>' +
          '<p class="cart-item-brand">' + esc(item.brand || '') + '</p>' +
          '<p class="cart-item-price">' + fmtPrice(item.price) + '</p>' +
        '</div>' +
        '<div class="cart-item-qty">' +
          '<button class="qty-btn" data-id="' + item.id + '" data-delta="-1">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button class="qty-btn" data-id="' + item.id + '" data-delta="1">+</button>' +
        '</div>' +
        '<div class="cart-item-total">' + fmtPrice(lineTotal) + '</div>' +
        '<button class="cart-item-remove" data-id="' + item.id + '" aria-label="Remove">×</button>' +
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
      });
    });
    list.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { removeFromCart(parseInt(btn.getAttribute('data-id'), 10)); renderCartPage(); });
    });
    updateSummary();

    // Analytics: begin_checkout
    track('begin_checkout', {
      currency: 'INR',
      value: cartTotal(),
      items: cart.map(function (it) {
        return {
          item_id: String(it.id),
          item_name: it.name,
          item_brand: it.brand || '',
          price: Number(it.price) || 0,
          quantity: it.qty
        };
      })
    });
  }

  function updateSummary() {
    var sub = $('sumSubtotal'), total = $('sumTotal');
    if (!sub || !total) return;
    var s = cartTotal();
    var ship = s > 0 && s < 499 ? 49 : 0;
    sub.textContent = fmtPrice(s);
    if ($('sumShipping')) $('sumShipping').textContent = ship === 0 ? 'FREE' : fmtPrice(ship);
    total.textContent = fmtPrice(s + ship);
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
      var shipping = subtotal > 0 && subtotal < 499 ? 49 : 0;
      var total = subtotal + shipping;
      var btn = $('placeOrderBtn'), statusEl = $('orderStatus');
      btn.disabled = true;
      btn.textContent = 'Placing order...';

      fetch(SUPABASE_URL + '/rest/v1/orders', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          order_number: orderNo, user_id: user.uid, customer_name: name, phone: phone,
          email: user.email, address: address, city: city, state: state, pincode: pincode,
          payment_method: payment, subtotal: subtotal, shipping: shipping, total: total, status: 'Pending'
        })
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
          // Analytics: purchase
          track('purchase', {
            transaction_id: orderNo,
            currency: 'INR',
            value: total,
            shipping: shipping,
            tax: 0,
            items: items.map(function (it) {
              return {
                item_id: String(it.product_id),
                item_name: it.product_name,
                item_brand: it.product_brand || '',
                price: Number(it.price_at_time) || 0,
                quantity: it.quantity
              };
            })
          });

          if (label) {
            return saveAddressToDb(user, name, phone, address, city, state, pincode, label);
          }
        })
        .then(function () {
          try { localStorage.setItem('gimpz_last_order', JSON.stringify({ orderNumber: orderNo, total: total, name: name })); } catch (err) {}
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

  function init() {
    updateCartBadge();
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
      setupCheckout();
      return;
    }

    if ($('orderSuccessContent')) { renderOrderSuccess(); return; }

    var cachedHome = readCache();
    if (cachedHome && $('productGrid')) {
      PRODUCTS = cachedHome;
      applyFilters();
      fetchProducts().then(function () { applyFilters(); });
    } else {
      fetchProducts().then(function () { if ($('productGrid')) applyFilters(); });
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
})();
