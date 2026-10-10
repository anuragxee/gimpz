/* ============================================================
   GIMPZ — MAIN SCRIPT (standalone + product cache)
   Reads from Supabase. No products.js dependency.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';
  var CART_KEY = 'gimpz_cart';
  var MAX_IMAGES_PER_PRODUCT = 10;

  /* ---- Product cache (5 min) — makes repeat visits instant ---- */
  var CACHE_KEY = 'gimpz_products_cache_v1';
  var CACHE_TTL = 5 * 60 * 1000;

  var PRODUCTS = [];

  /* ============ HELPERS ============ */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtPrice(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function mapRow(row) {
    return {
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      price: row.price,
      mrp: row.mrp,
      rating: typeof row.rating === 'number' ? row.rating : parseFloat(row.rating || 4.5),
      stock: row.stock || 0,
      description: row.description || '',
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
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        products: products
      }));
    } catch (e) {}
  }

  /* ============ FETCH PRODUCTS ============ */
  function fetchProducts() {
    var url = SUPABASE_URL + '/rest/v1/products?select=*&active=eq.true&order=id.asc';
    return fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        PRODUCTS = rows.map(mapRow);
        writeCache(PRODUCTS);
        console.log('[GIMPZ] Loaded ' + PRODUCTS.length + ' products from Supabase');
        return PRODUCTS;
      })
      .catch(function (err) {
        console.error('[GIMPZ] Fetch failed:', err);
        return [];
      });
  }

  /* Fast single-product fetch — used on product.html */
  function fetchSingleProduct(id) {
    var url = SUPABASE_URL + '/rest/v1/products?select=*&active=eq.true&id=eq.' +
      encodeURIComponent(id) + '&limit=1';
    return fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return null;
        return mapRow(rows[0]);
      });
  }

  /* ============ CART ============ */
  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    updateCartBadge();
  }

  function addToCart(productId, qty) {
    qty = qty || 1;
    var cart = getCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === productId) { existing = cart[i]; break; }
    }
    if (existing) { existing.qty += qty; }
    else { cart.push({ id: productId, qty: qty }); }
    saveCart(cart);
  }

  function removeFromCart(productId) {
    var cart = getCart().filter(function (item) { return item.id !== productId; });
    saveCart(cart);
  }

  function clearCart() { saveCart([]); }

  function getProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function cartItemCount() {
    var cart = getCart(); var n = 0;
    for (var i = 0; i < cart.length; i++) n += cart[i].qty;
    return n;
  }

  function cartTotal() {
    var cart = getCart(); var total = 0;
    for (var i = 0; i < cart.length; i++) {
      var p = getProduct(cart[i].id);
      if (p) total += p.price * cart[i].qty;
    }
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

  /* ============ IMAGES ============ */
  function getCoverImage(p) {
    if (p && p.folder) return p.folder + '/1.jpg';
    return 'assets/products/placeholder.svg';
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

    var index = 1;
    var misses = 0;
    var MAX_MISS = 3;

    function tryFormat(formats, fi) {
      if (fi >= formats.length) {
        misses++; index++; next(); return;
      }
      var url = folder + '/' + index + '.' + formats[fi];
      var t = new Image();
      t.onload = function () {
        found.push(url);
        misses = 0;
        if (onImage) onImage(url, index);
        index++; next();
      };
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

    return '<article class="product-card">' +
      '<a class="product-card-link" href="product.html?id=' + p.id + '">' +
        '<div class="product-card-thumb">' +
          '<img src="' + cover + '" alt="' + esc(p.name) + '" loading="lazy">' +
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
    if (!list || !list.length) {
      grid.innerHTML = '<div class="no-products">No products found.</div>';
      return;
    }
    var html = '';
    list.forEach(function (p) { html += renderProductCard(p); });
    grid.innerHTML = html;
    attachImageFallbacks(grid);

    grid.querySelectorAll('.add-cart-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-id'), 10);
        addToCart(id, 1);
        showToast('Added to cart');
      });
    });
  }

  /* ============ FILTERS ============ */
  function applyFilters() {
    var grid = $('productGrid');
    if (!grid) return;

    var active = document.querySelector('.category-filter.active');
    var cat = active ? active.getAttribute('data-cat') : 'all';

    var searchInput = $('searchInput');
    var q = searchInput ? searchInput.value.trim().toLowerCase() : '';

    var filtered = PRODUCTS.filter(function (p) {
      var catOk = cat === 'all' || p.category === cat;
      var sOk = !q ||
        p.name.toLowerCase().indexOf(q) !== -1 ||
        p.brand.toLowerCase().indexOf(q) !== -1 ||
        p.category.toLowerCase().indexOf(q) !== -1;
      return catOk && sOk;
    });

    var sortSel = $('sortSelect');
    var s = sortSel ? sortSel.value : 'popular';
    if (s === 'price-asc') filtered.sort(function (a, b) { return a.price - b.price; });
    else if (s === 'price-desc') filtered.sort(function (a, b) { return b.price - a.price; });
    else if (s === 'rating') filtered.sort(function (a, b) { return b.rating - a.rating; });

    renderGrid(grid, filtered);
  }

  function showToast(msg) {
    var t = $('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  /* ============ PRODUCT DETAIL — SKELETON ============ */
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

  /* ============ PRODUCT DETAIL ============ */
  function renderProductDetail(overrideProduct) {
    var container = $('productDetail');
    if (!container) return;

    var p = overrideProduct;
    if (!p) {
      var params = new URLSearchParams(window.location.search);
      var id = parseInt(params.get('id'), 10);
      p = getProduct(id);
    }

    if (!p) {
      container.innerHTML = '<p style="text-align:center;padding:60px 20px;">Product not found. <a href="index.html" style="color:#2563eb;">Back to store</a></p>';
      return;
    }

    document.title = p.name + ' — GIMPZ';
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
      btn.innerHTML = '<img src="' + url + '" alt="View ' + idx + '">';
      btn.addEventListener('click', function () {
        if (mainImg) mainImg.src = url;
        thumbs.querySelectorAll('.pd-thumb').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      thumbs.appendChild(btn);
      if (detected.length === 1 && mainImg) mainImg.src = url;
      attachImageFallbacks(thumbs);
    }, function (all) {
      if (countEl && all.length > 1) {
        countEl.style.display = 'block';
        countEl.textContent = all.length + ' photos';
      }
      if (all.length <= 1 && thumbs) thumbs.style.display = 'none';
    });

    $('pdAddCart').addEventListener('click', function () {
      addToCart(p.id, 1);
      showToast('Added to cart');
    });
    $('pdBuyNow').addEventListener('click', function () {
      addToCart(p.id, 1);
      window.location.href = 'cart.html';
    });
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
    cart.forEach(function (item) {
      var p = getProduct(item.id);
      if (!p) return;
      var lineTotal = p.price * item.qty;
      html += '<div class="cart-item">' +
        '<div class="cart-item-img"><img src="' + getCoverImage(p) + '" alt="' + esc(p.name) + '"></div>' +
        '<div class="cart-item-info">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="cart-item-brand">' + esc(p.brand) + '</p>' +
          '<p class="cart-item-price">' + fmtPrice(p.price) + '</p>' +
        '</div>' +
        '<div class="cart-item-qty">' +
          '<button class="qty-btn" data-id="' + p.id + '" data-delta="-1">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button class="qty-btn" data-id="' + p.id + '" data-delta="1">+</button>' +
        '</div>' +
        '<div class="cart-item-total">' + fmtPrice(lineTotal) + '</div>' +
        '<button class="cart-item-remove" data-id="' + p.id + '" aria-label="Remove">×</button>' +
      '</div>';
    });
    list.innerHTML = html;
    attachImageFallbacks(list);

    list.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        var d = parseInt(btn.getAttribute('data-delta'), 10);
        var cart = getCart();
        for (var i = 0; i < cart.length; i++) {
          if (cart[i].id === id) { cart[i].qty = Math.max(1, cart[i].qty + d); break; }
        }
        saveCart(cart);
        renderCartPage();
      });
    });
    list.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFromCart(parseInt(btn.getAttribute('data-id'), 10));
        renderCartPage();
      });
    });

    updateSummary();
    autofillProfile();
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

  function autofillProfile() {
    var user = null;
    try { var raw = localStorage.getItem('gimpz_user'); user = raw ? JSON.parse(raw) : null; } catch (e) {}
    if (!user || !user.uid) return;

    fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.uid) + '&select=*', {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows[0]) return;
        var p = rows[0];
        var set = function (id, v) { var el = $(id); if (el && !el.value && v) el.value = v; };
        set('cname', p.full_name);
        set('cphone', p.phone);
        set('cemail', p.email || user.email);
        set('caddress', p.default_address);
        set('ccity', p.default_city);
        set('cstate', p.default_state);
        set('cpincode', p.default_pincode);
      })
      .catch(function () {});
  }

  /* ============ CHECKOUT ============ */
  function generateOrderNumber() {
    var d = new Date();
    var stamp = d.getFullYear().toString().slice(-2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0');
    return 'GIMPZ-' + stamp + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function setupCheckout() {
    var form = $('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cart = getCart();
      if (!cart.length) { showToast('Cart is empty'); return; }

      var user = null;
      try { var raw = localStorage.getItem('gimpz_user'); user = raw ? JSON.parse(raw) : null; } catch (err) {}
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

      if (!name || name.length < 2) { alert('Enter your name'); return; }
      if (!/^[6-9][0-9]{9}$/.test(phone)) { alert('Enter valid mobile number'); return; }
      if (address.length < 10) { alert('Enter full address'); return; }
      if (!/^[A-Za-z\s]{3,}$/.test(city)) { alert('Enter valid city'); return; }
      if (!/^[A-Za-z\s]{3,}$/.test(state)) { alert('Enter valid state'); return; }
      if (!/^[1-9][0-9]{5}$/.test(pincode)) { alert('Enter valid pincode'); return; }

      var orderNo = generateOrderNumber();
      var subtotal = 0;
      var items = [];
      cart.forEach(function (item) {
        var p = getProduct(item.id);
        if (!p) return;
        var lt = p.price * item.qty;
        subtotal += lt;
        items.push({
          product_id: p.id,
          product_name: p.name,
          product_brand: p.brand,
          quantity: item.qty,
          price_at_time: p.price,
          line_total: lt
        });
      });
      var shipping = subtotal > 0 && subtotal < 499 ? 49 : 0;
      var total = subtotal + shipping;

      var btn = $('placeOrderBtn');
      var statusEl = $('orderStatus');
      btn.disabled = true;
      btn.textContent = 'Placing order...';

      fetch(SUPABASE_URL + '/rest/v1/orders', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          order_number: orderNo,
          user_id: user.uid,
          customer_name: name,
          phone: phone,
          email: user.email,
          address: address,
          city: city,
          state: state,
          pincode: pincode,
          payment_method: payment,
          subtotal: subtotal,
          shipping: shipping,
          total: total,
          status: 'Pending'
        })
      })
        .then(function (r) {
          if (!r.ok) return r.text().then(function () { throw new Error('Order failed'); });
          return r.json();
        })
        .then(function (rows) {
          var orderId = rows[0] && rows[0].id;
          if (!orderId) throw new Error('No order id');
          return fetch(SUPABASE_URL + '/rest/v1/order_items', {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(items.map(function (it) {
              return {
                order_id: orderId,
                product_id: it.product_id,
                product_name: it.product_name,
                product_brand: it.product_brand,
                quantity: it.quantity,
                price_at_time: it.price_at_time,
                line_total: it.line_total
              };
            }))
          }).then(function () { return orderId; });
        })
        .then(function () {
          try {
            localStorage.setItem('gimpz_last_order', JSON.stringify({
              orderNumber: orderNo,
              total: total,
              name: name
            }));
          } catch (err) {}
          clearCart();
          window.location.href = 'order-success.html';
        })
        .catch(function (err) {
          console.error('[GIMPZ] Order failed:', err);
          if (statusEl) {
            statusEl.textContent = 'Order failed. Please try again.';
            statusEl.className = 'form-status err';
          }
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

  /* ============ PUBLIC HELPERS ============ */
  window.gimpzRenderGrid = renderGrid;

  /* ============ INIT ============ */
  function init() {
    updateCartBadge();

    var detailContainer = $('productDetail');

    /* ─────────── FAST PATH: product detail page ─────────── */
    if (detailContainer) {
      var params = new URLSearchParams(window.location.search);
      var id = parseInt(params.get('id'), 10);

      if (!id) {
        detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">No product specified. <a href="index.html" style="color:#2563eb;">Back to store</a></p>';
        return;
      }

      // 1) Try cache — instant render, no skeleton
      var cached = readCache();
      var cachedProduct = null;
      if (cached) {
        for (var i = 0; i < cached.length; i++) {
          if (cached[i].id === id) { cachedProduct = cached[i]; break; }
        }
      }

      if (cachedProduct) {
        PRODUCTS = cached;
        renderProductDetail(cachedProduct);
        // Refresh cache in background for next time
        fetchProducts();
        return;
      }

      // 2) No cache — show skeleton + fast single-product fetch
      showProductSkeleton(detailContainer);

      fetchSingleProduct(id)
        .then(function (p) {
          if (!p) {
            detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">Product not found. <a href="index.html" style="color:#2563eb;">Back to store</a></p>';
            return;
          }
          if (!getProduct(p.id)) PRODUCTS.push(p);
          renderProductDetail(p);
        })
        .catch(function (err) {
          console.error('[GIMPZ] Product fetch failed:', err);
          detailContainer.innerHTML = '<p style="text-align:center;padding:60px 20px;">Could not load product. <a href="index.html" style="color:#2563eb;">Back to store</a></p>';
        });

      // Quietly preload full list for cart navigation + next visit
      fetchProducts();
      return;
    }

    /* ─────────── NORMAL PATH: other pages ─────────── */
    fetchProducts().then(function () {
      if ($('productGrid')) applyFilters();
      if ($('cartList')) renderCartPage();
      if ($('orderSuccessContent')) renderOrderSuccess();

      // Debounced search — prevents lag while typing
      var searchTimer = null;
      var searchInput = $('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', function () {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(applyFilters, 180);
        }, { passive: true });
      }

      var sortSel = $('sortSelect');
      if (sortSel) sortSel.addEventListener('change', applyFilters, { passive: true });
      document.querySelectorAll('.category-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.category-filter').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          applyFilters();
        });
      });

      setupCheckout();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
