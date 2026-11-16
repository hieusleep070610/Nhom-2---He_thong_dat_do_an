-- TF1ABCE: bang don hang, dong don, khung gio nhan va gioi han suat.
-- Chay trong MySQL Workbench (File -> Open SQL Script -> Execute)
-- hoac: mysql -u root -p --default-character-set=utf8mb4 < sql/tf1abce_orders.sql
--
-- pickup_slots.max_servings = so suat toi da MOI NGAY cho khung gio do.
-- slot_daily_quotas giu so suat da dat trong tung ngay.
-- Trigger chan don moi khi booked_servings = max_servings.
-- Huy hoac xoa don thi tra suat.

CREATE DATABASE IF NOT EXISTS quickbite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quickbite;

DROP TRIGGER IF EXISTS trg_orders_reserve_before_insert;
DROP TRIGGER IF EXISTS trg_orders_quota_before_update;
DROP TRIGGER IF EXISTS trg_orders_release_before_delete;
DROP TRIGGER IF EXISTS trg_order_items_total_after_insert;
DROP TRIGGER IF EXISTS trg_order_items_total_after_update;
DROP TRIGGER IF EXISTS trg_order_items_total_after_delete;
DROP PROCEDURE IF EXISTS sp_reserve_pickup_slot;
DROP PROCEDURE IF EXISTS sp_release_pickup_slot;
DROP VIEW IF EXISTS v_slot_availability;

CREATE TABLE IF NOT EXISTS pickup_slots (
  id BIGINT NOT NULL AUTO_INCREMENT,
  label CHAR(5) NOT NULL COMMENT 'Gio khach den nhan, vd 11:30',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_servings INT NOT NULL COMMENT 'Gioi han suat moi ngay cua khung gio',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pickup_slots_label (label),
  CONSTRAINT chk_pickup_slots_range CHECK (end_time > start_time),
  CONSTRAINT chk_pickup_slots_max CHECK (max_servings > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS slot_daily_quotas (
  id BIGINT NOT NULL AUTO_INCREMENT,
  pickup_slot_id BIGINT NOT NULL,
  service_date DATE NOT NULL,
  max_servings INT NOT NULL COMMENT 'Ban sao gioi han ap dung cho ngay nay',
  booked_servings INT NOT NULL DEFAULT 0 COMMENT 'So don con hieu luc da giu suat',
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_daily (pickup_slot_id, service_date),
  CONSTRAINT fk_slot_daily_slot
    FOREIGN KEY (pickup_slot_id) REFERENCES pickup_slots (id),
  CONSTRAINT chk_slot_daily_max CHECK (max_servings > 0),
  CONSTRAINT chk_slot_daily_booked CHECK (
    booked_servings >= 0 AND booked_servings <= max_servings
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  customer_name VARCHAR(80) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,
  note VARCHAR(200) NULL,
  pickup_date DATE NOT NULL,
  pickup_slot_id BIGINT NOT NULL,
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
    NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_code (code),
  KEY idx_orders_pickup (pickup_date, pickup_slot_id, status),
  CONSTRAINT fk_orders_pickup_slot
    FOREIGN KEY (pickup_slot_id) REFERENCES pickup_slots (id),
  CONSTRAINT chk_orders_phone CHECK (customer_phone REGEXP '^0[0-9]{8,10}$'),
  CONSTRAINT chk_orders_total CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  item_code VARCHAR(40) NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  unit_price DECIMAL(12, 0) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(12, 0) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT chk_order_items_price CHECK (unit_price > 0),
  CONSTRAINT chk_order_items_qty CHECK (quantity BETWEEN 1 AND 10),
  CONSTRAINT chk_order_items_line_total CHECK (line_total = unit_price * quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE PROCEDURE sp_reserve_pickup_slot(IN p_slot_id BIGINT, IN p_date DATE)
BEGIN
  DECLARE v_max INT;
  DECLARE v_active TINYINT;
  DECLARE v_before INT;
  DECLARE v_after INT;

  DECLARE EXIT HANDLER FOR NOT FOUND
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khung gio nhan khong ton tai';
  END;

  SELECT max_servings, is_active
    INTO v_max, v_active
  FROM pickup_slots
  WHERE id = p_slot_id;

  IF v_active = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khung gio nhan dang tat';
  END IF;

  INSERT INTO slot_daily_quotas (pickup_slot_id, service_date, max_servings, booked_servings)
  VALUES (p_slot_id, p_date, v_max, 0) AS incoming
  ON DUPLICATE KEY UPDATE
    max_servings = IF(
      incoming.max_servings >= slot_daily_quotas.booked_servings,
      incoming.max_servings,
      slot_daily_quotas.max_servings
    );

  SELECT booked_servings
    INTO v_before
  FROM slot_daily_quotas
  WHERE pickup_slot_id = p_slot_id AND service_date = p_date
  FOR UPDATE;

  UPDATE slot_daily_quotas
  SET booked_servings = booked_servings + 1
  WHERE pickup_slot_id = p_slot_id
    AND service_date = p_date
    AND booked_servings < max_servings;

  SELECT booked_servings
    INTO v_after
  FROM slot_daily_quotas
  WHERE pickup_slot_id = p_slot_id AND service_date = p_date;

  IF v_after = v_before THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khung gio da het suat trong ngay';
  END IF;
END$$

CREATE PROCEDURE sp_release_pickup_slot(IN p_slot_id BIGINT, IN p_date DATE)
BEGIN
  DECLARE v_before INT;

  DECLARE EXIT HANDLER FOR NOT FOUND
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong co suat da giu de tra';
  END;

  SELECT booked_servings
    INTO v_before
  FROM slot_daily_quotas
  WHERE pickup_slot_id = p_slot_id AND service_date = p_date
  FOR UPDATE;

  IF v_before <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong co suat da giu de tra';
  END IF;

  UPDATE slot_daily_quotas
  SET booked_servings = booked_servings - 1
  WHERE pickup_slot_id = p_slot_id
    AND service_date = p_date
    AND booked_servings = v_before;
END$$

CREATE TRIGGER trg_orders_reserve_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.status <> 'cancelled' THEN
    CALL sp_reserve_pickup_slot(NEW.pickup_slot_id, NEW.pickup_date);
  END IF;
END$$

CREATE TRIGGER trg_orders_quota_before_update
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_old_active TINYINT DEFAULT (OLD.status <> 'cancelled');
  DECLARE v_new_active TINYINT DEFAULT (NEW.status <> 'cancelled');
  DECLARE v_same_slot TINYINT DEFAULT (
    OLD.pickup_slot_id = NEW.pickup_slot_id AND OLD.pickup_date = NEW.pickup_date
  );

  IF v_old_active = 1 AND v_new_active = 0 THEN
    CALL sp_release_pickup_slot(OLD.pickup_slot_id, OLD.pickup_date);
  ELSEIF v_old_active = 0 AND v_new_active = 1 THEN
    CALL sp_reserve_pickup_slot(NEW.pickup_slot_id, NEW.pickup_date);
  ELSEIF v_old_active = 1 AND v_new_active = 1 AND v_same_slot = 0 THEN
    CALL sp_release_pickup_slot(OLD.pickup_slot_id, OLD.pickup_date);
    CALL sp_reserve_pickup_slot(NEW.pickup_slot_id, NEW.pickup_date);
  END IF;
END$$

CREATE TRIGGER trg_orders_release_before_delete
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status <> 'cancelled' THEN
    CALL sp_release_pickup_slot(OLD.pickup_slot_id, OLD.pickup_date);
  END IF;
END$$

CREATE TRIGGER trg_order_items_total_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders
  SET total_amount = total_amount + NEW.line_total
  WHERE id = NEW.order_id;
END$$

CREATE TRIGGER trg_order_items_total_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
  IF OLD.order_id = NEW.order_id THEN
    UPDATE orders
    SET total_amount = total_amount - OLD.line_total + NEW.line_total
    WHERE id = NEW.order_id;
  ELSE
    UPDATE orders
    SET total_amount = total_amount - OLD.line_total
    WHERE id = OLD.order_id;
    UPDATE orders
    SET total_amount = total_amount + NEW.line_total
    WHERE id = NEW.order_id;
  END IF;
END$$

CREATE TRIGGER trg_order_items_total_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders
  SET total_amount = total_amount - OLD.line_total
  WHERE id = OLD.order_id;
END$$

DELIMITER ;

-- Khung 30 phut, 10:30-19:00, khop trang dat mon.
-- Suat cao hon vao gio trua va gio chieu.
INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active) VALUES
  ('10:30', '10:30:00', '11:00:00', 15, 1),
  ('11:00', '11:00:00', '11:30:00', 20, 1),
  ('11:30', '11:30:00', '12:00:00', 30, 1),
  ('12:00', '12:00:00', '12:30:00', 30, 1),
  ('12:30', '12:30:00', '13:00:00', 30, 1),
  ('13:00', '13:00:00', '13:30:00', 20, 1),
  ('13:30', '13:30:00', '14:00:00', 15, 1),
  ('14:00', '14:00:00', '14:30:00', 15, 1),
  ('14:30', '14:30:00', '15:00:00', 15, 1),
  ('15:00', '15:00:00', '15:30:00', 15, 1),
  ('15:30', '15:30:00', '16:00:00', 15, 1),
  ('16:00', '16:00:00', '16:30:00', 15, 1),
  ('16:30', '16:30:00', '17:00:00', 15, 1),
  ('17:00', '17:00:00', '17:30:00', 20, 1),
  ('17:30', '17:30:00', '18:00:00', 25, 1),
  ('18:00', '18:00:00', '18:30:00', 25, 1),
  ('18:30', '18:30:00', '19:00:00', 25, 1),
  ('19:00', '19:00:00', '19:30:00', 15, 1)
ON DUPLICATE KEY UPDATE
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  max_servings = VALUES(max_servings),
  is_active = VALUES(is_active);

CREATE OR REPLACE VIEW v_slot_availability AS
SELECT
  ps.id AS pickup_slot_id,
  ps.label,
  ps.start_time,
  ps.end_time,
  ps.is_active,
  q.service_date,
  COALESCE(q.max_servings, ps.max_servings) AS max_servings,
  COALESCE(q.booked_servings, 0) AS booked_servings,
  COALESCE(q.max_servings, ps.max_servings) - COALESCE(q.booked_servings, 0) AS remaining_servings
FROM pickup_slots ps
LEFT JOIN slot_daily_quotas q ON q.pickup_slot_id = ps.id;
