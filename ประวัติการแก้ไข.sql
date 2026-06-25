-- 1. เลือกใช้งานฐานข้อมูลของระบบก่อน
USE oncology_db;

-- 2. ดึงข้อมูลทั้งหมดจากตาราง activity_logs เรียงตามเวลาล่าสุด
SELECT * FROM activity_logs ORDER BY timestamp DESC;
