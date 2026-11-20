# Foodie backend

FastAPI + SQLAlchemy + MySQL backend for the Foodie ordering application.

## Run locally

1. Install Python 3.10+ and MySQL 8.
2. From this directory, copy `.env.example` to `.env`, then set the MySQL password and a private random `SECRET_KEY`. Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The secret must have at least 32 characters. Put trusted admin user IDs, comma-separated, in `ADMIN_USER_IDS` to enable dish/menu and staff order management APIs.
3. Install dependencies and start the API:

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

   On startup, the backend creates the configured database and any missing tables from the SQLAlchemy models. It does not alter existing tables. For an existing database, update its tables to match `app/models/` before using the changed endpoints; alternatively, create a fresh database.
4. Optionally run `sql/demo_data.sql` to add sample dishes, menus, pickup slots, quotas, and orders.

### Docker MySQL

From this directory, run `docker compose up -d`, then set `.env` to `DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_USER=app_user`, `DB_PASSWORD=app_password`, and `DB_NAME=app_db`. Start the backend once so SQLAlchemy creates the tables. Run `sql/demo_data.sql` manually afterward if you want sample data; it is not an initialization schema.

API docs: <http://127.0.0.1:8000/docs>
Health check: <http://127.0.0.1:8000/api/health>

## Order flow

- Register or log in through `/api/auth/register` or `/api/auth/login`; send the returned bearer token on authenticated requests.
- The customer pages in `../frontend` load dishes, remaining daily servings, pickup slots, the customer's wallet, and order history from the API.
- `POST /api/orders` accepts `pickup_date`, `pickup_slot_id`, dish IDs and quantities, an optional note, and `payment_method: "wallet"`. The server prices items from the database and atomically reserves capacity, deducts an active wallet, tracks configured recipe stock, and creates the order history record.
- Send an `Idempotency-Key` header to safely retry an order request. Wallet top-ups, coupons, COD, and bank payments are not implemented.
- Orders with recipes require a configured `Ingredient.stock_quantity`; null stock is treated as unavailable. Cancelling an eligible paid order refunds the wallet and restores tracked stock and pickup capacity.
- Customers can read and cancel only their own orders and can access only their own wallet. Administrative dish/menu mutations and staff order transitions require the caller's ID in `ADMIN_USER_IDS`.

## Tests

```powershell
pip install -r requirements-dev.txt
python -m pytest -q
```

The order service tests use an isolated SQLite database. MySQL-specific locking still needs verification against a running MySQL 8 instance.
