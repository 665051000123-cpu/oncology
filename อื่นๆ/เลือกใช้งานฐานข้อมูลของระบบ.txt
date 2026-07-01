-- 1. เลือกใช้งานฐานข้อมูลของระบบ
USE oncology_db;

-- 2. สร้างตาราง drugs ที่เพิ่มคอลัมน์ให้เข้ากับฟังก์ชันในเว็บปัจจุบัน
CREATE TABLE IF NOT EXISTS drugs (
    drug_id INT AUTO_INCREMENT PRIMARY KEY,
    drug_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'ชื่อยา (Generic name / Trade name)',
    calculation_type ENUM('BSA', 'WEIGHT_BASED', 'FIXED_DOSE', 'CALVERT_FORMULA') NOT NULL COMMENT 'ประเภทการคำนวณหลัก',
    default_weight_type ENUM('ACTUAL', 'IDEAL', 'ADJUSTED') DEFAULT 'ACTUAL' COMMENT 'ประเภทน้ำหนักที่แนะนำใช้คำนวณ',
    standard_dose_value DECIMAL(10, 2) NULL COMMENT 'ค่าขนาดยาเริ่มต้นสำหรับคำนวณ เช่น 1.4, 30, 75, 5.00',
    standard_dose_unit VARCHAR(20) COMMENT 'หน่วยของขนาดยามาตรฐาน เช่น mg/m2, units, Target AUC',
    max_dose_cap DECIMAL(10, 2) NULL COMMENT 'ขนาดยาสูงสุดที่จำกัดไว้ (Dose Cap) เช่น 2.00 mg สำหรับ Vincristine',
    max_bsa_cap DECIMAL(4, 2) NULL COMMENT 'ค่า BSA สูงสุดที่ยอมให้ใช้คำนวณ (ถ้ามี)',
    max_gfr_cap INT NULL DEFAULT 125 COMMENT 'ค่า GFR สูงสุดที่ยอมให้ใช้คำนวณใน Calvert Formula เช่น 125 สำหรับ Carboplatin',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'สถานะเปิดใช้งาน 1 = เปิด, 0 = ปิด',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. แทรกข้อมูลตัวยาเริ่มต้นที่ใช้งานอยู่ในระบบขณะนี้
INSERT INTO drugs 
(drug_name, calculation_type, default_weight_type, standard_dose_value, standard_dose_unit, max_dose_cap, max_bsa_cap, max_gfr_cap) 
VALUES
('VINCRISTINE', 'BSA', 'ACTUAL', 1.40, 'mg/m2', 2.00, NULL, NULL),
('CARBOPLATIN', 'CALVERT_FORMULA', 'ACTUAL', 5.00, 'Target AUC', NULL, NULL, 125),
('BLEOMYCIN', 'FIXED_DOSE', 'ACTUAL', 30.00, 'units', NULL, NULL, NULL),
('CISPLATIN', 'BSA', 'ACTUAL', 75.00, 'mg/m2', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE 
calculation_type=VALUES(calculation_type),
standard_dose_value=VALUES(standard_dose_value),
standard_dose_unit=VALUES(standard_dose_unit),
max_dose_cap=VALUES(max_dose_cap),
max_gfr_cap=VALUES(max_gfr_cap);
