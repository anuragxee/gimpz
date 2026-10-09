/* ============================================================
   GIMPZ — ADMIN PANEL LOGIC
   Handles: Login, Products CRUD, Orders, Image Upload
   + Order Details Modal (view what customer ordered)
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  var SUPABASE_URL = 'https://qyzevydprpkjslnesrxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emV2eWRwcnBranNsbmVzcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk2NDksImV4cCI6MjEwNzA5NTY0OX0.BE-ijSGGNmkQjaeSZ8RX6mQGMW5dY2Y2Gzj9vitRK0g';
  var AUTH_STORAGE_KEY = 'gimpz_admin_session';

  /* ============================================================
     STATE
     ============================================================ */
  var session = null;
  var currentProducts = [];
  var currentOrders = [];
  var pendingImages = [];

  /* ============================================================
     HELPERS
     ============================================================ */
  function $(id) { return document.getElementById(id); }

  function apiHeaders(useAuth) {
    var token = (useAuth && session && session.access_token)
      ? session.access_token
      : SUPABASE_ANON_KEY;
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatPrice(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = el.className.replace(/\b(ok|err)\b/g, '').trim();
    if (type) el.classList.add(type);
  }

  /* ============================================================
     SESSION
     ============================================================ */
  function saveSession() {
    try {
      if (session) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {}
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) session = JSON.parse(raw);
    } catch (e) { session = null; }
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  function login(email, password) {
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed');
          return data;
        });
      })
      .then(function (data) {
        session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: {
            id: data.user && data.user.id,
            email: data.user && data.user.email
          }
        };
        saveSession();
        return session;
      });
  }

  function logout() {
    session = null;
    saveSession();
    showLoginScreen();
  }

  /* ============================================================
     SCREEN SWITCHING
     ============================================================ */
  function showLoginScreen() {
    $('loginScreen').style.display = 'grid';
    $('dashboard').style.display = 'none';
  }

  function showDashboard() {
    $('loginScreen').style.display = 'none';
    $('dashboard').style.display = 'grid';
    var email = (session && session.user && session.user.email) || 'admin';
    $('adminEmailDisplay').textContent = email;
    $('adminAvatar').textContent = email.charAt(0).toUpperCase();
    loadOverview();
    loadProducts();
    loadOrders();
  }

  /* ============================================================
     TABS
     ============================================================ */
  function switchTab(tab) {
    document.querySelectorAll('.admin-nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.admin-tab').forEach(function (t) {
      t.style.display = 'none';
    });
    var el = $('tab-' + tab);
    if (el) el.style.display = 'block';

    var titles = { overview: 'Overview', products: 'Products', orders: 'Orders' };
    $('pageTitle').textContent = titles[tab] || 'Admin';

    if (tab === 'overview') loadOverview();
    if (tab === 'products') loadProducts();
    if (tab === 'orders') loadOrders();
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function loadOverview() {
    fetch(SUPABASE_URL + '/rest/v1/products?select=id&active=eq.true', {
      headers: apiHeaders(true)
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        $('statProducts').textContent = Array.isArray(rows) ? rows.length : '0';
      })
      .catch(function () { $('statProducts').textContent = '—'; });

    fetch(SUPABASE_URL + '/rest/v1/orders?select=*&order=created_at.desc', {
      headers: apiHeaders(true)
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        currentOrders = rows;
        var totalRevenue = 0;
        var pending = 0;
        rows.forEach(function (o) {
          totalRevenue += Number(o.total || 0);
          if ((o.status || 'Pending').toLowerCase() === 'pending') pending++;
        });
        $('statOrders').textContent = rows.length;
        $('statRevenue').textContent = formatPrice(totalRevenue);
        $('statPending').textContent = pending;

        var badge = $('ordersCount');
        if (badge) {
          badge.textContent = rows.length;
          badge.setAttribute('data-count', rows.length);
        }

        renderRecentOrders(rows.slice(0, 5));
      })
      .catch(function () {
        $('statOrders').textContent = '—';
      });
  }

  function renderRecentOrders(rows) {
    var el = $('recentOrders');
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<p class="admin-empty">No orders yet</p>';
      return;
    }
    var html = '';
    rows.forEach(function (o) {
      html += '<div class="recent-order-row" style="cursor:pointer;" data-view="' + o.id + '">' +
        '<div><strong>' + escapeHtml(o.order_number || '—') + '</strong></div>' +
        '<div>' + escapeHtml(o.customer_name || '—') + '</div>' +
        '<div>' + escapeHtml(o.phone || '—') + '</div>' +
        '<div>' + formatPrice(o.total) + '</div>' +
        '<div>' + statusPill(o.status) + '</div>' +
      '</div>';
    });
    el.innerHTML = html;

    el.querySelectorAll('[data-view]').forEach(function (row) {
      row.addEventListener('click', function () {
        openOrderDetails(parseInt(row.getAttribute('data-view'), 10));
      });
    });
  }

  function statusPill(status) {
    var s = (status || 'Pending').toLowerCase();
    var cls = 'status-pending';
    if (s === 'shipped') cls = 'status-shipped';
    else if (s === 'delivered') cls = 'status-delivered';
    else if (s === 'cancelled') cls = 'status-cancelled';
    return '<span class="status-pill ' + cls + '">' + escapeHtml(status || 'Pending') + '</span>';
  }

  /* ============================================================
     PRODUCTS
     ============================================================ */
  function loadProducts() {
    var tbody = $('productsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">Loading products...</td></tr>';

    fetch(SUPABASE_URL + '/rest/v1/products?select=*&order=id.desc', {
      headers: apiHeaders(true)
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        currentProducts = rows;
        renderProductsTable(rows);
      })
      .catch(function (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">Failed to load: ' + escapeHtml(err.message) + '</td></tr>';
      });
  }

  function renderProductsTable(rows) {
    var tbody = $('productsBody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No products yet. Click "Add Product" to create one.</td></tr>';
      return;
    }

    var html = '';
    rows.forEach(function (p) {
      var img = p.image_folder
        ? ('assets/products/' + p.image_folder + '/1.jpg')
        : 'assets/products/placeholder.svg';

      html += '<tr data-id="' + p.id + '">' +
        '<td><img class="admin-product-thumb" src="' + img + '" alt="" onerror="this.src=\'assets/products/placeholder.svg\'"></td>' +
        '<td><strong>' + escapeHtml(p.name) + '</strong><br><small style="color:#64748b;">' + escapeHtml(p.brand) + '</small></td>' +
        '<td>' + escapeHtml(p.category) + '</td>' +
        '<td><strong>' + formatPrice(p.price) + '</strong></td>' +
        '<td>' + (p.stock || 0) + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' +
          '<button class="admin-action-btn" data-action="edit" data-id="' + p.id + '">Edit</button>' +
          '<button class="admin-action-btn danger" data-action="delete" data-id="' + p.id + '">Delete</button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        var action = btn.getAttribute('data-action');
        if (action === 'edit') openProductModal(id);
        if (action === 'delete') deleteProduct(id);
      });
    });
  }

  /* ============================================================
     PRODUCT MODAL
     ============================================================ */
  function openProductModal(id) {
    pendingImages = [];
    $('uploadPreview').innerHTML = '';
    $('formStatus').textContent = '';
    $('productForm').reset();
    $('pf-rating').value = '4.5';

    if (id) {
      var p = currentProducts.find(function (x) { return x.id === id; });
      if (!p) return;
      $('modalTitle').textContent = 'Edit Product';
      $('pf-id').value = p.id;
      $('pf-name').value = p.name || '';
      $('pf-brand').value = p.brand || '';
      $('pf-category').value = p.category || '';
      $('pf-stock').value = p.stock || 0;
      $('pf-price').value = p.price || '';
      $('pf-mrp').value = p.mrp || '';
      $('pf-rating').value = p.rating || 4.5;
      $('pf-folder').value = p.image_folder || '';
      $('pf-description').value = p.description || '';
    } else {
      $('modalTitle').textContent = 'Add Product';
      $('pf-id').value = '';
    }

    $('productModal').classList.add('open');
  }

  function closeProductModal() {
    $('productModal').classList.remove('open');
    pendingImages = [];
    $('uploadPreview').innerHTML = '';
  }

  function handleImageSelect(files) {
    var preview = $('uploadPreview');
    Array.prototype.forEach.call(files, function (file) {
      if (!file.type.startsWith('image/')) return;
      pendingImages.push(file);
      var idx = pendingImages.length;
      var reader = new FileReader();
      reader.onload = function (e) {
        var div = document.createElement('div');
        div.className = 'upload-prev-item';
        div.innerHTML = '<span class="prev-index">' + idx + '</span><img src="' + e.target.result + '" alt="">';
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ============================================================
     SAVE PRODUCT
     ============================================================ */
  function saveProduct(e) {
    e.preventDefault();

    var btn = $('saveProductBtn');
    var status = $('formStatus');

    var id = $('pf-id').value;
    var data = {
      name: $('pf-name').value.trim(),
      brand: $('pf-brand').value.trim(),
      category: $('pf-category').value,
      stock: parseInt($('pf-stock').value, 10) || 0,
      price: parseInt($('pf-price').value, 10) || 0,
      mrp: parseInt($('pf-mrp').value, 10) || 0,
      rating: parseFloat($('pf-rating').value) || 4.5,
      image_folder: $('pf-folder').value.trim().toLowerCase(),
      description: $('pf-description').value.trim(),
      active: true
    };

    if (!data.name || !data.brand || !data.category || !data.price || !data.mrp) {
      showStatus(status, 'Please fill all required fields', 'err');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="admin-spinner"></span> Saving...';
    showStatus(status, '', '');

    var url = SUPABASE_URL + '/rest/v1/products';
    var method = 'POST';
    var headers = apiHeaders(true);
    headers['Prefer'] = 'return=representation';

    if (id) {
      url += '?id=eq.' + encodeURIComponent(id);
      method = 'PATCH';
    }

    fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) { throw new Error('Save failed: ' + r.status + ' — ' + t); });
        }
        return r.json();
      })
      .then(function () {
        if (pendingImages.length > 0 && data.image_folder) {
          return uploadImages(data.image_folder, pendingImages);
        }
      })
      .then(function () {
        showStatus(status, '✓ Saved successfully', 'ok');
        loadProducts();
        loadOverview();
        setTimeout(closeProductModal, 900);
      })
      .catch(function (err) {
        showStatus(status, err.message || 'Save failed', 'err');
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Save Product';
      });
  }

  /* ============================================================
     IMAGE UPLOAD
     ============================================================ */
  function uploadImages(folder, files) {
    var uploads = files.map(function (file, i) {
      var ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      var path = 'products/' + folder + '/' + (i + 1) + '.' + ext;
      var url = SUPABASE_URL + '/storage/v1/object/product-images/' + path;

      return fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) { console.warn('Upload failed for', path, r.status, t); });
        }
      });
    });
    return Promise.all(uploads);
  }

  /* ============================================================
     DELETE PRODUCT
     ============================================================ */
  function deleteProduct(id) {
    var p = currentProducts.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm('Delete "' + p.name + '"?\n\nThis cannot be undone.')) return;

    fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + id, {
      method: 'DELETE',
      headers: apiHeaders(true)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Delete failed');
        loadProducts();
        loadOverview();
      })
      .catch(function (err) { alert(err.message); });
  }

  /* ============================================================
     ORDERS
     ============================================================ */
  function loadOrders() {
    var tbody = $('ordersBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">Loading orders...</td></tr>';

    fetch(SUPABASE_URL + '/rest/v1/orders?select=*&order=created_at.desc', {
      headers: apiHeaders(true)
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        currentOrders = rows;
        renderOrdersTable(rows);
      })
      .catch(function (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">Failed: ' + escapeHtml(err.message) + '</td></tr>';
      });
  }

  function renderOrdersTable(rows) {
    var tbody = $('ordersBody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No orders yet.</td></tr>';
      return;
    }

    var html = '';
    rows.forEach(function (o) {
      html += '<tr data-id="' + o.id + '">' +
        '<td><strong>' + escapeHtml(o.order_number || '—') + '</strong><br><small style="color:#94a3b8;">' + formatDate(o.created_at) + '</small></td>' +
        '<td>' + escapeHtml(o.customer_name || '—') + '<br><small style="color:#64748b;">' + escapeHtml(o.city || '') + '</small></td>' +
        '<td>' + escapeHtml(o.phone || '—') + '</td>' +
        '<td><strong>' + formatPrice(o.total) + '</strong></td>' +
        '<td>' + statusPill(o.status) + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' +
          '<button class="admin-action-btn" data-action="view" data-id="' + o.id + '" style="background:#2563eb;color:#fff;border-color:#2563eb;">View</button>' +
          '<select class="admin-action-btn" data-action="status" data-id="' + o.id + '" style="padding:6px 8px;">' +
            '<option value="Pending"' + ((o.status || 'Pending') === 'Pending' ? ' selected' : '') + '>Pending</option>' +
            '<option value="Shipped"' + (o.status === 'Shipped' ? ' selected' : '') + '>Shipped</option>' +
            '<option value="Delivered"' + (o.status === 'Delivered' ? ' selected' : '') + '>Delivered</option>' +
            '<option value="Cancelled"' + (o.status === 'Cancelled' ? ' selected' : '') + '>Cancelled</option>' +
          '</select>' +
          '<button class="admin-action-btn" data-action="wa" data-id="' + o.id + '">WA</button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;

    /* View button */
    tbody.querySelectorAll('[data-action="view"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openOrderDetails(parseInt(btn.getAttribute('data-id'), 10));
      });
    });

    /* Status dropdown */
    tbody.querySelectorAll('[data-action="status"]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        updateOrderStatus(parseInt(sel.getAttribute('data-id'), 10), sel.value);
      });
    });

    /* WhatsApp button */
    tbody.querySelectorAll('[data-action="wa"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var o = currentOrders.find(function (x) { return x.id === parseInt(btn.getAttribute('data-id'), 10); });
        if (!o) return;
        var msg = 'Hi ' + (o.customer_name || 'there') + ', this is GIMPZ. Your order ' + (o.order_number || '') + ' is confirmed. We\'ll update you on shipping shortly.';
        window.open('https://wa.me/91' + (o.phone || '').replace(/\D/g, '').slice(-10) + '?text=' + encodeURIComponent(msg), '_blank');
      });
    });
  }

  /* ============================================================
     ORDER DETAILS MODAL — shows what customer ordered
     ============================================================ */
  function openOrderDetails(orderId) {
    var order = currentOrders.find(function (x) { return x.id === orderId; });
    if (!order) return;

    var modal = $('orderModal');
    var title = $('orderModalTitle');
    var body = $('orderModalBody');
    if (!modal || !body) {
      alert('Order details modal not found. Please reload the page.');
      return;
    }

    title.textContent = 'Order ' + (order.order_number || '');
    body.innerHTML = '<p style="color:#64748b;text-align:center;padding:30px 0;">Loading items...</p>';
    modal.classList.add('open');

    fetch(SUPABASE_URL + '/rest/v1/order_items?select=*&order_id=eq.' + orderId + '&order=id.asc', {
      headers: apiHeaders(true)
    })
      .then(function (r) { return r.json(); })
      .then(function (items) {
        if (!Array.isArray(items)) items = [];

        var html = '';

        /* Customer info box */
        html += '<div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:10px;padding:14px 16px;margin-bottom:16px;">' +
          '<div style="font-size:.72rem;font-weight:700;color:#2563eb;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">Customer</div>' +
          '<div style="font-size:.9rem;line-height:1.75;color:#334155;">' +
            '<strong style="color:#0a2540;font-size:.98rem;">' + escapeHtml(order.customer_name || '—') + '</strong><br>' +
            '📞 <a href="tel:' + escapeHtml(order.phone || '') + '" style="color:#2563eb;text-decoration:none;">' + escapeHtml(order.phone || '—') + '</a><br>' +
            (order.email ? '✉️ <a href="mailto:' + escapeHtml(order.email) + '" style="color:#2563eb;text-decoration:none;">' + escapeHtml(order.email) + '</a><br>' : '') +
            '📍 ' + escapeHtml(order.address || '') + '<br>' +
            '&nbsp;&nbsp;&nbsp;&nbsp;' + escapeHtml(order.city || '') + ', ' + escapeHtml(order.state || '') + ' — ' + escapeHtml(order.pincode || '') +
          '</div>' +
        '</div>';

        /* Items list */
        html += '<div style="font-size:.72rem;font-weight:700;color:#2563eb;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">Items Ordered (' + items.length + ')</div>';

        if (!items.length) {
          html += '<p style="color:#94a3b8;font-size:.88rem;background:#f8fafc;padding:16px;border-radius:10px;text-align:center;">No items recorded for this order.</p>';
        } else {
          html += '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">';
          items.forEach(function (it, idx) {
            html += '<div style="display:grid;grid-template-columns:1fr auto auto;gap:14px;padding:12px 14px;border-bottom:' + (idx === items.length - 1 ? '0' : '1px solid #f1f5f9') + ';font-size:.88rem;align-items:center;">' +
              '<div>' +
                '<strong style="color:#0a2540;display:block;margin-bottom:2px;">' + escapeHtml(it.product_name) + '</strong>' +
                (it.product_brand ? '<small style="color:#64748b;">' + escapeHtml(it.product_brand) + '</small>' : '') +
              '</div>' +
              '<div style="color:#475569;white-space:nowrap;font-weight:600;">× ' + it.quantity + '</div>' +
              '<div style="font-weight:700;color:#0a2540;white-space:nowrap;">' + formatPrice(it.line_total) + '</div>' +
            '</div>';
          });
          html += '</div>';
        }

        /* Totals */
        html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;">' +
          '<div style="display:flex;justify-content:space-between;font-size:.86rem;color:#475569;margin-bottom:6px;">' +
            '<span>Subtotal</span><span style="font-weight:600;color:#0a2540;">' + formatPrice(order.subtotal) + '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:.86rem;color:#475569;margin-bottom:6px;">' +
            '<span>Shipping</span><span style="font-weight:600;color:#0a2540;">' + (order.shipping > 0 ? formatPrice(order.shipping) : 'FREE') + '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:800;color:#0a2540;padding-top:10px;border-top:1px solid #f1f5f9;margin-top:8px;">' +
            '<span>Total</span><span>' + formatPrice(order.total) + '</span>' +
          '</div>' +
        '</div>';

        /* Payment + status */
        html += '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">' +
          '<div style="background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:.8rem;color:#475569;">' +
            '<strong style="color:#0a2540;">Payment:</strong> ' + escapeHtml(order.payment_method || '—') +
          '</div>' +
          '<div>' + statusPill(order.status) + '</div>' +
        '</div>';

        /* Placed date */
        html += '<p style="margin-top:14px;font-size:.76rem;color:#94a3b8;">Placed on ' + formatDate(order.created_at) + '</p>';

        /* Action buttons */
        html += '<div style="display:flex;gap:10px;margin-top:16px;">' +
          '<button class="btn btn-primary" style="flex:1;padding:11px 18px;font-size:.85rem;" id="odWhatsApp">Contact on WhatsApp</button>' +
          '<button class="btn btn-outline" style="padding:11px 18px;font-size:.85rem;" id="odClose">Close</button>' +
        '</div>';

        body.innerHTML = html;

        /* Wire up buttons inside modal */
        var waBtn = $('odWhatsApp');
        if (waBtn) {
          waBtn.addEventListener('click', function () {
            var msg = 'Hi ' + (order.customer_name || 'there') + ', this is GIMPZ. Your order ' + (order.order_number || '') + ' is confirmed. We\'ll update you on shipping shortly.';
            window.open('https://wa.me/91' + (order.phone || '').replace(/\D/g, '').slice(-10) + '?text=' + encodeURIComponent(msg), '_blank');
          });
        }
        var closeBtn = $('odClose');
        if (closeBtn) {
          closeBtn.addEventListener('click', function () {
            modal.classList.remove('open');
          });
        }
      })
      .catch(function (err) {
        body.innerHTML = '<p style="color:#dc2626;padding:20px;text-align:center;">Failed to load items: ' + escapeHtml(err.message) + '</p>';
      });
  }

  /* ============================================================
     UPDATE ORDER STATUS
     ============================================================ */
  function updateOrderStatus(id, status) {
    fetch(SUPABASE_URL + '/rest/v1/orders?id=eq.' + id, {
      method: 'PATCH',
      headers: apiHeaders(true),
      body: JSON.stringify({ status: status })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Update failed');
        var o = currentOrders.find(function (x) { return x.id === id; });
        if (o) o.status = status;
        loadOverview();
      })
      .catch(function (err) { alert(err.message); });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    loadSession();

    /* Login form */
    var loginForm = $('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = $('adminEmail').value.trim();
        var password = $('adminPassword').value;
        var btn = $('loginBtn');
        var status = $('loginStatus');
        if (!email || !password) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="admin-spinner"></span> Signing in...';
        showStatus(status, '', '');

        login(email, password)
          .then(function () { showDashboard(); })
          .catch(function (err) {
            showStatus(status, err.message || 'Login failed', 'err');
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Sign In';
          });
      });
    }

    /* Logout */
    var lo = $('logoutBtn');
    if (lo) lo.addEventListener('click', function () {
      if (confirm('Log out of admin panel?')) logout();
    });

    /* Tabs */
    document.querySelectorAll('.admin-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });
    document.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-goto'));
      });
    });

    /* Add product */
    var addBtn = $('addProductBtn');
    if (addBtn) addBtn.addEventListener('click', function () { openProductModal(null); });

    /* Product modal close */
    var mc = $('modalClose');
    if (mc) mc.addEventListener('click', closeProductModal);
    var cf = $('cancelFormBtn');
    if (cf) cf.addEventListener('click', closeProductModal);
    var modal = $('productModal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) closeProductModal();
    });

    /* Order modal close */
    var omc = $('orderModalClose');
    if (omc) omc.addEventListener('click', function () {
      $('orderModal').classList.remove('open');
    });
    var oModal = $('orderModal');
    if (oModal) oModal.addEventListener('click', function (e) {
      if (e.target === oModal) oModal.classList.remove('open');
    });

    /* ESC closes any open modal */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (modal) modal.classList.remove('open');
        if (oModal) oModal.classList.remove('open');
      }
    });

    /* Product form submit */
    var pf = $('productForm');
    if (pf) pf.addEventListener('submit', saveProduct);

    /* Image upload */
    var upload = $('adminUpload');
    var input = $('pf-images');
    if (upload && input) {
      upload.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        handleImageSelect(input.files);
        input.value = '';
      });
      ['dragover', 'dragenter'].forEach(function (ev) {
        upload.addEventListener(ev, function (e) {
          e.preventDefault();
          upload.classList.add('drag');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        upload.addEventListener(ev, function (e) {
          e.preventDefault();
          upload.classList.remove('drag');
        });
      });
      upload.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files) {
          handleImageSelect(e.dataTransfer.files);
        }
      });
    }

    /* Refresh orders */
    var ro = $('refreshOrdersBtn');
    if (ro) ro.addEventListener('click', loadOrders);

    /* Auto-login */
    if (session && session.access_token) {
      showDashboard();
    } else {
      showLoginScreen();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
