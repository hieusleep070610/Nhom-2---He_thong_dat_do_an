-- Seed sample pickup windows and optimize order lookup by pickup date and slot.
-- Safe to re-run: existing pickup slot settings are preserved.

INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
VALUES
    ('10:30', '10:30:00', '11:00:00', 20, 1),
    ('11:00', '11:00:00', '11:30:00', 20, 1),
    ('11:30', '11:30:00', '12:00:00', 16, 1),
    ('12:00', '12:00:00', '12:30:00', 20, 1),
    ('12:30', '12:30:00', '13:00:00', 16, 1),
    ('17:30', '17:30:00', '18:00:00', 20, 1),
    ('18:00', '18:00:00', '18:30:00', 20, 1),
    ('18:30', '18:30:00', '19:00:00', 16, 1)
ON DUPLICATE KEY UPDATE
    id = id;

CREATE INDEX ix_orders_pickup_date_slot
    ON orders (pickup_date, pickup_slot_id);
