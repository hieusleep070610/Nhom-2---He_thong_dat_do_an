# Foodie frontend

Static HTML, CSS, and JavaScript frontend. No build step is required.

## Run locally

1. Configure and start the backend using `../backend/README.md`.
2. Open `index.html` with VS Code Live Server (or another local HTTP server). Avoid `file://` URLs because browser origin and CORS behavior differs.
3. If the API is hosted elsewhere, update `js/config/config.js`. The current default is `http://127.0.0.1:8000/api`.

Customer pages are wired to the backend for sign-in/register, profile, dish browsing, cart, wallet, checkout, and order history. Axios is loaded from jsDelivr, so the browser needs network access to load it. Admin and kitchen pages are presentation-only placeholders; they do not provide live inventory or order-management screens.

## Customer order flow

- Register or sign in to receive a bearer token. The shared Axios client attaches the token from `localStorage` or `sessionStorage`.
- The menu and dish pages read `/menu/dishes`. Checkout reads `/auth/me`, `/wallets/mine`, `/menu/daily-menus/remaining`, and `/menu/pickup-slots`.
- Checkout submits `POST /orders` with dish IDs and quantities, pickup date/slot, and wallet payment. Prices are recalculated by the backend.
- The wallet and order pages read `/wallets/mine` and `/orders/mine`. The wallet must already exist and have enough balance; top-ups are not implemented.

## Current limits

- Categories and ratings are not supplied by the backend, so those fake filters are omitted. Search, price range, and price sorting use actual dish data.
- Coupon codes, cash-on-delivery, bank payment, wallet top-up, and live admin/kitchen screens are not implemented.
- Run the frontend through HTTP and set an appropriate `CORS_ORIGINS` value in the backend `.env`.
