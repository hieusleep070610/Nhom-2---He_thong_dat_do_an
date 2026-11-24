-- Add saved customer addresses and preserve the address used for each order.
-- Run once against an existing database; fresh databases get these columns
-- automatically from the SQLAlchemy models.
ALTER TABLE users ADD COLUMN address VARCHAR(500) NULL;
ALTER TABLE orders ADD COLUMN delivery_address VARCHAR(500) NULL;
