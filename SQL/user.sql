CREATE TABLE IF NOT EXISTS login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'pharmacist' -- รองรับบทบาท: admin, chief, pharmacist
);

-- เพิ่ม User ตัวอย่าง (User: admin / Pass: 1234)
INSERT INTO login (employee_id, username, password, role) 
VALUES ('0000', 'admin', '1234', 'admin');

-- เพิ่ม User ตัวอย่าง หัวหน้าเภสัชกร (User: chief_user / Pass: 1234)
INSERT INTO login (employee_id, username, password, role) 
VALUES ('9999', 'chief_user', '1234', 'chief');

USE oncology_db;
SELECT * FROM login;