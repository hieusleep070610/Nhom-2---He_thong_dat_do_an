-- TF1ABCE: bang test case. Chay SAU sql/tf1abce_orders.sql.
-- Ket qua nam o bang tf1abce_test_results. Du lieu thu duoc xoa cuoi file.

USE quickbite;

DROP TABLE IF EXISTS tf1abce_test_results;
CREATE TABLE tf1abce_test_results (
  id INT NOT NULL AUTO_INCREMENT,
  test_code VARCHAR(10) NOT NULL,
  description VARCHAR(255) NOT NULL,
  expected VARCHAR(255) NOT NULL,
  actual VARCHAR(255) NOT NULL,
  result VARCHAR(10) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS tf1abce_tc01;
DROP PROCEDURE IF EXISTS tf1abce_tc02;
DROP PROCEDURE IF EXISTS tf1abce_tc03;
DROP PROCEDURE IF EXISTS tf1abce_tc04;
DROP PROCEDURE IF EXISTS tf1abce_tc05;
DROP PROCEDURE IF EXISTS tf1abce_tc06;
DROP PROCEDURE IF EXISTS tf1abce_tc07;
DROP PROCEDURE IF EXISTS tf1abce_tc08;
DROP PROCEDURE IF EXISTS tf1abce_tc09;

DELIMITER $$

CREATE PROCEDURE tf1abce_tc01()
BEGIN
  DECLARE v_id BIGINT;
  DECLARE v_slot BIGINT;
  DECLARE v_total DECIMAL(12, 0);
  DECLARE v_booked INT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES ('TC01', 'Dat don 2 mon va giu 1 suat', 'Tong 55000, booked = 1', LEFT(v_msg, 255), 'FAIL');
  END;

  SELECT id INTO v_slot FROM pickup_slots WHERE label = '11:30';
  INSERT INTO orders (code, customer_name, customer_phone, note, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC01', 'Nguyen Van A', '0901234567', 'It cay', '2099-11-13', v_slot);
  SET v_id = LAST_INSERT_ID();
  INSERT INTO order_items (order_id, item_code, item_name, unit_price, quantity, line_total) VALUES
    (v_id, 'com-ga', 'Com ga xoi mo', 45000, 1, 45000),
    (v_id, 'tra-da', 'Tra da', 5000, 2, 10000);

  SELECT total_amount INTO v_total FROM orders WHERE id = v_id;
  SELECT booked_servings INTO v_booked
  FROM slot_daily_quotas
  WHERE pickup_slot_id = v_slot AND service_date = '2099-11-13';

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES (
    'TC01',
    'Dat don 2 mon va giu 1 suat',
    'Tong 55000, booked = 1',
    CONCAT('Tong ', v_total, ', booked = ', v_booked),
    IF(v_total = 55000 AND v_booked = 1, 'PASS', 'FAIL')
  );
END$$

CREATE PROCEDURE tf1abce_tc02()
BEGIN
  DECLARE v_id BIGINT;
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC02',
      'Tu choi dong don co thanh tien sai',
      'Vi pham chk_order_items_line_total',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%chk_order_items_line_total%', 'PASS', 'FAIL')
    );
  END;

  SELECT id INTO v_slot FROM pickup_slots WHERE label = '12:00';
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC02', 'Nguyen Van B', '0912345678', '2099-11-13', v_slot);
  SET v_id = LAST_INSERT_ID();
  INSERT INTO order_items (order_id, item_code, item_name, unit_price, quantity, line_total)
  VALUES (v_id, 'com-ga', 'Com ga xoi mo', 45000, 1, 1);

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC02', 'Tu choi dong don co thanh tien sai', 'Vi pham chk_order_items_line_total', 'Duoc chap nhan', 'FAIL');
END$$

CREATE PROCEDURE tf1abce_tc03()
BEGIN
  DECLARE v_id BIGINT;
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC03',
      'Tu choi so luong ngoai 1..10',
      'Vi pham chk_order_items_qty',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%chk_order_items_qty%', 'PASS', 'FAIL')
    );
  END;

  SELECT id INTO v_slot FROM pickup_slots WHERE label = '12:30';
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC03', 'Nguyen Van C', '0987654321', '2099-11-13', v_slot);
  SET v_id = LAST_INSERT_ID();
  INSERT INTO order_items (order_id, item_code, item_name, unit_price, quantity, line_total)
  VALUES (v_id, 'banh-mi', 'Banh mi thit', 25000, 11, 275000);

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC03', 'Tu choi so luong ngoai 1..10', 'Vi pham chk_order_items_qty', 'Duoc chap nhan', 'FAIL');
END$$

CREATE PROCEDURE tf1abce_tc04()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC04',
      'Tu choi don khi het suat',
      'Khung gio da het suat trong ngay',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%het suat%', 'PASS', 'FAIL')
    );
  END;

  INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
  VALUES ('ZFULL', '09:00:00', '09:30:00', 1, 1);
  SET v_slot = LAST_INSERT_ID();

  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC04A', 'Nguyen Van D', '0900000001', '2099-11-13', v_slot);
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC04B', 'Nguyen Van E', '0900000002', '2099-11-13', v_slot);

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC04', 'Tu choi don khi het suat', 'Khung gio da het suat trong ngay', 'Don thu 2 duoc nhan', 'FAIL');
END$$

CREATE PROCEDURE tf1abce_tc05()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_after_cancel INT;
  DECLARE v_after_rebook INT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES ('TC05', 'Huy don tra suat, dat lai duoc', 'Sau huy booked = 0, dat lai booked = 1', LEFT(v_msg, 255), 'FAIL');
  END;

  INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
  VALUES ('ZCANC', '09:30:00', '10:00:00', 1, 1);
  SET v_slot = LAST_INSERT_ID();

  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC05A', 'Nguyen Van F', '0900000003', '2099-11-13', v_slot);
  UPDATE orders SET status = 'cancelled' WHERE code = 'TF1ABCE-TC05A';
  SELECT booked_servings INTO v_after_cancel
  FROM slot_daily_quotas
  WHERE pickup_slot_id = v_slot AND service_date = '2099-11-13';

  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC05B', 'Nguyen Van G', '0900000004', '2099-11-13', v_slot);
  SELECT booked_servings INTO v_after_rebook
  FROM slot_daily_quotas
  WHERE pickup_slot_id = v_slot AND service_date = '2099-11-13';

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES (
    'TC05',
    'Huy don tra suat, dat lai duoc',
    'Sau huy booked = 0, dat lai booked = 1',
    CONCAT('Sau huy ', v_after_cancel, ', dat lai ', v_after_rebook),
    IF(v_after_cancel = 0 AND v_after_rebook = 1, 'PASS', 'FAIL')
  );
END$$

CREATE PROCEDURE tf1abce_tc06()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC06',
      'Tu choi khung gio dang tat',
      'Khung gio nhan dang tat',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%dang tat%', 'PASS', 'FAIL')
    );
  END;

  INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
  VALUES ('ZOFF', '08:00:00', '08:30:00', 5, 0);
  SET v_slot = LAST_INSERT_ID();
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC06', 'Nguyen Van H', '0900000005', '2099-11-13', v_slot);

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC06', 'Tu choi khung gio dang tat', 'Khung gio nhan dang tat', 'Don duoc nhan', 'FAIL');
END$$

CREATE PROCEDURE tf1abce_tc07()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_before INT;
  DECLARE v_after INT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES ('TC07', 'Xoa don dang hieu luc thi tra suat', 'Truoc xoa 1, sau xoa 0', LEFT(v_msg, 255), 'FAIL');
  END;

  INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
  VALUES ('ZDEL', '08:30:00', '09:00:00', 3, 1);
  SET v_slot = LAST_INSERT_ID();
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC07', 'Nguyen Van I', '0900000006', '2099-11-13', v_slot);
  SELECT booked_servings INTO v_before
  FROM slot_daily_quotas
  WHERE pickup_slot_id = v_slot AND service_date = '2099-11-13';

  DELETE FROM orders WHERE code = 'TF1ABCE-TC07';
  SELECT booked_servings INTO v_after
  FROM slot_daily_quotas
  WHERE pickup_slot_id = v_slot AND service_date = '2099-11-13';

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES (
    'TC07',
    'Xoa don dang hieu luc thi tra suat',
    'Truoc xoa 1, sau xoa 0',
    CONCAT('Truoc xoa ', v_before, ', sau xoa ', v_after),
    IF(v_before = 1 AND v_after = 0, 'PASS', 'FAIL')
  );
END$$

CREATE PROCEDURE tf1abce_tc08()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC08',
      'Khong xoa khung gio con don',
      'Chan khoa ngoai orders',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%foreign key%', 'PASS', 'FAIL')
    );
  END;

  INSERT INTO pickup_slots (label, start_time, end_time, max_servings, is_active)
  VALUES ('ZFK', '07:30:00', '08:00:00', 5, 1);
  SET v_slot = LAST_INSERT_ID();
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC08', 'Nguyen Van K', '0900000007', '2099-11-13', v_slot);
  DELETE FROM pickup_slots WHERE id = v_slot;

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC08', 'Khong xoa khung gio con don', 'Chan khoa ngoai orders', 'Xoa duoc khung gio', 'FAIL');
END$$

CREATE PROCEDURE tf1abce_tc09()
BEGIN
  DECLARE v_slot BIGINT;
  DECLARE v_msg TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
    INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
    VALUES (
      'TC09',
      'Tu choi ma don trung',
      'Trung uq_orders_code',
      LEFT(v_msg, 255),
      IF(v_msg LIKE '%uq_orders_code%', 'PASS', 'FAIL')
    );
  END;

  SELECT id INTO v_slot FROM pickup_slots WHERE label = '13:00';
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC09', 'Nguyen Van L', '0900000008', '2099-11-13', v_slot);
  INSERT INTO orders (code, customer_name, customer_phone, pickup_date, pickup_slot_id)
  VALUES ('TF1ABCE-TC09', 'Nguyen Van M', '0900000009', '2099-11-13', v_slot);

  INSERT INTO tf1abce_test_results (test_code, description, expected, actual, result)
  VALUES ('TC09', 'Tu choi ma don trung', 'Trung uq_orders_code', 'Ma trung duoc nhan', 'FAIL');
END$$

DELIMITER ;

CALL tf1abce_tc01();
CALL tf1abce_tc02();
CALL tf1abce_tc03();
CALL tf1abce_tc04();
CALL tf1abce_tc05();
CALL tf1abce_tc06();
CALL tf1abce_tc07();
CALL tf1abce_tc08();
CALL tf1abce_tc09();

DELETE FROM orders WHERE code LIKE 'TF1ABCE-%';
DELETE q FROM slot_daily_quotas q
INNER JOIN pickup_slots s ON s.id = q.pickup_slot_id
WHERE s.label LIKE 'Z%' OR q.service_date = '2099-11-13';
DELETE FROM pickup_slots WHERE label LIKE 'Z%';

SELECT test_code, description, expected, actual, result
FROM tf1abce_test_results
ORDER BY test_code;

SELECT COUNT(*) AS slot_count FROM pickup_slots WHERE label NOT LIKE 'Z%';
SELECT label, max_servings
FROM pickup_slots
WHERE label IN ('10:30', '11:30', '12:00', '17:30', '19:00')
ORDER BY label;

DROP PROCEDURE IF EXISTS tf1abce_tc01;
DROP PROCEDURE IF EXISTS tf1abce_tc02;
DROP PROCEDURE IF EXISTS tf1abce_tc03;
DROP PROCEDURE IF EXISTS tf1abce_tc04;
DROP PROCEDURE IF EXISTS tf1abce_tc05;
DROP PROCEDURE IF EXISTS tf1abce_tc06;
DROP PROCEDURE IF EXISTS tf1abce_tc07;
DROP PROCEDURE IF EXISTS tf1abce_tc08;
DROP PROCEDURE IF EXISTS tf1abce_tc09;
