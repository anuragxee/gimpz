# GIMPZ — E-commerce Store

A modern e-commerce storefront built with plain HTML, CSS and JavaScript.
Runs completely free on **GitHub Pages** — no backend, no database required.

## Live site

Once deployed: `https://<your-username>.github.io/gimpz/`

## Pages

- **index.html** — Homepage with hero, categories, product grid, filters, search
- **product.html?id=1** — Single product page
- **cart.html** — Shopping cart + checkout (sends order via WhatsApp)
- **order-success.html** — Order confirmation page

## How to add / edit products

Open `products.js` and copy any existing product block. Change:

- `id` — must be unique (increment the last one)
- `name` — product name
- `brand` — brand name
- `category` — must match one of: Electronics, Fashion, Home & Kitchen, Beauty, Sports, Toys, Books, Grocery
- `price` — selling price in ₹
- `mrp` — original price (shows strikethrough)
- `rating` — 0 to 5
- `stock` — number available
- `image` — path to image (e.g. `assets/products/tshirt.svg`)
- `description` — short paragraph

## How to add product images

1. Put your image in `assets/products/`
2. Reference it in `products.js` as `assets/products/yourfile.jpg`

Recommended: square images, 800×800px, under 200KB.

## How orders work

When a customer places an order:
1. Their details + cart items are formatted into a text message
2. WhatsApp opens with `+91 7061086068` and the message pre-filled
3. Customer sends the message
4. You receive the order and process it manually

## How to change your WhatsApp number

Open `script.js`, find:
