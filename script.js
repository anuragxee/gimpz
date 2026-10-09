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
            <option value="popular">Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>
      <div class="product-grid" id="productGrid"></div>
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

<script src="products.js"></script>
<script src="script.js"></script>
<script>
  document.getElementById('year').textContent = new Date().getFullYear();

  // New arrivals = highest ID first (newest additions), top 12
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (typeof PRODUCTS === 'undefined' || !PRODUCTS.length) return;

      var newProducts = PRODUCTS.slice().sort(function (a, b) {
        return b.id - a.id;
      }).slice(0, 12);

      var countEl = document.getElementById('productsCount');
      var grid = document.getElementById('productGrid');
      if (countEl) {
        countEl.textContent = 'Showing ' + newProducts.length + ' new product' + (newProducts.length === 1 ? '' : 's');
      }

      var sortSel = document.getElementById('sortSelect');
      if (sortSel) {
        sortSel.addEventListener('change', function () {
          var v = this.value;
          var list = newProducts.slice();
          if (v === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
          else if (v === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
          else if (v === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });

          if (typeof window.gimpzRenderGrid === 'function' && grid) {
            window.gimpzRenderGrid(grid, list);
          }
        });
      }

      if (grid && typeof window.gimpzRenderGrid === 'function') {
        window.gimpzRenderGrid(grid, newProducts);
      }
    }, 1500);
  });
</script>
</body>
</html>
