-- 1. เรียกใช้งานฐานข้อมูลของระบบ
USE oncology_db;

-- 2. ดึงประวัติเข้าใช้งาน (LOGIN) และออกจากระบบ (LOGOUT) ทั้งหมด เรียงจากล่าสุดไปอดีต
SELECT id, timestamp, employee_id, username, action_type, details 
FROM activity_logs 
WHERE action_type IN ('LOGIN', 'LOGOUT') 
ORDER BY timestamp DESC;
