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
console.log('🚀 Connected to MySQL Database (Pool).');

// 1. ตรวจสอบตาราง dosage_logs
db.query("SHOW TABLES LIKE 'dosage_logs'", (tableErr, results) => {
    if (tableErr) {
        console.error('❌ Error checking table dosage_logs:', tableErr);
        return;
    }

    const checkActivityLogsTable = () => {
        db.query("SHOW TABLES LIKE 'activity_logs'", (actErr, actResults) => {
            if (actErr) {
                console.error('❌ Error checking table activity_logs:', actErr);
                return;
            }
            if (actResults.length === 0) {
                console.warn('⚠️ Table "activity_logs" NOT FOUND! Creating...');
                const createActTable = `
                    CREATE TABLE activity_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        timestamp VARCHAR(50),
                        employee_id VARCHAR(50),
                        username VARCHAR(50),
                        action_type VARCHAR(50),
                        details TEXT
                    )`;
                db.query(createActTable, (err) => {
                    if (err) console.error('❌ Table Creation Failed (activity_logs):', err);
                    else console.log('✅ Table "activity_logs" created.');
                });
            } else {
                console.log('✅ Table "activity_logs" is ready.');
            }
        });
    };

    const checkUsersTable = () => {
        // 2. ตรวจสอบตาราง login
        db.query("SHOW TABLES LIKE 'login'", (usersTableErr, usersResults) => {
            if (usersTableErr) {
                console.error('❌ Error checking table login:', usersTableErr);
                return;
            }
            if (usersResults.length === 0) {
                console.warn('⚠️ Table "login" NOT FOUND! Creating...');
                const createUsersTable = `
                    CREATE TABLE login (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50) NOT NULL UNIQUE,
                        employee_id VARCHAR(50) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        role VARCHAR(20) DEFAULT 'user'
                    )`;
                db.query(createUsersTable, (err) => {
                    if (err) {
                        console.error('❌ Table Creation Failed (login):', err);
                    } else {
                        console.log('✅ Table "login" created.');
                        // Insert default admin
                        db.query("INSERT INTO login (username, password, role, employee_id) VALUES ('admin', '1234', 'admin', '0000')", (insertErr) => {
                            if (insertErr) console.error('❌ Default user insertion failed:', insertErr);
                            else {
                                console.log('👤 Default user (admin/1234) created.');
                                checkActivityLogsTable();
                            }
                        });
                    }
                });
            } else {
                console.log('✅ Table "login" is ready.');
                // ตรวจสอบว่ามีคอลัมน์ employee_id หรือไม่ (Migration)
                db.query("SHOW COLUMNS FROM login LIKE 'employee_id'", (colErr, colResults) => {
                    if (!colErr && colResults.length === 0) {
                        console.log('🔄 Migrating: Adding "employee_id" column to login...');
                        db.query("ALTER TABLE login ADD COLUMN employee_id VARCHAR(50) UNIQUE", (alterErr) => {
                            if (alterErr) {
                                console.error('❌ Migration Failed (Adding employee_id to login):', alterErr);
                                checkActivityLogsTable();
                            } else {
                                console.log('✅ Migration: "employee_id" column added to login.');
                                // Update existing users to have employee_id = username
                                db.query("UPDATE login SET employee_id = username WHERE employee_id IS NULL", (updateErr) => {
                                    if (updateErr) console.error('❌ Failed to populate employee_id:', updateErr);
                                    else console.log('✅ Existing users updated with employee_id = username.');
                                    checkActivityLogsTable();
                                });
                            }
                        });
                    } else {
                        checkActivityLogsTable();
                    }
                });
            }
        });
    };

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
                gender VARCHAR(20),
                age VARCHAR(20)
            )`;
        db.query(createLogsTable, (err) => {
            if (err) {
                console.error('❌ Table Creation Failed (dosage_logs):', err);
            } else {
                console.log('✅ Table "dosage_logs" created.');
                checkUsersTable();
            }
        });
    } else {
        console.log('✅ Table "dosage_logs" is ready.');
        // ตรวจสอบว่ามีคอลัมน์ user_name หรือไม่ (Migration)
        db.query("SHOW COLUMNS FROM dosage_logs LIKE 'user_name'", (colErr, colResults) => {
            if (!colErr && colResults.length === 0) {
                console.log('🔄 Migrating: Adding "user_name" column to dosage_logs...');
                db.query("ALTER TABLE dosage_logs ADD COLUMN user_name VARCHAR(255)", (alterErr) => {
                    if (alterErr) console.error('❌ Migration Failed:', alterErr);
                    else console.log('✅ Migration Successful: "user_name" column added.');
                });
            }
        });
        // ตรวจสอบว่ามีคอลัมน์ gender หรือไม่ (Migration)
        db.query("SHOW COLUMNS FROM dosage_logs LIKE 'gender'", (colErr, colResults) => {
            if (!colErr && colResults.length === 0) {
                console.log('🔄 Migrating: Adding "gender" column to dosage_logs...');
                db.query("ALTER TABLE dosage_logs ADD COLUMN gender VARCHAR(20)", (alterErr) => {
                    if (alterErr) console.error('❌ Migration Failed (gender):', alterErr);
                    else console.log('✅ Migration Successful: "gender" column added.');
                });
            }
        });
        // ตรวจสอบว่ามีคอลัมน์ age หรือไม่ (Migration)
        db.query("SHOW COLUMNS FROM dosage_logs LIKE 'age'", (colErr, colResults) => {
            if (!colErr && colResults.length === 0) {
                console.log('🔄 Migrating: Adding "age" column to dosage_logs...');
                db.query("ALTER TABLE dosage_logs ADD COLUMN age VARCHAR(20)", (alterErr) => {
                    if (alterErr) console.error('❌ Migration Failed (age):', alterErr);
                    else console.log('✅ Migration Successful: "age" column added.');
                });
            }
        });

        checkUsersTable();
    }
});

// 🇹🇭 ฟังก์ชันแปลงเวลาเป็นเวลาประเทศไทย (พ.ศ.)
function getFormattedThaiTimestamp() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear() + 543;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// 📝 ฟังก์ชันบันทึกกิจกรรมลงในตาราง activity_logs
const logActivity = (employeeId, actionType, details) => {
    const time = getFormattedThaiTimestamp();
    db.query("SELECT username FROM login WHERE employee_id = ?", [employeeId], (err, rows) => {
        const username = (!err && rows && rows.length > 0) ? rows[0].username : 'Unknown';
        db.query(
            "INSERT INTO activity_logs (timestamp, employee_id, username, action_type, details) VALUES (?, ?, ?, ?, ?)",
            [time, employeeId, username, actionType, details],
            (insertErr) => {
                if (insertErr) {
                    console.error('❌ Failed to log activity:', insertErr);
                } else {
                    console.log(`📝 Activity Logged [${actionType}]: ${details} by ${username} (${employeeId})`);
                }
            }
        );
    });
};

// 🔑 API Route 0: Login Authentication
app.post('/api/login', (expressAppReq, expressAppRes) => {
    const { employee_id, password } = expressAppReq.body;
    const query = `SELECT id, username, employee_id, role FROM login WHERE employee_id = ? AND password = ?`;

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
            // บันทึกกิจกรรมการเข้าสู่ระบบ
            logActivity(employee_id, 'LOGIN', 'เข้าสู่ระบบสำเร็จ');
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
    const { timestamp, hn, patientName, calculatedBsaM2, formulaUsed, prescribedDose, userName, gender, age, employee_id } = expressAppReq.body;

    const query = `INSERT INTO dosage_logs (timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, user_name, gender, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    console.log('📝 Running Query:', query);

    db.query(query, [timestamp, hn, patientName, calculatedBsaM2, formulaUsed, prescribedDose, userName, gender, age], (err, result) => {
        if (err) {
            console.error('❌ Database insertion error:', err);
            return expressAppRes.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        
        // บันทึกกิจกรรมการคำนวณและตรวจสอบโดสยา
        const empId = employee_id || '';
        if (empId) {
            logActivity(empId, 'SAVE_CALCULATION', `คำนวณขนาดยาผู้ป่วย HN: ${hn} (${patientName}) สูตร: ${formulaUsed} ขนาด: ${prescribedDose}`);
        } else {
            db.query("SELECT employee_id FROM login WHERE username = ?", [userName], (lookupErr, lookupRows) => {
                const matchedId = (!lookupErr && lookupRows && lookupRows.length > 0) ? lookupRows[0].employee_id : 'Unknown';
                logActivity(matchedId, 'SAVE_CALCULATION', `คำนวณขนาดยาผู้ป่วย HN: ${hn} (${patientName}) สูตร: ${formulaUsed} ขนาด: ${prescribedDose}`);
            });
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
    const roleQuery = `SELECT role FROM login WHERE employee_id = ?`;
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
    const query = `SELECT id, timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, user_name, gender, age FROM dosage_logs ORDER BY id DESC`;
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
    const query = `SELECT id, timestamp, hn, patient_name, calculated_bsa, formula_used, prescribed_dose, user_name, gender, age FROM dosage_logs ORDER BY id DESC`;
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

// 👥 Admin User Management APIs
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const query = `SELECT id, username, employee_id, role FROM login ORDER BY id DESC`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Fetch users error:', err);
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        res.json({ success: true, users: results });
    });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
    const { username, employee_id, password, role } = req.body;
    if (!username || !employee_id || !password || !role) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    const query = `INSERT INTO login (username, employee_id, password, role) VALUES (?, ?, ?, ?)`;
    db.query(query, [username, employee_id, password, role], (err, result) => {
        if (err) {
            console.error('❌ Create user error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้วในระบบ' });
            }
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        res.json({ success: true, insertedId: result.insertId });
    });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, employee_id, password, role } = req.body;
    if (!username || !employee_id || !role) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    
    let query, params;
    if (password) {
        query = `UPDATE login SET username = ?, employee_id = ?, password = ?, role = ? WHERE id = ?`;
        params = [username, employee_id, password, role, userId];
    } else {
        query = `UPDATE login SET username = ?, employee_id = ?, role = ? WHERE id = ?`;
        params = [username, employee_id, role, userId];
    }

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('❌ Update user error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้วในระบบ' });
            }
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        res.json({ success: true });
    });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const employeeId = req.headers['x-employee-id'];
    
    const checkQuery = `SELECT id FROM login WHERE employee_id = ?`;
    db.query(checkQuery, [employeeId], (checkErr, checkRows) => {
        if (!checkErr && checkRows.length > 0 && checkRows[0].id == userId) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบผู้ใช้งานของตัวท่านเองได้' });
        }
        
        const deleteQuery = `DELETE FROM login WHERE id = ?`;
        db.query(deleteQuery, [userId], (err, result) => {
            if (err) {
                console.error('❌ Delete user error:', err);
                return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
            }
            res.json({ success: true });
        });
    });
});

app.delete('/api/admin/logs/:id', requireAdmin, (req, res) => {
    const logId = req.params.id;
    const query = `DELETE FROM dosage_logs WHERE id = ?`;
    db.query(query, [logId], (err, result) => {
        if (err) {
            console.error('❌ Delete log error:', err);
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        res.json({ success: true });
    });
});


// รัน Server ที่พอร์ต 5004 เป็นตัวกลางกระจายคำสั่ง
const PORT = 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Clinical API Bridge is running on http://localhost:${PORT}`);
});