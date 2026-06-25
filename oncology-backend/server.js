require('dotenv').config(); // เรียกใช้งานเพื่อรองรับระบบความปลอดภัย .env
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

console.log('🏁 Server is starting...');
console.log('📡 DB Config:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'oncology_db'
});

const app = express();
app.use(cors()); // Allow all origins for easier local development
app.use(express.json());
app.use(express.static('../client/dist', {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
})); // Serve React production build

// 🗄️ ปรับตั้งค่าการเชื่อมต่อไปยังฐานข้อมูล oncology_db เดิมของคุณ
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'oncology_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
});

// ตรวจสอบสถานะการเชื่อมต่อ และเช็คความพร้อมของตาราง
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Connection Failed to MySQL:', err.message);
        return;
    }
    console.log('🚀 Connected to MySQL Database (Pool).');

    // ตรวจสอบห้องยา (dosage_logs)
    connection.query("SHOW TABLES LIKE 'dosage_logs'", (tableErr, results) => {
        if (tableErr) console.error('❌ Error checking table dosage_logs:', tableErr);
        if (results.length === 0) {
            console.warn('⚠️ Table "dosage_logs" NOT FOUND! Creating...');
            const createLogsTable = `
                CREATE TABLE dosage_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    timestamp VARCHAR(50),
                    hn VARCHAR(20),
                    patient_name VARCHAR(255),
                    calculated_bsa VARCHAR(20),
                    formula_used VARCHAR(255),
                    prescribed_dose VARCHAR(50),
                    user_name VARCHAR(255),
                    gender VARCHAR(20)
                )`;
            connection.query(createLogsTable, (err) => {
                if (err) console.error('❌ Table Creation Failed (dosage_logs):', err);
                else console.log('✅ Table "dosage_logs" created.');
            });
        } else {
            console.log('✅ Table "dosage_logs" is ready.');
            // ตรวจสอบว่ามีคอลัมน์ user_name หรือไม่ (Migration)
            connection.query("SHOW COLUMNS FROM dosage_logs LIKE 'user_name'", (colErr, colResults) => {
                if (!colErr && colResults.length === 0) {
                    console.log('🔄 Migrating: Adding "user_name" column to dosage_logs...');
                    connection.query("ALTER TABLE dosage_logs ADD COLUMN user_name VARCHAR(255)", (alterErr) => {
                        if (alterErr) console.error('❌ Migration Failed:', alterErr);
                        else console.log('✅ Migration Successful: "user_name" column added.');
                    });
                }
            });
            // ตรวจสอบว่ามีคอลัมน์ gender หรือไม่ (Migration)
            connection.query("SHOW COLUMNS FROM dosage_logs LIKE 'gender'", (colErr, colResults) => {
                if (!colErr && colResults.length === 0) {
                    console.log('🔄 Migrating: Adding "gender" column to dosage_logs...');
                    connection.query("ALTER TABLE dosage_logs ADD COLUMN gender VARCHAR(20)", (alterErr) => {
                        if (alterErr) console.error('❌ Migration Failed (gender):', alterErr);
                        else console.log('✅ Migration Successful: "gender" column added.');
                    });
                }
            });
        }
    });

    // ตรวจสอบผู้ใช้ (users) ตามภาพที่ระบุ
    connection.query("SHOW TABLES LIKE 'users'", (tableErr, results) => {
        if (tableErr) console.error('❌ Error checking table users:', tableErr);
        if (results.length === 0) {
            console.warn('⚠️ Table "users" NOT FOUND! Creating...');
            const createUsersTable = `
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    employee_id VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) DEFAULT 'user'
                )`;
            connection.query(createUsersTable, (err) => {
                if (err) {
                    console.error('❌ Table Creation Failed (users):', err);
                } else {
                    console.log('✅ Table "users" created.');
                    // Insert default admin as in the picture
                    connection.query("INSERT INTO users (username, password, role, employee_id) VALUES ('admin', '1234', 'pharmacist', 'admin')", (insertErr) => {
                        if (insertErr) console.error('❌ Default user insertion failed:', insertErr);
                        else console.log('👤 Default user (admin/1234) created.');
                    });
                }
            });
        } else {
            console.log('✅ Table "users" is ready.');
            // ตรวจสอบว่ามีคอลัมน์ employee_id หรือไม่ (Migration)
            connection.query("SHOW COLUMNS FROM users LIKE 'employee_id'", (colErr, colResults) => {
                if (!colErr && colResults.length === 0) {
                    console.log('🔄 Migrating: Adding "employee_id" column to users...');
                    connection.query("ALTER TABLE users ADD COLUMN employee_id VARCHAR(50) UNIQUE", (alterErr) => {
                        if (alterErr) {
                            console.error('❌ Migration Failed (Adding employee_id to users):', alterErr);
                        } else {
                            console.log('✅ Migration: "employee_id" column added to users.');
                            // Update existing users to have employee_id = username
                            connection.query("UPDATE users SET employee_id = username WHERE employee_id IS NULL", (updateErr) => {
                                if (updateErr) console.error('❌ Failed to populate employee_id:', updateErr);
                                else console.log('✅ Existing users updated with employee_id = username.');
                            });
                        }
                    });
                }
            });
        }
        connection.release();
    });
});

// 🔑 API Route 0: Login Authentication
app.post('/api/login', (expressAppReq, expressAppRes) => {
    const { employee_id, password } = expressAppReq.body;
    const query = `SELECT id, username, employee_id, role FROM users WHERE employee_id = ? AND password = ?`;

    db.query(query, [employee_id, password], (err, results) => {
        if (err) {
            console.error('❌ Login Error Details:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                message: err.message
            });
            return expressAppRes.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        if (results.length > 0) {
            // Include role in response for front‑end to know if user is admin
            expressAppRes.json({ success: true, user: results[0] });
        } else {
            expressAppRes.status(401).json({ success: false, message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' });
        }
    });
});

// 📥 API Route 1: รับข้อมูลคำนวณจากหน้าเว็บเข้าไปเก็บใน MySQL
app.post('/api/logs', (expressAppReq, expressAppRes) => {
    console.log('📥 Received Log Data:', expressAppReq.body);
    const { timestamp, hn, patientName, calculatedBsaM2, formulaUsed, prescribedDose, userName, gender } = expressAppReq.body;

    const query = `INSERT INTO dosage_logs (timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, user_name, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    console.log('📝 Running Query:', query);

    db.query(query, [timestamp, hn, patientName, calculatedBsaM2, formulaUsed, prescribedDose, userName, gender], (err, result) => {
        if (err) {
            console.error('❌ Database insertion error:', err);
            return expressAppRes.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        expressAppRes.json({ success: true, insertedId: result.insertId });
    });
});

// 📤 API Route 2: ดึงประวัติทั้งหมดจาก MySQL ออกไปโชว์ที่ตารางหน้าเว็บแบบ Live Sync
// Middleware to verify admin role based on employee_id header
function requireAdmin(req, res, next) {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) {
        return res.status(401).json({ success: false, message: 'Missing employee ID header' });
    }
    const roleQuery = `SELECT role FROM users WHERE employee_id = ?`;
    db.query(roleQuery, [employeeId], (err, rows) => {
        if (err) {
            console.error('❌ Role check error:', err);
            return res.status(500).json({ success: false, message: 'Database error during role check' });
        }
        if (rows.length === 0 || rows[0].role.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    });
}

// 📤 API Route 2: ดึงประวัติทั้งหมดจาก MySQL (admin‑only)
app.get('/api/admin/logs', requireAdmin, (expressAppReq, expressAppRes) => {
    const query = `SELECT id, timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, user_name, gender FROM dosage_logs ORDER BY id DESC`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Database fetch error Details:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                message: err.message
            });
            return expressAppRes.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
        }
        expressAppRes.json({ success: true, logs: results });
    });
});

// Existing public logs endpoint (kept for non‑admin users if needed)
app.get('/api/logs', (expressAppReq, expressAppRes) => {
    // Optionally limit fields or filter for non‑admin view
    const query = `SELECT id, timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, gender FROM dosage_logs ORDER BY id DESC`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Database fetch error Details:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                message: err.message
            });
            return expressAppRes.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
        }
        expressAppRes.json({ success: true, logs: results });
    });
});

// รัน Server ที่พอร์ต 5004 เป็นตัวกลางกระจายคำสั่ง
const PORT = 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Clinical API Bridge is running on http://localhost:${PORT}`);
});