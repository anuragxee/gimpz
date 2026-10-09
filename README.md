# GIMPZ — E-commerce Store

A modern e-commerce storefront built with plain HTML, CSS and JavaScript.
Runs free on **GitHub Pages**. Data is stored in **Supabase**. Customer auth is handled by **Firebase**.

## Live site

`https://anuragxee.github.io/gimpz/`

## Pages

- **index.html** — Homepage: hero, categories, product grid, filters, search
- **product.html?id=1** — Product detail with gallery
- **cart.html** — Cart + checkout (requires sign-in)
- **order-success.html** — Order confirmation
- **new-arrivals.html** — 12 newest products
- **best-sellers.html** — 12 top-rated products
- **login.html** — Sign up / sign in / forgot password / verify email
- **account.html** — My orders + profile
- **track-order.html** — Order tracking by order number
- **shipping.html**, **returns.html**, **contact.html** — Info pages
- **admin.html** — Admin panel (10 tabs: products, orders, customers, categories, coupons, analytics, marketing, staff, activity log)

## Tech stack

- **Frontend:** Plain HTML + CSS + vanilla JS
- **Data:** Supabase (tables: `products`, `orders`, `order_items`, `profiles`, `categories`, `coupons`, `admin_users`, `marketing_lists`, `activity_log`)
- **Auth (customers):** Firebase Authentication
- **Auth (admin):** Supabase Auth
- **Hosting:** GitHub Pages
- **Images:** `assets/products/<folder-slug>/1.jpg`, `2.jpg`, etc.

## How products work

Products live in the Supabase `products` table — not in a JS file. To add or edit products, use the **Admin Panel** at `/admin.html` or add rows directly in Supabase.

Product images go in `assets/products/<image_folder>/` named `1.jpg`, `2.jpg`, `3.jpg`... up to 10. The site auto-detects `.jpg`, `.png`, `.webp`.

## How orders work

1. Customer adds items to cart (stored in `localStorage`)
2. Signs in via Firebase
3. Fills shipping details in `cart.html`
4. Order + items are written to Supabase (`orders`, `order_items`)
5. Order appears instantly in the admin panel
6. Admin updates status → customer sees it in `account.html` and `track-order.html`

## Admin panel

- URL: `/admin.html`
- Login with a Supabase Auth user
- Only emails in the `admin_users` table can log in
- Supports: product CRUD, order management, customer list, categories, coupons, analytics, marketing lists, staff, activity log

## How to change site info

- **Email:** `thegimpzzstore@gmail.com` (search all HTML files)
- **Instagram / X / LinkedIn:** search `instagram.com/thegimpzz`, `x.com/TGimpzz49730`, `linkedin.com/in/gimpz`
- **Free shipping threshold:** edit `script.js` — look for `s < 499 ? 49 : 0`
- **Brand colors:** `style.css` — `:root { --navy, --blue, ... }`

## Deployment

Push to the `main` branch. GitHub Pages deploys automatically within 1–2 minutes.
