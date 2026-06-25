-- สำหรับเก็บประวัติการคำนวณ (ตัวที่ทำให้ History ไม่ขึ้นและ Save ไม่ได้)
CREATE TABLE IF NOT EXISTS dosage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(50),
    hn VARCHAR(20),
    patient_name VARCHAR(100),
    gender VARCHAR(20),
    age VARCHAR(20),
    calculated_bsa VARCHAR(20),
    formula_used VARCHAR(100),
    prescribed_dose VARCHAR(50)
);

ALTER TABLE dosage_logs ADD COLUMN age VARCHAR(20);


select * from dosage_logs;
