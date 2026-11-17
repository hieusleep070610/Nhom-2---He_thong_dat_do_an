-- Foodie demo data for MySQL 8.0.
-- Run after selecting your project database and creating the tables (start
-- the API once, or apply the project's schema). This script is safe to re-run.

-- Dishes shown by GET /api/menu/dishes.
INSERT INTO dishes (name, price, description, is_available)
VALUES
  ('Bún bò Huế', 55000, 'Nước dùng đậm đà, chuẩn vị cố đô.', TRUE),
  ('Cơm gà xối mỡ', 49000, 'Da gà giòn, cơm thơm.', TRUE),
  ('Salad cá hồi', 69000, 'Salad tươi với cá hồi áp chảo.', TRUE),
  ('Mì Ý bò bằm', 65000, 'Mì Ý sốt bò bằm cà chua.', TRUE),
  ('Gỏi cuốn tôm thịt', 39000, 'Gỏi cuốn tươi, kèm nước chấm.', TRUE),
  ('Bánh mì đặc biệt', 32000, 'Bánh mì giòn với nhân đặc biệt.', TRUE)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  description = VALUES(description),
  is_available = VALUES(is_available);

-- Menu quantities for today and the next seven days.
-- daily_menus has no unique key on (menu_date, dish_id), so NOT EXISTS keeps
-- this seed idempotent without changing the application's schema.
INSERT INTO daily_menus (menu_date, dish_id, quantity)
SELECT dates.menu_date, d.id,
       CASE d.name
         WHEN 'Bún bò Huế' THEN 24
         WHEN 'Cơm gà xối mỡ' THEN 30
         WHEN 'Salad cá hồi' THEN 16
         WHEN 'Mì Ý bò bằm' THEN 20
         WHEN 'Gỏi cuốn tôm thịt' THEN 28
         ELSE 22
       END
FROM dishes AS d
CROSS JOIN (
  SELECT DATE_ADD(CURDATE(), INTERVAL day_offset DAY) AS menu_date
  FROM (
    SELECT 0 AS day_offset UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL
    SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
    SELECT 6 UNION ALL SELECT 7
  ) AS offsets
) AS dates
WHERE d.name IN (
  'Bún bò Huế', 'Cơm gà xối mỡ', 'Salad cá hồi',
  'Mì Ý bò bằm', 'Gỏi cuốn tôm thịt', 'Bánh mì đặc biệt'
)
AND NOT EXISTS (
  SELECT 1 FROM daily_menus AS existing
  WHERE existing.menu_date = dates.menu_date AND existing.dish_id = d.id
);

-- Pickup slots. For dates without a SlotDailyQuota row the API uses each
-- slot's max_servings and treats booked_servings as zero.
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
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  max_servings = VALUES(max_servings),
  is_active = VALUES(is_active);

-- Create three orders for today: pending, confirmed and cancelled. The
-- cancelled sample is useful for verifying that cancelled orders don't use
-- up daily dish quantities. Phone values satisfy the model's MySQL CHECK.
INSERT INTO orders
  (code, customer_name, customer_phone, note, pickup_date, pickup_slot_id,
   status, total_amount)
SELECT CONCAT('DEMO-P-', DATE_FORMAT(CURDATE(), '%Y%m%d')),
       'Nguyễn Minh Anh', '0901234567', 'Đơn mẫu đang chờ xác nhận', CURDATE(), s.id,
       'pending', 104000
FROM pickup_slots AS s
WHERE s.label = '11:00'
  AND NOT EXISTS (
    SELECT 1 FROM orders WHERE code = CONCAT('DEMO-P-', DATE_FORMAT(CURDATE(), '%Y%m%d'))
  );

INSERT INTO orders
  (code, customer_name, customer_phone, note, pickup_date, pickup_slot_id,
   status, total_amount)
SELECT CONCAT('DEMO-C-', DATE_FORMAT(CURDATE(), '%Y%m%d')),
       'Trần Gia Huy', '0912345678', 'Đơn mẫu đã xác nhận', CURDATE(), s.id,
       'confirmed', 98000
FROM pickup_slots AS s
WHERE s.label = '11:00'
  AND NOT EXISTS (
    SELECT 1 FROM orders WHERE code = CONCAT('DEMO-C-', DATE_FORMAT(CURDATE(), '%Y%m%d'))
  );

INSERT INTO orders
  (code, customer_name, customer_phone, note, pickup_date, pickup_slot_id,
   status, total_amount)
SELECT CONCAT('DEMO-X-', DATE_FORMAT(CURDATE(), '%Y%m%d')),
       'Lê Thu Hà', '0987654321', 'Đơn mẫu đã hủy', CURDATE(), s.id,
       'cancelled', 130000
FROM pickup_slots AS s
WHERE s.label = '11:30'
  AND NOT EXISTS (
    SELECT 1 FROM orders WHERE code = CONCAT('DEMO-X-', DATE_FORMAT(CURDATE(), '%Y%m%d'))
  );

-- Add item snapshots only when the matching demo order is new/empty.
INSERT INTO order_items
  (order_id, item_code, item_name, unit_price, quantity, line_total)
SELECT o.id, CAST(d.id AS CHAR), d.name, d.price, item.quantity,
       d.price * item.quantity
FROM (
  SELECT CONCAT('DEMO-P-', DATE_FORMAT(CURDATE(), '%Y%m%d')) AS order_code,
         'Bún bò Huế' AS dish_name, 1 AS quantity
  UNION ALL
  SELECT CONCAT('DEMO-P-', DATE_FORMAT(CURDATE(), '%Y%m%d')), 'Cơm gà xối mỡ', 1
  UNION ALL
  SELECT CONCAT('DEMO-C-', DATE_FORMAT(CURDATE(), '%Y%m%d')), 'Cơm gà xối mỡ', 2
  UNION ALL
  SELECT CONCAT('DEMO-X-', DATE_FORMAT(CURDATE(), '%Y%m%d')), 'Mì Ý bò bằm', 2
) AS item
JOIN orders AS o ON o.code = item.order_code
JOIN dishes AS d ON d.name = item.dish_name
WHERE NOT EXISTS (
  SELECT 1 FROM order_items AS existing WHERE existing.order_id = o.id
);

-- Quotas for today: one slot has places left, one has filled, and the other
-- slots inherit their normal capacity. Quota rows are created once per date.
INSERT INTO slot_daily_quotas
  (pickup_slot_id, service_date, max_servings, booked_servings)
SELECT s.id, CURDATE(), s.max_servings,
       CASE s.label
         WHEN '10:30' THEN 5
         WHEN '11:00' THEN 4
         WHEN '12:00' THEN 20
         ELSE 0
       END
FROM pickup_slots AS s
WHERE NOT EXISTS (
  SELECT 1 FROM slot_daily_quotas AS q
  WHERE q.pickup_slot_id = s.id AND q.service_date = CURDATE()
);
