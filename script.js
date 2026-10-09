/* ============================================================
   GIMPZ — MAIN SCRIPT
   Reads products from Supabase database
   Falls back to products.js if Supabase is unreachable
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     SUPABASE CONFIGURATION
     ============================================================ */
  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';

  /* ============================================================
     PRODUCTS ARRAY (populated from Supabase)
     ============================================================ */
  var PRODUCTS = (typeof window.PRODUCTS !== 'undefined') ? window.PRODUCTS : [];

  var CART_KEY = 'gimpz_cart';
  var MAX_IMAGES_PER_PRODUCT = 10;

  /* ============================================================
     FETCH PRODUCTS FROM SUPABASE
     ============================================================ */
  function fetchProductsFromSupabase() {
    var url = SUPABASE_URL + '/rest/v1/products?select=*&active=eq.true&order=id.asc';

    return fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(function (row) {
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
            featured: !!row.featured
          };
        });
      })
      .catch(function (err) {
        console.warn('[GIMPZ] Supabase fetch failed:', err);
        return null;
      });
  }

  /* ============================================================
     CART
     ============================================================ */
  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    catch (e) {}
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

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============================================================
     IMAGES
     ============================================================ */
  function getCoverImage(product) {
    if (product && product.folder) {
      return product.folder + '/1.jpg';
    }
    return 'assets/products/placeholder.svg';
  }

  function attachImageFallbacks(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.fallbackAttached) return;
      img.dataset.fallbackAttached = '1';

      img.addEventListener('error', function () {
        var src = img.getAttribute('src') || '';
        if (src.indexOf('placeholder.svg') !== -1) return;

        if (src.indexOf('.jpg') !== -1) {
          img.setAttribute('src', src.replace('.jpg', '.png'));
          return;
        }
        if (src.indexOf('.png') !== -1) {
          img.setAttribute('src', src.replace('.png', '.webp'));
          return;
        }
        img.setAttribute('src', 'assets/products/placeholder.svg');
      });
    });
  }

  function detectProductImages(product, onImage, onComplete) {
    var folder = product && product.folder;
    var found = [];

    if (!folder) {
      onComplete(found);
      return;
    }

    var index = 1;
    var consecutiveMisses = 0;
    var MAX_CONSECUTIVE_MISSES = 3;

    function tryFormat(formats, formatIdx) {
      if (formatIdx >= formats.length) {
        consecutiveMisses++;
        index++;
        next();
        return;
      }
      var url = folder + '/' + index + '.' + formats[formatIdx];
      var testImg = new Image();
      testImg.onload = function () {
        found.push(url);
        consecutiveMisses = 0;
        if (onImage) onImage(url, index);
        index++;
        next();
      };
      testImg.onerror = function () {
        tryFormat(formats, formatIdx + 1);
      };
      testImg.src = url;
    }

    function next() {
      if (index > MAX_IMAGES_PER_PRODUCT) { onComplete(found); return; }
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) { onComplete(found); return; }
      tryFormat(['jpg', 'png', 'webp'], 0);
    }

    next();
  }

  /* ============================================================
     HOMEPAGE GRID
     ============================================================ */
  function renderProductCard(product) {
    var discount = product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

    var cover = getCoverImage(product);

    return '' +
      '<article class="product-card">' +
        '<a class="product-card-link" href="product.html?id=' + product.id + '">' +
          '<div class="product-card-thumb">' +
            '<img src="' + cover + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
            (discount > 0 ? '<span class="discount-tag">' + discount + '% OFF</span>' : '') +
          '</div>' +
          '<div class="product-card-body">' +
            '<span class="product-brand">' + escapeHtml(product.brand) + '</span>' +
            '<h3 class="product-name">' + escapeHtml(product.name) + '</h3>' +
            '<div class="product-rating">' +
              '<span class="rating-pill">' + product.rating.toFixed(1) + ' ★</span>' +
            '</div>' +
            '<div class="product-price-row">' +
              '<span class="price">₹' + product.price.toLocaleString('en-IN') + '</span>' +
              (product.mrp > product.price
                ? '<span class="mrp">₹' + product.mrp.toLocaleString('en-IN') + '</span>'
                : '') +
            '</div>' +
          '</div>' +
        '</a>' +
        '<button class="add-cart-btn" data-id="' + product.id + '">Add to Cart</button>' +
      '</article>';
  }

  function renderHomeGrid(products) {
    var grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!products || !products.length) {
      grid.innerHTML = '<div class="no-products">No products found.</div>';
      return;
    }

    var html = '';
    products.forEach(function (p) { html += renderProductCard(p); });
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

  function setupCategoryFilters() {
    var filterBtns = document.querySelectorAll('.category-filter');
    if (!filterBtns.length) return;
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilters();
      });
    });
  }

  function setupSort() {
    var sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    sortSelect.addEventListener('change', applyFilters);
  }

  function setupSearch() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
  }

  function applyFilters() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;

    var activeFilter = document.querySelector('.category-filter.active');
    var activeCat = activeFilter ? activeFilter.getAttribute('data-cat') : 'all';

    var searchVal = '';
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchVal = searchInput.value.trim().toLowerCase();

    var filtered = PRODUCTS.filter(function (p) {
      var catOk = activeCat === 'all' || p.category === activeCat;
      var searchOk = !searchVal ||
        p.name.toLowerCase().indexOf(searchVal) !== -1 ||
        p.brand.toLowerCase().indexOf(searchVal) !== -1 ||
        p.category.toLowerCase().indexOf(searchVal) !== -1;
      return catOk && searchOk;
    });

    var sortSelect = document.getElementById('sortSelect');
    var sortVal = sortSelect ? sortSelect.value : 'popular';
    if (sortVal === 'price-asc') filtered.sort(function (a, b) { return a.price - b.price; });
    else if (sortVal === 'price-desc') filtered.sort(function (a, b) { return b.price - a.price; });
    else if (sortVal === 'rating') filtered.sort(function (a, b) { return b.rating - a.rating; });

    renderHomeGrid(filtered);
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
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

  /* ============================================================
     PRODUCT DETAIL
     ============================================================ */
  function renderProductDetail() {
    var container = document.getElementById('productDetail');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var id = parseInt(params.get('id'), 10);
    var product = getProduct(id);

    if (!product) {
      container.innerHTML = '<p style="text-align:center;padding:60px 20px;">Product not found. <a href="index.html" style="color:#2563eb;">Back to store</a></p>';
      return;
    }

    document.title = product.name + ' — GIMPZ';

    var discount = product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

    var cover = getCoverImage(product);

    container.innerHTML = '' +
      '<div class="pd-grid">' +
        '<div class="pd-gallery">' +
          '<div class="pd-image">' +
            '<img id="pdMainImage" src="' + cover + '" alt="' + escapeHtml(product.name) + '">' +
            '<span class="pd-img-count" id="pdImgCount" style="display:none">0 photos</span>' +
          '</div>' +
          '<div class="pd-thumbs" id="pdThumbs"></div>' +
        '</div>' +
        '<div class="pd-info">' +
          '<span class="pd-brand">' + escapeHtml(product.brand) + '</span>' +
          '<h1 class="pd-title">' + escapeHtml(product.name) + '</h1>' +
          '<div class="pd-rating">' +
            '<span class="rating-pill">' + product.rating.toFixed(1) + ' ★</span>' +
            '<span class="pd-stock">' + (product.stock > 0 ? 'In Stock' : 'Out of Stock') + '</span>' +
          '</div>' +
          '<div class="pd-price">' +
            '<span class="pd-now">₹' + product.price.toLocaleString('en-IN') + '</span>' +
            (product.mrp > product.price
              ? '<span class="pd-mrp">₹' + product.mrp.toLocaleString('en-IN') + '</span>' +
                '<span class="pd-disc">' + discount + '% OFF</span>'
              : '') +
          '</div>' +
          '<p class="pd-desc">' + escapeHtml(product.description) + '</p>' +
          '<div class="pd-actions">' +
            '<button class="btn btn-outline" id="pdAddCart">Add to Cart</button>' +
            '<button class="btn btn-primary" id="pdBuyNow">Buy Now</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    attachImageFallbacks(container);

    var mainImg = document.getElementById('pdMainImage');
    var thumbsEl = document.getElementById('pdThumbs');
    var countEl = document.getElementById('pdImgCount');
    var detectedImages = [];

    detectProductImages(product, function (url, index) {
      detectedImages.push(url);

      var btn = document.createElement('button');
      btn.className = 'pd-thumb' + (detectedImages.length === 1 ? ' active' : '');
      btn.setAttribute('data-src', url);
      btn.innerHTML = '<img src="' + url + '" alt="View ' + index + '">';
      btn.addEventListener('click', function () {
        if (mainImg) mainImg.src = url;
        thumbsEl.querySelectorAll('.pd-thumb').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      thumbsEl.appendChild(btn);

      if (detectedImages.length === 1 && mainImg) {
        mainImg.src = url;
      }

      attachImageFallbacks(thumbsEl);
    }, function (allFound) {
      if (countEl && allFound.length > 1) {
        countEl.style.display = 'block';
        countEl.textContent = allFound.length + ' photos';
      }
      if (allFound.length <= 1 && thumbsEl) {
        thumbsEl.style.display = 'none';
      }
    });

    document.getElementById('pdAddCart').addEventListener('click', function () {
      addToCart(product.id, 1);
      showToast('Added to cart');
    });

    document.getElementById('pdBuyNow').addEventListener('click', function () {
      addToCart(product.id, 1);
      window.location.href = 'cart.html';
    });
  }

  /* ============================================================
     CART PAGE
     ============================================================ */
  function renderCartPage() {
    var cartList = document.getElementById('cartList');
    if (!cartList) return;

    var cart = getCart();

    if (!cart.length) {
      cartList.innerHTML = '' +
        '<div class="cart-empty">' +
          '<h2>Your cart is empty</h2>' +
          '<p>Browse our products and add something you like.</p>' +
          '<a class="btn btn-primary" href="index.html">Start Shopping</a>' +
        '</div>';
      var summary = document.getElementById('cartSummary');
      if (summary) summary.style.display = 'none';
      var checkoutBlock = document.getElementById('checkoutBlock');
      if (checkoutBlock) checkoutBlock.style.display = 'none';
      return;
    }

    var itemsHtml = '';
    cart.forEach(function (item) {
      var p = getProduct(item.id);
      if (!p) return;
      var lineTotal = p.price * item.qty;
      var img = getCoverImage(p);
      itemsHtml += '' +
        '<div class="cart-item">' +
          '<div class="cart-item-img">' +
            '<img src="' + img + '" alt="' + escapeHtml(p.name) + '">' +
          '</div>' +
          '<div class="cart-item-info">' +
            '<h3>' + escapeHtml(p.name) + '</h3>' +
            '<p class="cart-item-brand">' + escapeHtml(p.brand) + '</p>' +
            '<p class="cart-item-price">₹' + p.price.toLocaleString('en-IN') + '</p>' +
          '</div>' +
          '<div class="cart-item-qty">' +
            '<button class="qty-btn" data-id="' + p.id + '" data-delta="-1">−</button>' +
            '<span class="qty-num">' + item.qty + '</span>' +
            '<button class="qty-btn" data-id="' + p.id + '" data-delta="1">+</button>' +
          '</div>' +
          '<div class="cart-item-total">₹' + lineTotal.toLocaleString('en-IN') + '</div>' +
          '<button class="cart-item-remove" data-id="' + p.id + '" aria-label="Remove">×</button>' +
        '</div>';
    });

    cartList.innerHTML = itemsHtml;
    attachImageFallbacks(cartList);

    cartList.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        var cart = getCart();
        for (var i = 0; i < cart.length; i++) {
          if (cart[i].id === id) { cart[i].qty = Math.max(1, cart[i].qty + delta); break; }
        }
        saveCart(cart);
        renderCartPage();
      });
    });

    cartList.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        removeFromCart(id);
        renderCartPage();
      });
    });

    updateSummary();
  }

  function updateSummary() {
    var subEl = document.getElementById('sumSubtotal');
    var totalEl = document.getElementById('sumTotal');
    if (!subEl || !totalEl) return;

    var subtotal = cartTotal();
    var shipping = subtotal > 0 && subtotal < 499 ? 49 : 0;
    var total = subtotal + shipping;

    subEl.textContent = '₹' + subtotal.toLocaleString('en-IN');
    var shipEl = document.getElementById('sumShipping');
    if (shipEl) shipEl.textContent = shipping === 0 ? 'FREE' : '₹' + shipping;
    totalEl.textContent = '₹' + total.toLocaleString('en-IN');
  }

  /* ============================================================
     SAVE ORDER TO SUPABASE
     Uses keepalive:true so request survives page navigation
     ============================================================ */
  function saveOrderToSupabase(orderData, items) {
    var orderUrl = SUPABASE_URL + '/rest/v1/orders';
    var itemsUrl = SUPABASE_URL + '/rest/v1/order_items';

    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    console.log('[GIMPZ] Saving order to database...', orderData.order_number);

    return fetch(orderUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(orderData),
      keepalive: true
    })
      .then(function (res) {
        console.log('[GIMPZ] Order response status:', res.status);
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error('Status ' + res.status + ' — ' + t);
          });
        }
        return res.json();
      })
      .then(function (rows) {
        var orderId = rows[0] && rows[0].id;
        console.log('[GIMPZ] Order ID created:', orderId);
        if (!orderId) return null;

        var itemsPayload = items.map(function (it) {
          return {
            order_id: orderId,
            product_id: it.product_id,
            product_name: it.product_name,
            product_brand: it.product_brand,
            quantity: it.quantity,
            price_at_time: it.price_at_time,
            line_total: it.line_total
          };
        });

        return fetch(itemsUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(itemsPayload),
          keepalive: true
        });
      })
      .then(function () {
        console.log('[GIMPZ] Order saved to database ✅');
      })
      .catch(function (err) {
        console.error('[GIMPZ] Could not save order:', err.message || err);
      });
  }

  function generateOrderNumber() {
    var d = new Date();
    var stamp = d.getFullYear().toString().slice(-2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0');
    var rand = Math.floor(Math.random() * 9000 + 1000);
    return 'GIMPZ-' + stamp + '-' + rand;
  }

  /* ============================================================
     CHECKOUT
     ============================================================ */
  function setupCheckout() {
    var form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var cart = getCart();
      if (!cart.length) { showToast('Your cart is empty'); return; }

      var name = form.cname.value.trim();
      var phone = form.cphone.value.trim();
      var email = form.cemail.value.trim();
      var address = form.caddress.value.trim();
      var city = form.ccity.value.trim();
      var state = form.cstate.value.trim();
      var pincode = form.cpincode.value.trim();
      var payment = form.cpayment.value;

      if (!name || name.length < 2) { alert('Please enter your name'); return; }
      if (!/^[0-9]{10}$/.test(phone)) { alert('Please enter a valid 10-digit phone number'); return; }
      if (!address) { alert('Please enter your address'); return; }
      if (!city) { alert('Please enter your city'); return; }
      if (!state) { alert('Please enter your state'); return; }
      if (!/^[0-9]{6}$/.test(pincode)) { alert('Please enter a valid 6-digit pincode'); return; }

      var orderNumber = generateOrderNumber();

      var subtotal = 0;
      var orderItems = [];

      cart.forEach(function (item) {
        var p = getProduct(item.id);
        if (!p) return;
        var lineTotal = p.price * item.qty;
        subtotal += lineTotal;
        orderItems.push({
          product_id: p.id,
          product_name: p.name,
          product_brand: p.brand,
          quantity: item.qty,
          price_at_time: p.price,
          line_total: lineTotal
        });
      });

      var shipping = subtotal > 0 && subtotal < 499 ? 49 : 0;
      var total = subtotal + shipping;

      /* Save order to database — keepalive:true so it survives navigation */
      var savePromise = saveOrderToSupabase({
        order_number: orderNumber,
        customer_name: name,
        phone: phone,
        email: email || null,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        payment_method: payment,
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        status: 'Pending'
      }, orderItems);

      /* Build WhatsApp message */
      var lines = [];
      lines.push('*NEW ORDER — GIMPZ*');
      lines.push('Order #: ' + orderNumber);
      lines.push('');
      lines.push('*Customer*');
      lines.push('Name: ' + name);
      lines.push('Phone: ' + phone);
      if (email) lines.push('Email: ' + email);
      lines.push('');
      lines.push('*Shipping Address*');
      lines.push(address);
      lines.push(city + ', ' + state + ' — ' + pincode);
      lines.push('');
      lines.push('*Items*');
      orderItems.forEach(function (it) {
        lines.push('• ' + it.product_name + ' × ' + it.quantity + ' = ₹' + it.line_total.toLocaleString('en-IN'));
      });
      lines.push('');
      lines.push('Subtotal: ₹' + subtotal.toLocaleString('en-IN'));
      lines.push('Shipping: ' + (shipping === 0 ? 'FREE' : '₹' + shipping));
      lines.push('*Total: ₹' + total.toLocaleString('en-IN') + '*');
      lines.push('');
      lines.push('*Payment Method:* ' + payment);

      var orderText = lines.join('\n');

      try {
        localStorage.setItem('gimpz_last_order', JSON.stringify({
          order: orderText,
          total: total,
          name: name,
          orderNumber: orderNumber
        }));
      } catch (err) {}

      /* Open WhatsApp */
      var waNumber = '917061086068';
      var waUrl = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(orderText);
      window.open(waUrl, '_blank');

      clearCart();

      /* Wait for save to finish (max 3 sec) then go to success page */
      Promise.race([
        savePromise,
        new Promise(function (resolve) { setTimeout(resolve, 3000); })
      ]).then(function () {
        window.location.href = 'order-success.html';
      });
    });
  }

  function renderOrderSuccess() {
    var container = document.getElementById('orderSuccessContent');
    if (!container) return;

    try {
      var raw = localStorage.getItem('gimpz_last_order');
      if (raw) {
        var data = JSON.parse(raw);
        var nameEl = document.getElementById('orderCustomerName');
        if (nameEl && data.name) nameEl.textContent = data.name;
        var totalEl = document.getElementById('orderTotalAmount');
        if (totalEl && data.total) totalEl.textContent = '₹' + data.total.toLocaleString('en-IN');
      }
    } catch (e) {}
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    var grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="no-products">Loading products…</div>';

    var pd = document.getElementById('productDetail');
    if (pd && !pd.innerHTML.trim()) {
      pd.innerHTML = '<p style="text-align:center;padding:80px 20px;color:#64748b;">Loading product…</p>';
    }

    updateCartBadge();
    setupSearch();
    setupCategoryFilters();
    setupSort();
    setupCheckout();

    fetchProductsFromSupabase().then(function (supaProducts) {
      if (supaProducts && supaProducts.length > 0) {
        PRODUCTS.length = 0;
        supaProducts.forEach(function (p) { PRODUCTS.push(p); });
        console.log('[GIMPZ] Loaded ' + supaProducts.length + ' products from Supabase');
      } else {
        console.log('[GIMPZ] Using fallback products (products.js)');
      }

      if (document.getElementById('productGrid')) applyFilters();
      if (document.getElementById('productDetail')) renderProductDetail();
      if (document.getElementById('cartList')) renderCartPage();
      if (document.getElementById('orderSuccessContent')) renderOrderSuccess();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/* ============================================================
   SMOOTH SCROLL FOR SAME-PAGE ANCHOR LINKS
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="index.html#"]');
    if (!link) return;

    var path = window.location.pathname;
    var isHome = path === '/' ||
                 path.endsWith('/') ||
                 path.indexOf('index.html') !== -1;
    if (!isHome) return;

    var hash = link.getAttribute('href').split('#')[1];
    if (!hash) return;

    var target = document.getElementById(hash);
    if (!target) return;

    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: top, behavior: 'smooth' });
    history.pushState(null, '', '#' + hash);
  });

})();
