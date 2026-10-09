<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a2540">
<title>New Arrivals — GIMPZ</title>
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>

<div class="topbar">
  <div class="container topbar-inner">
    <div class="topbar-marquee">
      <div class="topbar-marquee-track">
        <a href="index.html#products">🚚 Free shipping on orders above ₹499</a>
        <a href="new-arrivals.html">✨ New arrivals every week</a>
        <a href="shipping.html">🔒 100% secure payments</a>
        <a href="returns.html">↩️ Easy 7-day returns</a>
        <a href="https://www.instagram.com/thegimpzz" target="_blank" rel="noopener">📱 Follow us on Instagram</a>
        <a href="best-sellers.html">💰 Best prices guaranteed</a>
        <a href="index.html#products">🚚 Free shipping on orders above ₹499</a>
        <a href="new-arrivals.html">✨ New arrivals every week</a>
        <a href="shipping.html">🔒 100% secure payments</a>
        <a href="returns.html">↩️ Easy 7-day returns</a>
        <a href="https://www.instagram.com/thegimpzz" target="_blank" rel="noopener">📱 Follow us on Instagram</a>
        <a href="best-sellers.html">💰 Best prices guaranteed</a>
      </div>
    </div>
    <span class="topbar-links">
      <a href="track-order.html">Track Order</a>
      <a href="contact.html">Help</a>
    </span>
  </div>
</div>

<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="index.html"><span class="logo-mark">G</span><span class="logo-text">GIMPZ</span></a>
    <form class="header-search" role="search" onsubmit="location.href='index.html';return false;">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>
      <input type="search" placeholder="Search for products..." aria-label="Search products">
    </form>
    <nav class="header-actions">
      <a class="icon-btn" href="account.html" aria-label="Account">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
      </a>
      <a class="icon-btn cart-icon-btn" href="cart.html" aria-label="Cart">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h8.7a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="19" cy="20" r="1.4"/></svg>
        <span class="cart-badge" style="display:none">0</span>
      </a>
    </nav>
  </div>
</header>

<main id="main" class="page-info">
  <div class="container">
    <nav class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>New Arrivals</span></nav>

    <div class="info-hero">
      <div class="info-hero-icon">✨</div>
      <h1>New Arrivals</h1>
      <p>Freshly added products — check back every week</p>
    </div>

    <section class="products-section" style="padding:0">
      <div class="products-header">
        <div>
          <h2 class="section-title">Just Landed</h2>
          <p class="section-sub" id="productsCount">Loading...</p>
        </div>
        <div class="products-sort">
          <label for="sortSelect">Sort by:</label>
          <select id="sortSelect">
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>
      <div class="product-grid" id="productGrid">
        <div class="no-products">Loading products…</div>
      </div>
    </section>

    <section class="info-section" style="margin-top:28px">
      <h2>Want to know when something new drops?</h2>
      <p>New products are added every week. Follow us on Instagram or X to get notified first.</p>
      <div class="info-actions">
        <a class="btn btn-primary" href="https://www.instagram.com/thegimpzz" target="_blank" rel="noopener">Follow on Instagram</a>
        <a class="btn btn-outline" href="index.html#products">Browse All Products</a>
      </div>
    </section>
  </div>
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <div class="logo"><span class="logo-mark">G</span><span class="logo-text">GIMPZ</span></div>
      <p class="footer-desc">Everything You Need, One Store.</p>
    </div>
    <div class="footer-col">
      <h3>Shop</h3>
      <ul>
        <li><a href="index.html#products">All Products</a></li>
        <li><a href="index.html#categories">Categories</a></li>
        <li><a href="best-sellers.html">Best Sellers</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3>Help</h3>
      <ul>
        <li><a href="track-order.html">Track Order</a></li>
        <li><a href="shipping.html">Shipping Info</a></li>
        <li><a href="returns.html">Returns</a></li>
        <li><a href="contact.html">Contact Us</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3>Follow Us</h3>
      <div class="social-row">
        <a class="social-link" href="https://www.instagram.com/thegimpzz" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
        </a>
        <a class="social-link" href="https://x.com/TGimpzz49730" target="_blank" rel="noopener" aria-label="X">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.9 2H22l-7.5 8.5L23 22h-6.9l-5.4-6.6L4.5 22H1.4l8-9.1L1 2h7.1l4.9 6.1L18.9 2zm-1.1 18h1.9L7.3 4H5.3l12.5 16z"/></svg>
        </a>
        <a class="social-link" href="https://www.linkedin.com/in/gimpz" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.5 4.7 5.9V21h-4v-5.6c0-1.3 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21h-4z"/></svg>
        </a>
      </div>
      <p class="social-note">Follow us for updates</p>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>&copy; <span id="year">2026</span> GIMPZ. All rights reserved.</p>
    <p>Made with care in India</p>
  </div>
</footer>

<script>
(function () {
  'use strict';

  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';

  var products = [];
  var currentSort = 'newest';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtPrice(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function getCoverImage(p) {
    if (p && p.image_folder) return 'assets/products/' + p.image_folder + '/1.jpg';
    return 'assets/products/placeholder.svg';
  }

  function cardHtml(p) {
    var discount = p.mrp > p.price
      ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
      : 0;
    var cover = getCoverImage(p);
    var rating = (typeof p.rating === 'number') ? p.rating : parseFloat(p.rating || 4.5);

    return '<article class="product-card">' +
      '<a class="product-card-link" href="product.html?id=' + p.id + '">' +
        '<div class="product-card-thumb">' +
          '<img src="' + cover + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/products/placeholder.svg\'">' +
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

  function render(list) {
    var grid = document.getElementById('productGrid');
    var countEl = document.getElementById('productsCount');
    if (!grid) return;

    if (!list || !list.length) {
      grid.innerHTML = '<div class="no-products">No products found.</div>';
      if (countEl) countEl.textContent = 'No products';
      return;
    }

    var html = '';
    list.forEach(function (p) { html += cardHtml(p); });
    grid.innerHTML = html;

    if (countEl) {
      countEl.textContent = 'Showing ' + list.length + ' new product' + (list.length === 1 ? '' : 's');
    }

    grid.querySelectorAll('.add-cart-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-id'), 10);
        addToCart(id);
      });
    });
  }

  function addToCart(productId) {
    var CART_KEY = 'gimpz_cart';
    var cart = [];
    try {
      var raw = localStorage.getItem(CART_KEY);
      cart = raw ? JSON.parse(raw) : [];
    } catch (e) { cart = []; }

    var found = false;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === productId) { cart[i].qty++; found = true; break; }
    }
    if (!found) cart.push({ id: productId, qty: 1 });

    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}

    var total = 0;
    cart.forEach(function (it) { total += it.qty; });
    document.querySelectorAll('.cart-badge').forEach(function (b) {
      b.textContent = total;
      b.style.display = total > 0 ? 'grid' : 'none';
    });

    // Toast
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = 'Added to cart';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function applySort() {
    var list = products.slice();
    if (currentSort === 'price-asc') {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (currentSort === 'price-desc') {
      list.sort(function (a, b) { return b.price - a.price; });
    } else if (currentSort === 'rating') {
      list.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    } else {
      list.sort(function (a, b) { return b.id - a.id; });
    }
    render(list);
  }

  function loadProducts() {
    var url = SUPABASE_URL + '/rest/v1/products?select=*&active=eq.true&order=id.desc&limit=12';

    fetch(url, {
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
        products = rows.map(function (row) {
          return {
            id: row.id,
            name: row.name,
            brand: row.brand,
            category: row.category,
            price: row.price,
            mrp: row.mrp,
            rating: typeof row.rating === 'number' ? row.rating : parseFloat(row.rating || 4.5),
            stock: row.stock || 0,
            image_folder: row.image_folder || ''
          };
        });
        applySort();
      })
      .catch(function (err) {
        var grid = document.getElementById('productGrid');
        if (grid) {
          grid.innerHTML = '<div class="no-products">Could not load products. Please refresh.</div>';
        }
        console.warn('[GIMPZ] Fetch failed:', err);
      });
  }

  // Init
  document.getElementById('year').textContent = new Date().getFullYear();

  var sortSel = document.getElementById('sortSelect');
  if (sortSel) {
    sortSel.value = 'newest';
    sortSel.addEventListener('change', function () {
      currentSort = this.value;
      applySort();
    });
  }

  // Update cart badge on load
  try {
    var raw = localStorage.getItem('gimpz_cart');
    var cart = raw ? JSON.parse(raw) : [];
    var total = 0;
    cart.forEach(function (it) { total += it.qty; });
    if (total > 0) {
      document.querySelectorAll('.cart-badge').forEach(function (b) {
        b.textContent = total;
        b.style.display = 'grid';
      });
    }
  } catch (e) {}

  loadProducts();

})();
</script>
</body>
</html>
