# Foodie backend

FastAPI + SQLAlchemy + MySQL backend for the Foodie ordering application.

## Run locally

1. Install Python 3.10+ and MySQL 8.
2. From this directory, copy `.env.example` to `.env`, then set the MySQL password and a private random `SECRET_KEY`. Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The secret must have at least 32 characters. For existing accounts, optionally list admin IDs in `ADMIN_USER_IDS` and kitchen IDs in `KITCHEN_USER_IDS` to assign those roles during startup. New registrations always receive the customer role.
3. Install dependencies and start the API:

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

   On startup, the backend creates the configured database and any missing tables from the SQLAlchemy models. It does not alter existing tables. For an existing database, update its tables to match `app/models/` before using the changed endpoints; alternatively, create a fresh database.
   For an existing database, apply `sql/migrations/2026_11_20_add_customer_and_order_address.sql` once to add saved profile and order addresses.
   For an existing database, also apply `sql/migrations/2026_11_20_add_dish_cloudinary_images.sql` once to add Cloudinary image fields to dishes.
   Apply `sql/migrations/2026_11_20_add_dish_categories.sql` once to create dish categories and connect dishes to them.
4. To load a local sample dataset, select the configured database and run `sql/seed_database.sql`. It adds sample dishes, categories, stock, recipes, menus, pickup slots, quotas, a demo customer, and a wallet. The script is safe to re-run and preserves existing stock quantities and wallet balances. The demo login is `demo@quickbite.local` / `Foodie@123`. To add sample order states for the Admin screens, run `sql/demo_data.sql` after the seed; it creates pending, confirmed, and cancelled examples and reconciles today's reserved quota with the sample orders.
5. For an existing database, run `sql/migrations/2026_11_26_seed_pickup_slots_and_index_orders.sql` to add any missing sample pickup slots and index orders by pickup date and slot. Run this migration once; its slot inserts are safe to re-run.

### Docker MySQL

From this directory, run `docker compose up -d`, then set `.env` to `DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_USER=app_user`, `DB_PASSWORD=app_password`, and `DB_NAME=app_db`. Start the backend once so SQLAlchemy creates the tables. Run `sql/demo_data.sql` manually afterward if you want sample data; it is not an initialization schema.

API docs: <http://127.0.0.1:8000/docs>
Health check: <http://127.0.0.1:8000/api/health>

## Order flow

- Register or log in through `/api/auth/register` or `/api/auth/login`; send the returned bearer token on authenticated requests.
- `GET /api/auth/me` returns the saved address. `PUT /api/auth/me` updates it with `{ "address": "..." }`.
- Roles are seeded with fixed IDs: `1=admin`, `2=kitchen`, `3=customer`. The `roles` and `user_roles` tables are created automatically. Existing users without a role become customers; IDs configured in `ADMIN_USER_IDS` or `KITCHEN_USER_IDS` are assigned their corresponding role. Admins can assign a role with `PUT /api/auth/users/{user_id}/role` and body `{ "role_id": 1|2|3 }`. Admins manage dishes and all orders; kitchen users see the active preparation queue and can move orders to `preparing` or `ready`; customers create and manage their own orders and wallet.
- Checkout preloads the profile address, lets customers edit and save it, and stores the effective address on the created order. If the checkout field is blank, the saved profile address is used.
- The customer pages in `../frontend` load dishes, remaining daily servings, pickup slots, the customer's wallet, and order history from the API.
- Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env` to enable dish image uploads. `CLOUDINARY_FOLDER` defaults to `quickbite/dishes`; the upload endpoint accepts JPG, PNG, and WebP images up to `CLOUDINARY_MAX_IMAGE_SIZE_MB` (10 MB by default). Admins upload through `POST /api/menu/dishes/{dish_id}/image` using multipart field `image`.
- Admin pages use `/api/categories`, `/api/ingredients`, `/api/recipes`, `/api/orders`, and `/api/users`; admin-only catalog, stock, recipe, and account endpoints require a bearer token with the admin role.
- `POST /api/orders` accepts `pickup_date`, `pickup_slot_id`, dish IDs and quantities, an optional note, and `payment_method: "wallet"` or `"cod"`. The server prices items from the database and atomically reserves capacity and configured recipe stock. Wallet orders are charged immediately; COD orders remain unpaid until collection.
- Send an `Idempotency-Key` header to safely retry an order request. Wallet top-ups, coupons, and bank payments are not implemented.
- Orders with recipes require a configured `Ingredient.stock_quantity`; null stock is treated as unavailable. Cancelling an eligible paid order refunds the wallet and restores tracked stock and pickup capacity.
- Customers can read and cancel only their own orders and can access only their own wallet. Administrative dish/menu mutations and staff order transitions require the caller's ID in `ADMIN_USER_IDS`.

## Tests

```powershell
pip install -r requirements-dev.txt
python -m pytest -q
```

The order service tests use an isolated SQLite database. MySQL-specific locking still needs verification against a running MySQL 8 instance.
