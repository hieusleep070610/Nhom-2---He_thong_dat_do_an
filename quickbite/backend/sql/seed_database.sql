-- QuickBite sample data for local development. Safe to re-run: inserts missing
-- rows, preserves existing dish/category/stock/slot settings and wallet balance.
-- Select your QuickBite database in MySQL Workbench/phpMyAdmin before running.
-- Demo login: demo@quickbite.local / Foodie@123
-- For a database created before customer/order address fields were added,
-- run migrations/2026_11_20_add_customer_and_order_address.sql first.

START TRANSACTION;

-- Sample customer. INSERT IGNORE leaves an existing account unchanged.
INSERT IGNORE INTO users (email, phone, password, full_name, address)
VALUES (
  'demo@quickbite.local',
  '0900000001',
  '$2b$12$/AUrmM1Ep3dXzBNJ5TaRJOzu/PhcEpqVMmN6/aJsQcxpWlkkiHW2u',
  'Khách hàng demo',
  '12 Nguyễn Huệ, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
);

-- Fixed role IDs: 1=admin, 2=kitchen, 3=customer. Each account has one role.
INSERT INTO roles (id, name, description)
VALUES
  (1, 'admin', 'Quản trị toàn hệ thống'),
  (2, 'kitchen', 'Xử lý đơn hàng tại bếp'),
  (3, 'customer', 'Đặt món và quản lý đơn cá nhân')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

-- The demo account receives customer role ID 3 if it has no role yet.
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT user_id, 3 FROM users WHERE email = 'demo@quickbite.local';

-- Sample dishes.
INSERT INTO dishes (name, price, description, is_available)
VALUES
  ('Bún bò Huế', 55000, 'Nước dùng đậm đà, chuẩn vị cố đô.', TRUE),
  ('Cơm gà xối mỡ', 49000, 'Da gà giòn, cơm thơm.', TRUE),
  ('Salad cá hồi', 69000, 'Salad tươi với cá hồi áp chảo.', TRUE),
  ('Mì Ý bò bằm', 65000, 'Mì Ý sốt bò bằm cà chua.', TRUE),
  ('Gỏi cuốn tôm thịt', 39000, 'Gỏi cuốn tươi, kèm nước chấm.', TRUE),
  ('Bánh mì đặc biệt', 32000, 'Bánh mì giòn với nhân đặc biệt.', TRUE),
  ('Trà đào cam sả', 35000, 'Trà trái cây thanh mát, cam tươi và sả.', TRUE),
  ('Bánh flan', 18000, 'Bánh flan mềm mịn, dùng lạnh.', TRUE)
ON DUPLICATE KEY UPDATE
  id = id;

-- Categories for the seeded menu. Existing category settings are preserved.
INSERT INTO dish_categories (name, description, is_active)
VALUES
  ('Cơm', 'Cơm nóng và các món ăn kèm.', TRUE),
  ('Bún & phở', 'Món bún, phở và nước dùng Việt.', TRUE),
  ('Mì & pasta', 'Mì sợi và pasta chế biến theo món.', TRUE),
  ('Salad', 'Rau tươi và nguyên liệu theo mùa.', TRUE),
  ('Đồ uống', 'Trà trái cây và thức uống.', TRUE),
  ('Ăn nhẹ', 'Món ăn nhẹ và món cuốn.', TRUE),
  ('Tráng miệng', 'Bánh và món ngọt.', TRUE),
  ('Khác', 'Các món ăn khác trong thực đơn.', TRUE)
ON DUPLICATE KEY UPDATE
  id = id;

-- Link menu items to categories without changing their availability.
UPDATE dishes AS d
JOIN dish_categories AS c ON c.name = CASE
  WHEN d.name LIKE 'Cơm%' THEN 'Cơm'
  WHEN d.name LIKE 'Bún%' THEN 'Bún & phở'
  WHEN d.name LIKE 'Mì%' THEN 'Mì & pasta'
  WHEN d.name LIKE 'Salad%' THEN 'Salad'
  WHEN d.name LIKE 'Trà%' THEN 'Đồ uống'
  WHEN d.name LIKE 'Bánh flan%' THEN 'Tráng miệng'
  WHEN d.name LIKE 'Gỏi%' OR d.name LIKE 'Bánh mì%' THEN 'Ăn nhẹ'
  ELSE 'Khác'
END
SET d.category_id = c.id
WHERE d.name IN (
  'Cơm gà xối mỡ', 'cơm rang trứng', 'Bún bò Huế', 'Mì Ý bò bằm',
  'Salad cá hồi', 'Trà đào cam sả', 'Bánh flan', 'Gỏi cuốn tôm thịt',
  'Bánh mì đặc biệt'
)
AND d.category_id IS NULL;

-- Ingredients and initial stock. Existing stock is preserved on re-run.
INSERT INTO Ingredient
  (Ingredient_Name, Unit, min_stock, stock_quantity, is_active)
VALUES
  ('Gạo', 'g', 1000, 20000, TRUE),
  ('Thịt gà', 'g', 500, 10000, TRUE),
  ('Bún tươi', 'g', 500, 10000, TRUE),
  ('Thịt bò', 'g', 500, 10000, TRUE),
  ('Rau xanh', 'g', 500, 10000, TRUE),
  ('Cá hồi', 'g', 300, 5000, TRUE),
  ('Bánh mì', 'ổ', 20, 500, TRUE),
  ('Tôm', 'g', 300, 5000, TRUE),
  ('Trà đen', 'g', 100, 1000, TRUE),
  ('Cam', 'g', 500, 5000, TRUE),
  ('Sả', 'g', 100, 2000, TRUE),
  ('Syrup đường', 'ml', 500, 5000, TRUE),
  ('Trứng gà', 'quả', 30, 300, TRUE),
  ('Sữa tươi', 'ml', 1000, 10000, TRUE),
  ('Sữa đặc', 'ml', 500, 5000, TRUE)
ON DUPLICATE KEY UPDATE
  Ingredient_ID = Ingredient_ID;

-- Recipes are added only when that dish/ingredient pair is not present.
INSERT INTO Dish_Ingredient (Dish_ID, Ingredient_ID, Quantity)
SELECT d.id, i.Ingredient_ID, recipe.Quantity
FROM (
  SELECT 'Cơm gà xối mỡ' AS dish_name, 'Gạo' AS ingredient_name, 180 AS Quantity
  UNION ALL SELECT 'Cơm gà xối mỡ', 'Thịt gà', 220
  UNION ALL SELECT 'Bún bò Huế', 'Bún tươi', 250
  UNION ALL SELECT 'Bún bò Huế', 'Thịt bò', 120
  UNION ALL SELECT 'Bún bò Huế', 'Rau xanh', 80
  UNION ALL SELECT 'Mì Ý bò bằm', 'Thịt bò', 150
  UNION ALL SELECT 'Salad cá hồi', 'Cá hồi', 160
  UNION ALL SELECT 'Salad cá hồi', 'Rau xanh', 120
  UNION ALL SELECT 'Gỏi cuốn tôm thịt', 'Tôm', 80
  UNION ALL SELECT 'Gỏi cuốn tôm thịt', 'Rau xanh', 60
  UNION ALL SELECT 'Bánh mì đặc biệt', 'Bánh mì', 1
  UNION ALL SELECT 'Bánh mì đặc biệt', 'Thịt gà', 80
  UNION ALL SELECT 'Trà đào cam sả', 'Trà đen', 5
  UNION ALL SELECT 'Trà đào cam sả', 'Cam', 50
  UNION ALL SELECT 'Trà đào cam sả', 'Sả', 10
  UNION ALL SELECT 'Trà đào cam sả', 'Syrup đường', 20
  UNION ALL SELECT 'Bánh flan', 'Trứng gà', 1
  UNION ALL SELECT 'Bánh flan', 'Sữa tươi', 100
  UNION ALL SELECT 'Bánh flan', 'Sữa đặc', 25
  UNION ALL SELECT 'cơm rang trứng', 'Gạo', 180
  UNION ALL SELECT 'cơm rang trứng', 'Trứng gà', 1
) AS recipe
JOIN dishes AS d ON d.name = recipe.dish_name
JOIN Ingredient AS i ON i.Ingredient_Name = recipe.ingredient_name
WHERE NOT EXISTS (
  SELECT 1 FROM Dish_Ingredient AS existing
  WHERE existing.Dish_ID = d.id AND existing.Ingredient_ID = i.Ingredient_ID
);

-- Pickup slots used by checkout.
INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
VALUES
  ('10:30', '10:30:00', '11:00:00', 20, 1),
  ('11:00', '11:00:00', '11:30:00', 20, 1),
  ('11:30', '11:30:00', '12:00:00', 16, 1),
  ('12:00', '12:00:00', '12:30:00', 20, 1),
  ('17:30', '17:30:00', '18:00:00', 20, 1),
  ('18:00', '18:00:00', '18:30:00', 20, 1),
  ('18:30', '18:30:00', '19:00:00', 16, 1)
ON DUPLICATE KEY UPDATE
  id = id;

-- Add these dishes to the next seven days without duplicating existing menus.
INSERT INTO daily_menus (menu_date, dish_id, quantity)
SELECT dates.menu_date, d.id,
       CASE d.name
         WHEN 'Bún bò Huế' THEN 24
         WHEN 'Cơm gà xối mỡ' THEN 30
         WHEN 'Salad cá hồi' THEN 16
         WHEN 'Mì Ý bò bằm' THEN 20
         WHEN 'Trà đào cam sả' THEN 24
         WHEN 'Bánh flan' THEN 30
         WHEN 'Gỏi cuốn tôm thịt' THEN 28
         ELSE 22
       END
FROM dishes AS d
CROSS JOIN (
  SELECT DATE_ADD(CURDATE(), INTERVAL day_offset DAY) AS menu_date
  FROM (
    SELECT 0 AS day_offset UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL
    SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  ) AS offsets
) AS dates
WHERE d.name IN (
  'Bún bò Huế', 'Cơm gà xối mỡ', 'Salad cá hồi',
  'Mì Ý bò bằm', 'Gỏi cuốn tôm thịt', 'Bánh mì đặc biệt',
  'Trà đào cam sả', 'Bánh flan', 'cơm rang trứng'
)
AND NOT EXISTS (
  SELECT 1 FROM daily_menus AS existing
  WHERE existing.menu_date = dates.menu_date AND existing.dish_id = d.id
);

-- One active wallet for the demo account. Existing balance is preserved.
INSERT INTO Wallet (User_ID, Balance, Status)
SELECT user_id, 1000000, 'ACTIVE'
FROM users
WHERE email = 'demo@quickbite.local'
ON DUPLICATE KEY UPDATE Wallet_ID = Wallet_ID;

-- Create daily pickup quotas for today and the next six days.
INSERT INTO slot_daily_quotas
  (pickup_slot_id, service_date, max_servings, booked_servings)
SELECT s.id, dates.service_date, s.max_servings, 0
FROM pickup_slots AS s
CROSS JOIN (
  SELECT DATE_ADD(CURDATE(), INTERVAL day_offset DAY) AS service_date
  FROM (
    SELECT 0 AS day_offset UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL
    SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  ) AS offsets
) AS dates
WHERE s.is_active = 1
AND NOT EXISTS (
  SELECT 1 FROM slot_daily_quotas AS existing
  WHERE existing.pickup_slot_id = s.id AND existing.service_date = dates.service_date
);

COMMIT;
