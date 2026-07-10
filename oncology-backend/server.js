require('dotenv').config(); // เรียกใช้งานเพื่อรองรับระบบความปลอดภัย .env
const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
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

// 🗄️ Sequelize database connection initialization
const sequelize = new Sequelize(
    process.env.DB_NAME || 'oncology_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'admin',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false, // ปิดการแสดง SQL log หรือเปลี่ยนเป็น console.log หากต้องการดีบั๊ก
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Define Models
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.STRING(20),
        defaultValue: 'user'
    },
    must_change_password: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    },
    is_active: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    },
    default_printer: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'login',
    timestamps: false
});

const DosageLog = sequelize.define('DosageLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: DataTypes.STRING(50),
    hn: DataTypes.STRING(20),
    patient_name: DataTypes.STRING(255),
    calculated_bsa: DataTypes.STRING(20),
    formula_used: DataTypes.STRING(255),
    prescribed_dose: DataTypes.STRING(50),
    user_name: DataTypes.STRING(255),
    gender: DataTypes.STRING(20),
    age: DataTypes.STRING(20),
    height: DataTypes.STRING(20),
    weight: DataTypes.STRING(20),
    ward: DataTypes.STRING(100),
    allergies: DataTypes.TEXT,
    drugs_used: DataTypes.TEXT,
    doctor: DataTypes.STRING(255),
    gfr_value: DataTypes.STRING(50)
}, {
    tableName: 'dosage_logs',
    timestamps: false
});

const OrderLog = sequelize.define('OrderLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: DataTypes.STRING(50),
    hn: DataTypes.STRING(20),
    patient_name: DataTypes.STRING(255),
    ward: DataTypes.STRING(100),
    user_name: DataTypes.STRING(255),
    doctor: DataTypes.STRING(255),
    cycle: DataTypes.STRING(50),
    order_details: DataTypes.TEXT('long'), // Stores adminRows JSON
    is_date_unlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'order_logs',
    timestamps: false
});

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: DataTypes.STRING(50),
    employee_id: DataTypes.STRING(50),
    username: DataTypes.STRING(50),
    action_type: DataTypes.STRING(50),
    details: DataTypes.TEXT
}, {
    tableName: 'activity_logs',
    timestamps: false
});

// 💊 Drug Model — maps to existing 'drugs' table
const Drug = sequelize.define('Drug', {
    drug_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    drug_code: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    drug_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    drug_category: {
        type: DataTypes.ENUM('CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY'),
        defaultValue: 'CHEMOTHERAPY',
        allowNull: false
    },
    calculation_type: {
        type: DataTypes.ENUM('BSA', 'WEIGHT_BASED', 'FIXED_DOSE', 'CALVERT_FORMULA'),
        allowNull: false
    },
    default_weight_type: {
        type: DataTypes.ENUM('ACTUAL', 'IDEAL', 'ADJUSTED'),
        defaultValue: 'ACTUAL'
    },
    standard_dose_value: DataTypes.DECIMAL(10, 2),
    standard_dose_unit: DataTypes.STRING(20),
    max_dose_cap: DataTypes.DECIMAL(10, 2),
    max_bsa_cap: DataTypes.DECIMAL(4, 2),
    max_gfr_cap: DataTypes.INTEGER,
    is_active: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    },
    dose_per_pack: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    package_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    inventory_qty: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    inventory_min: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    inventory_max: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    is_auto_dispensed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: DataTypes.DATE
}, {
    tableName: 'drugs',
    timestamps: false
});

// 👤 Patient Model — maps to 'patients' table
const Patient = sequelize.define('Patient', {
    hn: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    gender: DataTypes.STRING(20),
    age: DataTypes.STRING(20),
    height: DataTypes.STRING(20),
    weight: DataTypes.STRING(20)
}, {
    tableName: 'patients',
    timestamps: false
});

const Solvent = sequelize.define('Solvent', {
    solvent_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    solvent_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    is_active: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'solvents',
    timestamps: false
});

// Associations
ActivityLog.belongsTo(User, { foreignKey: 'employee_id', targetKey: 'employee_id', as: 'user', constraints: false });

// Initialize and sync models
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('🚀 Connected to MySQL Database (Sequelize).');

        // Check if drug_category column exists in drugs table, if not add it
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('drugs');
        if (!tableInfo.drug_category) {
            console.log('Adding drug_category column to drugs table...');
            await queryInterface.addColumn('drugs', 'drug_category', {
                type: DataTypes.ENUM('CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY'),
                defaultValue: 'CHEMOTHERAPY',
                allowNull: false
            });
            console.log('✅ Column drug_category added successfully.');
        }

        // Sync models with DB (automatically creates tables if they do not exist)
        await sequelize.sync();
        console.log('✅ Database schema synchronized.');

        // Check if title column exists in patients table, if not add it
        const patientTableInfo = await queryInterface.describeTable('patients');
        if (!patientTableInfo.title) {
            console.log('Adding title column to patients table...');
            await queryInterface.addColumn('patients', 'title', {
                type: DataTypes.STRING(50),
                allowNull: true
            });
            console.log('✅ Column title added successfully to patients table.');
        }

        // Check if cycle column exists in order_logs table, if not add it
        try {
            const orderLogTableInfo = await queryInterface.describeTable('order_logs');
            if (orderLogTableInfo && !orderLogTableInfo.cycle) {
                console.log('Adding cycle column to order_logs table...');
                await queryInterface.addColumn('order_logs', 'cycle', {
                    type: DataTypes.STRING(50),
                    allowNull: true
                });
                console.log('✅ Column cycle added successfully to order_logs table.');
            }
        } catch(e) {
            console.log('Table order_logs may not exist yet, skipping alter column check for cycle.');
        }

        // Check if is_date_unlocked column exists in order_logs table, if not add it
        try {
            const orderLogTableInfo = await queryInterface.describeTable('order_logs');
            if (orderLogTableInfo && !orderLogTableInfo.is_date_unlocked) {
                console.log('Adding is_date_unlocked column to order_logs table...');
                await queryInterface.addColumn('order_logs', 'is_date_unlocked', {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                });
                console.log('✅ Column is_date_unlocked added successfully to order_logs table.');
            }
        } catch(e) {
            console.log('Table order_logs may not exist yet, skipping alter column check.');
        }

        // Check if default_printer column exists in login table, if not add it
        try {
            const loginTableInfo = await queryInterface.describeTable('login');
            if (loginTableInfo && !loginTableInfo.default_printer) {
                console.log('Adding default_printer column to login table...');
                await queryInterface.addColumn('login', 'default_printer', {
                    type: DataTypes.STRING(255),
                    allowNull: true
                });
                console.log('✅ Column default_printer added successfully to login table.');
            }
        } catch(e) {
            console.log('Table login may not exist yet, skipping alter column check.');
        }

        // Seed unique patients from dosage_logs if patients table is empty
        const patientCount = await Patient.count();
        if (patientCount === 0) {
            console.log('👤 Extracting patients from existing dosage_logs...');
            const logs = await DosageLog.findAll({
                order: [['id', 'ASC']]
            });
            const uniquePatients = {};
            logs.forEach(log => {
                if (log.hn) {
                    uniquePatients[log.hn] = {
                        hn: log.hn,
                        name: log.patient_name || 'ไม่ระบุชื่อ',
                        gender: log.gender || '',
                        age: log.age || '',
                        height: log.height || '',
                        weight: log.weight || ''
                    };
                }
            });
            const insertPromises = Object.values(uniquePatients).map(p => Patient.create(p));
            await Promise.all(insertPromises);
            console.log(`✅ Extracted and inserted ${Object.keys(uniquePatients).length} patients into patients table.`);
        }

        // Seed default solvents if table is empty
        const solventCount = await Solvent.count();
        if (solventCount === 0) {
            console.log('🧪 Seeding default solvents...');
            const defaultSolvents = [
                "-", "0", "D5N/2 300", "D5N/5 100", "D5N/5 120", "D5N/5 130", "D5N/5 200",
                "D5N/5 250", "D5N/5 50", "D5N/5 500", "D5N/5 70", "D5N/5 75", "D5N/5 80", "D5N/5 90",
                "D-5-S 1000", "D-5-S 250", "D-5-S 500",
                "D5S(แก้ว) 500", "D5S/2 1000", "D5S/2 200", "D5S/2 400", "D5S/2 500", "D5S/2(แก้ว) 1000",
                "D-5-W 10", "D-5-W 100", "D-5-W 1000", "D-5-W 20", "D-5-W 200", "D-5-W 250",
                "D5W 5", "D-5-W 50", "D-5-W 500", "D-5-W(แก้ว) 200", "D-5-W(แก้ว) 500",
                "NSS 100", "NSS 125", "NSS 150", "NSS 200", "NSS 250", "NSS 3", "NSS 50", "NSS 500",
                "NSS(แก้ว) 100", "NSS(แก้ว) 1000", "NSS(แก้ว) 500", "NSS. 10",
                "WFI 10", "WFI 20", "WFI 50", "ขวด Doxo 0"
            ];
            await Solvent.bulkCreate(defaultSolvents.map(n => ({ solvent_name: n })), { ignoreDuplicates: true });
            console.log('✅ Default solvents seeded.');
        }

        // Seed default admin if table is empty
        const userCount = await User.count();
        if (userCount === 0) {
            console.log('👤 Seeding default admin user...');
            await User.create({
                username: 'admin',
                employee_id: '0000',
                password: '1234',
                role: 'admin',
                must_change_password: 1
            });
            console.log('✅ Default user (admin/1234) created.');
        }
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
    }
}
initializeDatabase();

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
const logActivity = async (employeeId, actionType, details) => {
    try {
        const time = getFormattedThaiTimestamp();
        let username = 'Unknown';
        if (employeeId) {
            const user = await User.findOne({ where: { employee_id: employeeId } });
            if (user) username = user.username;
        }
        await ActivityLog.create({
            timestamp: time,
            employee_id: employeeId,
            username: username,
            action_type: actionType,
            details: details
        });
        console.log(`📝 Activity Logged [${actionType}]: ${details} by ${username} (${employeeId})`);
    } catch (err) {
        console.error('❌ Failed to log activity:', err);
    }
};

// 🔑 API Route 0: Login Authentication
app.post('/api/login', async (req, res) => {
    try {
        const { employee_id, password } = req.body;
        const user = await User.findOne({
            where: { employee_id, password }
        });

        if (user) {
            if (user.is_active === 0) {
                return res.status(403).json({ success: false, message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว โปรดติดต่อผู้ดูแลระบบ' });
            }
            // บันทึกกิจกรรมการเข้าสู่ระบบ
            logActivity(employee_id, 'LOGIN', 'เข้าสู่ระบบสำเร็จ');
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' });
        }
    } catch (err) {
        console.error('❌ Login Error Details:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 🔑 API Route: Update Default Printer
app.put('/api/users/:employee_id/printer', async (req, res) => {
    try {
        const { employee_id } = req.params;
        const { default_printer } = req.body;
        
        const user = await User.findOne({ where: { employee_id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        await user.update({ default_printer });
        res.json({ success: true, message: 'Printer updated successfully' });
    } catch (err) {
        console.error('❌ Update Printer Error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 🔑 API Route 0.5: Logout Log
app.post('/api/logout', async (req, res) => {
    try {
        const { employee_id } = req.body;
        if (employee_id) {
            logActivity(employee_id, 'LOGOUT', 'ออกจากระบบสำเร็จ');
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Missing employee_id' });
        }
    } catch (err) {
        console.error('❌ Logout Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🔑 API Route 0.6: Change Password (to clear first-time change flag)
app.post('/api/change-password', async (req, res) => {
    try {
        const { employee_id, new_password } = req.body;
        if (!employee_id || !new_password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }

        const [affectedCount] = await User.update(
            { password: new_password, must_change_password: 0 },
            { where: { employee_id } }
        );

        if (affectedCount > 0) {
            logActivity(employee_id, 'UPDATE_PASSWORD', 'เปลี่ยนรหัสผ่านครั้งแรกเรียบร้อยแล้ว');
            res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ระบุ' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database update failed: ' + err.message });
    }
});

// 📥 API Route 1: รับข้อมูลคำนวณจากหน้าเว็บเข้าไปเก็บใน MySQL
app.post('/api/logs', async (req, res) => {
    try {
        console.log('📥 Received Log Data:', req.body);
        const { 
            timestamp, 
            hn, 
            patientName, 
            calculatedBsaM2, 
            formulaUsed, 
            prescribedDose, 
            userName, 
            gender, 
            age, 
            height, 
            weight,
            ward,
            allergies,
            drugsUsed,
            doctor,
            gfr_value,
            employee_id
        } = req.body;

        const newLog = await DosageLog.create({
            timestamp,
            hn,
            patient_name: patientName,
            calculated_bsa: calculatedBsaM2,
            formula_used: formulaUsed,
            prescribed_dose: prescribedDose,
            user_name: userName,
            gender,
            age,
            height,
            weight,
            ward,
            allergies,
            drugs_used: drugsUsed,
            doctor,
            gfr_value
        });

        // Update or create patient record to keep stats updated
        const existingPatient = await Patient.findByPk(hn);
        if (existingPatient) {
            await existingPatient.update({
                name: patientName,
                gender,
                age,
                height,
                weight
            });
        } else {
            await Patient.create({
                hn,
                name: patientName,
                gender,
                age,
                height,
                weight
            });
        }

        // บันทึกกิจกรรมการคำนวณและตรวจสอบโดสยา
        const empId = typeof employee_id !== 'undefined' ? employee_id : (req.body.employee_id || '');
        if (empId) {
            logActivity(empId, 'SAVE_CALCULATION', `คำนวณขนาดยาผู้ป่วย HN: ${hn} (${patientName}) สูตร: ${formulaUsed} ขนาด: ${prescribedDose}`);
        } else {
            const user = await User.findOne({ where: { username: userName } });
            const matchedId = user ? user.employee_id : 'Unknown';
            logActivity(matchedId, 'SAVE_CALCULATION', `คำนวณขนาดยาผู้ป่วย HN: ${hn} (${patientName}) สูตร: ${formulaUsed} ขนาด: ${prescribedDose}`);
        }

        res.json({ success: true, insertedId: newLog.id });
    } catch (err) {
        console.error('❌ Database insertion error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Middleware to verify admin role based on employee_id header
async function requireAdmin(req, res, next) {
    try {
        const employeeId = req.headers['x-employee-id'];
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Missing employee ID header' });
        }
        const user = await User.findOne({ where: { employee_id: employeeId } });
        if (!user || user.role.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    } catch (err) {
        console.error('❌ Role check error:', err);
        res.status(500).json({ success: false, message: 'Database error during role check' });
    }
}

// Middleware to verify admin or head role based on employee_id header
async function requireHeadOrAdmin(req, res, next) {
    try {
        const employeeId = req.headers['x-employee-id'];
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Missing employee ID header' });
        }
        const user = await User.findOne({ where: { employee_id: employeeId } });
        if (!user || (user.role.toUpperCase() !== 'ADMIN' && user.role.toUpperCase() !== 'HEAD')) {
            return res.status(403).json({ success: false, message: 'Admin or Head Pharmacist access required' });
        }
        next();
    } catch (err) {
        console.error('❌ Role check error:', err);
        res.status(500).json({ success: false, message: 'Database error during role check' });
    }
}

// 📤 API Route 2: ดึงประวัติทั้งหมดจาก MySQL (admin‑only)
app.get('/api/admin/logs', requireAdmin, async (req, res) => {
    try {
        const logs = await DosageLog.findAll({
            order: [['id', 'DESC']]
        });
        res.json({ success: true, logs });
    } catch (err) {
        console.error('❌ Database fetch error Details:', err);
        res.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
    }
});

// Existing public logs endpoint (kept for non‑admin users if needed)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await DosageLog.findAll({
            order: [['id', 'DESC']]
        });
        res.json({ success: true, logs });
    } catch (err) {
        console.error('❌ Database fetch error Details:', err);
        res.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
    }
});

// 🔑 Login/Logout history endpoint (admin‑only) — ประวัติการเข้า/ออกใช้งาน
app.get('/api/admin/logins', requireAdmin, async (req, res) => {
    try {
        const results = await ActivityLog.findAll({
            where: {
                action_type: ['LOGIN', 'LOGOUT']
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['role'],
                required: false // LEFT JOIN
            }],
            order: [['id', 'DESC']]
        });

        const logins = results.map(r => ({
            id: r.id,
            timestamp: r.timestamp,
            employee_id: r.employee_id,
            username: r.username,
            action_type: r.action_type,
            role: r.user?.role || 'unknown'
        }));

        res.json({ success: true, logins });
    } catch (err) {
        console.error('❌ Database fetch error (logins):', err);
        res.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
    }
});

// 📝 Modification history endpoint (admin‑only) — เฉพาะประวัติการแก้ไขข้อมูล (ไม่รวม LOGIN)
app.get('/api/admin/activities', requireAdmin, async (req, res) => {
    try {
        const activities = await ActivityLog.findAll({
            where: {
                action_type: { [Op.notIn]: ['LOGIN', 'LOGOUT'] }
            },
            order: [['id', 'DESC']]
        });
        res.json({ success: true, activities });
    } catch (err) {
        console.error('❌ Database fetch error (activities):', err);
        res.status(500).json({ success: false, message: 'Database Fetch Error: ' + err.message });
    }
});

// 📊 Admin Statistics Dashboard API
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear() + 543;
        const todayPrefix = `${day}/${month}/${year}%`;

        // Helper to parse Thai Buddhist timestamp
        const parseThaiTimestamp = (timestampStr) => {
            if (!timestampStr) return null;
            const parts = timestampStr.split(' ');
            if (parts.length === 0) return null;
            const dateParts = parts[0].split('/');
            if (dateParts.length < 3) return null;

            let dVal = parseInt(dateParts[0], 10);
            let mVal = parseInt(dateParts[1], 10) - 1; // 0-indexed
            let yVal = parseInt(dateParts[2], 10);

            if (yVal > 2400) {
                yVal -= 543;
            }

            const d = new Date(yVal, mVal, dVal);
            return isNaN(d.getTime()) ? null : d;
        };

        let dateWhere = {};
        let leaderboardWhere = {
            user_name: {
                [Op.and]: [
                    { [Op.ne]: null },
                    { [Op.ne]: '' }
                ]
            }
        };

        if (startDate && endDate) {
            // Parse DD/MM/YYYY (Buddhist Era Year from front-end text inputs)
            const sParts = startDate.split('/');
            const eParts = endDate.split('/');

            // Format to YYYY-MM-DD for standard database datetime comparison
            const dbStart = `${sParts[2]}-${sParts[1]}-${sParts[0]} 00:00:00`;
            const dbEnd = `${eParts[2]}-${eParts[1]}-${eParts[0]} 23:59:59`;

            dateWhere = sequelize.where(
                sequelize.fn('STR_TO_DATE', sequelize.col('timestamp'), '%d/%m/%Y %H:%i:%s'),
                { [Op.between]: [dbStart, dbEnd] }
            );

            leaderboardWhere = {
                [Op.and]: [
                    leaderboardWhere,
                    dateWhere
                ]
            };
        }

        const [
            totalCalculations,
            totalUsers,
            totalPatients,
            todayCalculations,
            formulaStatsResult,
            leaderboardResult,
            allLogs
        ] = await Promise.all([
            DosageLog.count({ where: dateWhere }),
            User.count(),
            DosageLog.count({ distinct: true, col: 'hn', where: dateWhere }),
            DosageLog.count({ where: { timestamp: { [Op.like]: todayPrefix } } }),
            DosageLog.findAll({
                attributes: ['formula_used', 'prescribed_dose', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                where: dateWhere,
                group: ['formula_used', 'prescribed_dose'],
                raw: true
            }),
            DosageLog.findAll({
                attributes: ['user_name', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                where: leaderboardWhere,
                group: ['user_name'],
                order: [[sequelize.literal('count'), 'DESC']],
                limit: 5,
                raw: true
            }),
            DosageLog.findAll({
                attributes: ['timestamp'],
                where: dateWhere,
                raw: true
            })
        ]);

        const drugCounts = {
            'Vincristine': 0,
            'Carboplatin': 0,
            'Bleomycin': 0,
            'CV Regimen': 0,
            'BC Regimen': 0,
            'Other': 0
        };

        formulaStatsResult.forEach(row => {
            const formula = (row.formula_used || '').trim().toUpperCase();
            const dose = (row.prescribed_dose || '').trim().toUpperCase();
            const count = parseInt(row.count || 0, 10);

            if (formula.includes('CV')) {
                drugCounts['CV Regimen'] += count;
            } else if (formula.includes('BC')) {
                drugCounts['BC Regimen'] += count;
            } else if (dose.includes('+')) {
                if (dose.includes('UNITS')) {
                    drugCounts['BC Regimen'] += count;
                } else {
                    drugCounts['CV Regimen'] += count;
                }
            } else if (dose.includes('UNITS')) {
                drugCounts['Bleomycin'] += count;
            } else if (dose.includes('MG')) {
                const numericDose = parseFloat(dose);
                if (!isNaN(numericDose)) {
                    if (numericDose <= 3.0) {
                        drugCounts['Vincristine'] += count;
                    } else {
                        drugCounts['Carboplatin'] += count;
                    }
                } else {
                    drugCounts['Other'] += count;
                }
            } else {
                drugCounts['Other'] += count;
            }
        });

        const weeklyTrend = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
        allLogs.forEach(log => {
            const date = parseThaiTimestamp(log.timestamp);
            if (date) {
                const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                if (mappedIndex >= 0 && mappedIndex < 7) {
                    weeklyTrend[mappedIndex]++;
                }
            }
        });

        const leaderboard = leaderboardResult.map((row, index) => ({
            rank: index + 1,
            name: row.user_name,
            count: parseInt(row.count || 0, 10)
        }));

        res.json({
            success: true,
            stats: {
                totalCalculations,
                totalUsers,
                totalPatients,
                todayCalculations,
                drugCounts,
                leaderboard,
                weeklyTrend
            }
        });
    } catch (error) {
        console.error('❌ Error compiling stats:', error);
        res.status(500).json({ success: false, message: 'Database query failed: ' + error.message });
    }
});

// 👥 Admin User Management APIs
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'employee_id', 'role', 'must_change_password', 'is_active'],
            order: [['id', 'DESC']]
        });
        res.json({ success: true, users });
    } catch (err) {
        console.error('❌ Fetch users error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];

        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะ (is_active)' });
        }

        const targetUser = await User.findByPk(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ระบุ' });
        }

        // ห้ามผู้ใช้ระงับสิทธิ์ตัวเอง
        if (targetUser.employee_id === employeeId && is_active === 0) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถระงับการใช้งานบัญชีผู้ใช้งานของตนเองได้' });
        }

        await User.update({ is_active }, { where: { id: userId } });

        const statusText = is_active === 1 ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';
        logActivity(employeeId, 'TOGGLE_USER_STATUS', `เปลี่ยนสถานะผู้ใช้ ${targetUser.username} (${targetUser.employee_id}) เป็น ${statusText}`);

        res.json({ success: true, message: `เปลี่ยนสถานะเป็น ${statusText} สำเร็จ` });
    } catch (err) {
        console.error('❌ Update user status error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { username, employee_id, password, role } = req.body;
        const employeeId = req.headers['x-employee-id'];
        if (!username || !employee_id || !password || !role) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }

        const newUser = await User.create({
            username,
            employee_id,
            password,
            role,
            must_change_password: 1
        });

        logActivity(employeeId, 'CREATE_USER', `สร้างผู้ใช้ ${username} (${employee_id}) role=${role}`);
        res.json({ success: true, insertedId: newUser.id });
    } catch (err) {
        console.error('❌ Create user error:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้วในระบบ' });
        }
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, employee_id, password, role, is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];
        if (!username || !employee_id || !role) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }
        if (password && password.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }

        const updateData = password
            ? { username, employee_id, password, role, must_change_password: 1 }
            : { username, employee_id, role };

        if (is_active !== undefined) {
            updateData.is_active = is_active;
        }

        await User.update(updateData, { where: { id: userId } });

        const activeStr = is_active !== undefined ? `, is_active=${is_active}` : '';
        logActivity(employeeId, 'UPDATE_USER', `แก้ไขผู้ใช้ ID ${userId}: username=${username}, employee_id=${employee_id}, role=${role}${activeStr}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Update user error:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้วในระบบ' });
        }
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const employeeId = req.headers['x-employee-id'];

        const checkUser = await User.findOne({ where: { employee_id: employeeId } });
        if (checkUser && checkUser.id == userId) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบผู้ใช้งานของตัวท่านเองได้' });
        }

        await User.destroy({ where: { id: userId } });

        logActivity(employeeId, 'DELETE_USER', `ลบผู้ใช้ ID ${userId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Delete user error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.delete('/api/admin/logs/:id', requireAdmin, async (req, res) => {
    try {
        const logId = req.params.id;
        const employeeId = req.headers['x-employee-id'];

        await DosageLog.destroy({ where: { id: logId } });

        logActivity(employeeId, 'DELETE_LOG', `ลบบันทึกการคำนวณ ID ${logId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Delete log error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// ---------------- Order Logs API ---------------- //
app.post('/api/order-logs', async (req, res) => {
    try {
        const orderData = req.body;
        const newLog = await OrderLog.create(orderData);
        res.status(201).json({ success: true, log: newLog });
    } catch (err) {
        console.error('❌ Save order log error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.get('/api/order-logs', async (req, res) => {
    try {
        const logs = await OrderLog.findAll({
            order: [['id', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (err) {
        console.error('❌ Fetch order logs error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.delete('/api/order-logs/:id', async (req, res) => {
    try {
        const logId = req.params.id;
        const employeeId = req.headers['x-employee-id'] || 'system';
        
        await OrderLog.destroy({ where: { id: logId } });
        logActivity(employeeId, 'DELETE_ORDER_LOG', `ลบบันทึกการสั่งยา ID ${logId}`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Delete order log error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.put('/api/admin/order-logs/:id/toggle-date-unlock', async (req, res) => {
    try {
        const logId = req.params.id;
        const employeeId = req.headers['x-employee-id'];
        
        if (!employeeId) return res.status(401).json({ success: false, message: 'Missing employee ID header' });

        const user = await User.findOne({ where: { employee_id: employeeId } });
        if (!user || user.role.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Only Admin can unlock date editing' });
        }

        const orderLog = await OrderLog.findOne({ where: { id: logId } });
        if (!orderLog) return res.status(404).json({ success: false, message: 'Order log not found' });

        const { is_date_unlocked } = req.body;
        
        await orderLog.update({ is_date_unlocked });
        logActivity(employeeId, 'TOGGLE_DATE_UNLOCK', `${is_date_unlocked ? 'เปิด' : 'ปิด'}การแก้ไขวันที่ของบันทึก ID ${logId}`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Toggle date unlock error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.put('/api/order-logs/:id', async (req, res) => {
    try {
        const logId = req.params.id;
        const employeeId = req.headers['x-employee-id'];
        
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Missing employee ID header' });
        }

        const user = await User.findOne({ where: { employee_id: employeeId } });
        if (!user) {
            return res.status(403).json({ success: false, message: 'Invalid user' });
        }

        const orderLog = await OrderLog.findOne({ where: { id: logId } });
        if (!orderLog) {
            return res.status(404).json({ success: false, message: 'Order log not found' });
        }

        const userRole = user.role.toLowerCase();
        if (userRole === 'pharmacist') {
            const logTime = new Date(orderLog.timestamp).getTime();
            const now = Date.now();
            const diffHours = (now - logTime) / (1000 * 60 * 60);
            if (diffHours > 24) {
                return res.status(403).json({ success: false, message: 'Pharmacists can only edit records within 24 hours of creation.' });
            }
        }

        const { hn, patient_name, ward, doctor, cycle, order_details } = req.body;
        
        await orderLog.update({
            hn, patient_name, ward, doctor, cycle, order_details
        });

        logActivity(employeeId, 'EDIT_ORDER_LOG', `แก้ไขบันทึกการสั่งยา ID ${logId}`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Edit order log error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 👤 API: ดึงข้อมูลคนไข้ทั้งหมด
app.get('/api/patients', async (req, res) => {
    try {
        const { q } = req.query;
        let where = {};
        if (q) {
            where = {
                [Op.or]: [
                    { hn: { [Op.like]: `%${q}%` } },
                    { name: { [Op.like]: `%${q}%` } }
                ]
            };
        }
        const patients = await Patient.findAll({
            where,
            order: [['name', 'ASC']]
        });
        res.json({ success: true, patients });
    } catch (err) {
        console.error('❌ Patients fetch error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 👤 API: เพิ่มหรืออัปเดตข้อมูลคนไข้ (บังคับ H.N. ไม่ซ้ำกันกับคนละชื่อ)
app.post('/api/patients', async (req, res) => {
    try {
        const { hn, title, name, gender, age, height, weight } = req.body;
        if (!hn || !name) {
            return res.status(400).json({ success: false, message: 'กรุณากรอก H.N. และ ชื่อ-นามสกุล' });
        }

        const cleanedTitle = (title || '').trim();
        let cleanedName = (name || '').trim();
        if (cleanedTitle) {
            while (cleanedName.startsWith(cleanedTitle)) {
                cleanedName = cleanedName.substring(cleanedTitle.length).trim();
            }
        }

        const existingPatient = await Patient.findByPk(hn);
        if (existingPatient) {
            // บังคับให้ H.N. ไม่ซ้ำกัน (ถ้าชื่อไม่ตรงกัน ถือเป็นคนละคน และห้ามใช้ H.N. ซ้ำ)
            const existingNameCleaned = existingPatient.name.trim().toLowerCase();
            const inputNameCleaned = cleanedName.toLowerCase();

            // To make sure it doesn't fail for existing patients whose name contains title, we strip title from existing patient's name before comparing
            let dbNameStripped = existingPatient.name.trim();
            if (cleanedTitle) {
                while (dbNameStripped.startsWith(cleanedTitle)) {
                    dbNameStripped = dbNameStripped.substring(cleanedTitle.length).trim();
                }
            }

            if (dbNameStripped.toLowerCase() !== inputNameCleaned && existingNameCleaned !== name.trim().toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: `H.N. นี้ถูกใช้งานแล้วโดยผู้ป่วยชื่อ "${existingPatient.name}" ไม่สามารถบันทึกซ้ำซ้อนได้`
                });
            }
            // อัปเดตข้อมูลผู้ป่วยเดิม
            await existingPatient.update({ title: cleanedTitle, name: cleanedName, gender, age, height, weight });
            return res.json({ success: true, patient: existingPatient });
        } else {
            // สร้างผู้ป่วยรายใหม่
            const newPatient = await Patient.create({ hn, title: cleanedTitle, name: cleanedName, gender, age, height, weight });
            return res.json({ success: true, patient: newPatient });
        }
    } catch (err) {
        console.error('❌ Patient save error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 🧪 API: ดึงข้อมูลตัวทำละลายทั้งหมด
app.get('/api/solvents', async (req, res) => {
    try {
        const solvents = await Solvent.findAll({
            order: [['solvent_name', 'ASC']]
        });
        res.json({ success: true, solvents });
    } catch (err) {
        console.error('❌ Solvents fetch error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 🧪 API: เพิ่มตัวทำละลายใหม่
app.post('/api/solvents', async (req, res) => {
    try {
        let { name } = req.body;
        const employeeId = req.headers['x-employee-id'];

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อตัวทำละลาย' });
        }

        name = name.trim();
        if (!name) {
            return res.status(400).json({ success: false, message: 'ชื่อตัวทำละลายไม่สามารถเป็นค่าว่างได้' });
        }

        // Check duplicates case-insensitively
        const existing = await Solvent.findOne({
            where: sequelize.where(
                sequelize.fn('lower', sequelize.col('solvent_name')),
                name.toLowerCase()
            )
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'ตัวทำละลายนี้มีอยู่ในระบบแล้ว' });
        }

        const newSolvent = await Solvent.create({ solvent_name: name });
        logActivity(employeeId, 'ADD_SOLVENT', `เพิ่มตัวทำละลายใหม่: ${name}`);
        res.json({ success: true, solvent: newSolvent });
    } catch (err) {
        console.error('❌ Create solvent error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 💊 API: ดึงข้อมูลยาทั้งหมดจากตาราง drugs
app.get('/api/drugs', async (req, res) => {
    try {
        const drugs = await Drug.findAll({
            order: [['drug_id', 'ASC']]
        });
        res.json({ success: true, drugs });
    } catch (err) {
        console.error('❌ Drugs fetch error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 📦 API: อัปเดตข้อมูลคลังยาและบรรจุภัณฑ์ (Inventory Management)
app.put('/api/drugs/:id/inventory', requireHeadOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { dose_per_pack, package_type, inventory_qty, inventory_min, inventory_max, is_auto_dispensed } = req.body;
        
        const drug = await Drug.findByPk(id);
        if (!drug) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลยา' });
        }
        
        await drug.update({
            dose_per_pack: dose_per_pack !== undefined ? dose_per_pack : drug.dose_per_pack,
            package_type: package_type !== undefined ? package_type : drug.package_type,
            inventory_qty: inventory_qty !== undefined ? inventory_qty : drug.inventory_qty,
            inventory_min: inventory_min !== undefined ? inventory_min : drug.inventory_min,
            inventory_max: inventory_max !== undefined ? inventory_max : drug.inventory_max,
            is_auto_dispensed: is_auto_dispensed !== undefined ? is_auto_dispensed : drug.is_auto_dispensed
        });
        
        res.json({ success: true, message: 'อัปเดตข้อมูลคลังยาสำเร็จ', drug });
    } catch (err) {
        console.error('❌ Inventory update error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// 👥 Admin Drug Management APIs
app.post('/api/admin/drugs', requireHeadOrAdmin, async (req, res) => {
    try {
        const { drug_code, drug_name, drug_category, calculation_type, default_weight_type, standard_dose_value, standard_dose_unit, max_dose_cap, max_bsa_cap, max_gfr_cap, is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];

        if (!drug_name || !calculation_type) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อยา และ ประเภทการคำนวณ)' });
        }

        const newDrug = await Drug.create({
            drug_code: drug_code || null,
            drug_name,
            drug_category: drug_category || 'CHEMOTHERAPY',
            calculation_type,
            default_weight_type: default_weight_type || 'ACTUAL',
            standard_dose_value: standard_dose_value === '' ? null : standard_dose_value,
            standard_dose_unit,
            max_dose_cap: max_dose_cap === '' ? null : max_dose_cap,
            max_bsa_cap: max_bsa_cap === '' ? null : max_bsa_cap,
            max_gfr_cap: max_gfr_cap === '' ? null : max_gfr_cap,
            is_active: is_active !== undefined ? is_active : 1
        });

        logActivity(employeeId, 'CREATE_DRUG', `เพิ่มยาใหม่: ${drug_name} (${calculation_type})`);
        res.json({ success: true, insertedId: newDrug.drug_id });
    } catch (err) {
        console.error('❌ Create drug error:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'มีชื่อยานี้อยู่แล้วในระบบ' });
        }
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.put('/api/admin/drugs/:id', requireHeadOrAdmin, async (req, res) => {
    try {
        const drugId = req.params.id;
        const { drug_code, drug_name, drug_category, calculation_type, default_weight_type, standard_dose_value, standard_dose_unit, max_dose_cap, max_bsa_cap, max_gfr_cap, is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];

        if (!drug_name || !calculation_type) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }

        await Drug.update({
            drug_code: drug_code || null,
            drug_name,
            drug_category,
            calculation_type,
            default_weight_type,
            standard_dose_value: standard_dose_value === '' ? null : standard_dose_value,
            standard_dose_unit,
            max_dose_cap: max_dose_cap === '' ? null : max_dose_cap,
            max_bsa_cap: max_bsa_cap === '' ? null : max_bsa_cap,
            max_gfr_cap: max_gfr_cap === '' ? null : max_gfr_cap,
            is_active
        }, { where: { drug_id: drugId } });

        logActivity(employeeId, 'UPDATE_DRUG', `แก้ไขยา ID ${drugId}: name=${drug_name}, type=${calculation_type}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Update drug error:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'มีชื่อยานี้อยู่แล้วในระบบ' });
        }
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

app.delete('/api/admin/drugs/:id', requireHeadOrAdmin, async (req, res) => {
    try {
        const drugId = req.params.id;
        const employeeId = req.headers['x-employee-id'];

        const targetDrug = await Drug.findByPk(drugId);
        if (!targetDrug) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลยาที่ต้องการลบ' });
        }

        await Drug.destroy({ where: { drug_id: drugId } });

        logActivity(employeeId, 'DELETE_DRUG', `ลบยา: ${targetDrug.drug_name} (ID: ${drugId})`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Delete drug error:', err);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
});

// Local Print Server Endpoints
const ptp = require('pdf-to-printer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

app.get('/api/printers', (req, res) => {
    const { exec } = require('child_process');
    exec('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', (error, stdout, stderr) => {
        if (error) {
            console.error('Fetch Printers Error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch printers' });
        }
        try {
            const printers = stdout.split('\n').map(p => p.trim()).filter(p => p.length > 0);
            res.json(printers);
        } catch (err) {
            console.error('Parse Printers Error:', err);
            res.status(500).json({ success: false, message: 'Failed to parse printers' });
        }
    });
});

app.post('/api/print', async (req, res) => {
    try {
        const { html, printerName, paperSize = 'A4' } = req.body;
        
        if (!printerName) {
            return res.status(400).json({ success: false, message: 'Printer name is required' });
        }

        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        // Strip out any <script> tags to prevent window.close() or other issues
        const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        await page.setContent(cleanHtml, { waitUntil: 'domcontentloaded' });
        
        let pdfOptions = {
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        };

        if (paperSize === 'Sticker') {
            pdfOptions.width = '80mm';
            pdfOptions.height = '50mm';
        } else if (paperSize === 'A5') {
            pdfOptions.format = 'A5';
        } else {
            pdfOptions.format = 'A4';
        }

        const pdfBuffer = await page.pdf(pdfOptions);
        await browser.close();

        // Write buffer to a temp file
        const tempFilename = `temp_print_${crypto.randomBytes(4).toString('hex')}.pdf`;
        const tempPath = path.join(__dirname, tempFilename);
        fs.writeFileSync(tempPath, pdfBuffer);

        // Print using pdf-to-printer
        await ptp.print(tempPath, { printer: printerName });

        // Clean up temp file after some time
        setTimeout(() => {
            try {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            } catch (e) {
                console.error('Failed to clean up temp file:', e);
            }
        }, 15000);

        res.json({ success: true, message: 'Printed successfully' });
    } catch (err) {
        console.error('Print Error:', err);
        res.status(500).json({ success: false, message: 'Failed to print: ' + err.message });
    }
});


// รัน Server ที่พอร์ต 5004 เป็นตัวกลางกระจายคำสั่ง
const PORT = 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Clinical API Bridge is running on http://localhost:${PORT}`);
});