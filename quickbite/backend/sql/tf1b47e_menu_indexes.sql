-- =============================================================================
-- TF1B47E: [BE] Tối ưu truy vấn thực đơn — Migration thêm Index cho MySQL
-- =============================================================================
-- Mục tiêu:
--   1. Composite index (menu_date, dish_id) trên daily_menus
--      → tối ưu truy vấn "SELECT * FROM daily_menus WHERE menu_date = ?"
--      → MySQL dùng index covering scan thay vì full table scan
--   2. Index riêng is_available trên dishes
--      → tối ưu filter "WHERE is_available = 1" thường xuyên được dùng
--
-- Thực thi:
--   mysql -u root -p quickbite_db_demo < sql/tf1b47e_menu_indexes.sql
-- =============================================================================

USE quickbite_db_demo;

-- 1. Composite index: truy vấn thực đơn theo ngày
--    Nếu index đã tồn tại thì bỏ qua (tránh lỗi khi chạy lại)
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name   = 'daily_menus'
      AND index_name   = 'ix_daily_menus_date_dish'
);

SET @sql_create_idx1 = IF(
    @idx_exists = 0,
    'CREATE INDEX ix_daily_menus_date_dish ON daily_menus (menu_date, dish_id)',
    'SELECT "Index ix_daily_menus_date_dish already exists, skipped." AS info'
);
PREPARE stmt1 FROM @sql_create_idx1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Index riêng is_available trên dishes
SET @idx2_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name   = 'dishes'
      AND index_name   = 'ix_dishes_is_available'
);

SET @sql_create_idx2 = IF(
    @idx2_exists = 0,
    'CREATE INDEX ix_dishes_is_available ON dishes (is_available)',
    'SELECT "Index ix_dishes_is_available already exists, skipped." AS info'
);
PREPARE stmt2 FROM @sql_create_idx2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- =============================================================================
-- Kiểm tra kết quả: xem các index hiện có trên hai bảng
-- =============================================================================
SHOW INDEX FROM daily_menus;
SHOW INDEX FROM dishes;

-- =============================================================================
-- Đo EXPLAIN trước và sau khi thêm index (ví dụ truy vấn điển hình)
-- =============================================================================
-- Truy vấn thực đơn theo ngày (sẽ dùng ix_daily_menus_date_dish):
EXPLAIN SELECT dm.id, dm.quantity, d.name, d.price, d.is_available
        FROM daily_menus dm
        JOIN dishes d ON d.id = dm.dish_id
        WHERE dm.menu_date = CURDATE()
          AND d.is_available = 1;

-- Kỳ vọng sau khi thêm index:
--   type: ref | range  (không còn ALL)
--   key : ix_daily_menus_date_dish
--   rows: << số hàng toàn bảng
