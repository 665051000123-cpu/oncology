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
    age: DataTypes.STRING(20)
}, {
    tableName: 'dosage_logs',
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
    created_at: DataTypes.DATE
}, {
    tableName: 'drugs',
    timestamps: false
});

// Associations
ActivityLog.belongsTo(User, { foreignKey: 'employee_id', targetKey: 'employee_id', as: 'user', constraints: false });

// Initialize and sync models
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('🚀 Connected to MySQL Database (Sequelize).');
        
        // Sync models with DB (automatically creates tables if they do not exist)
        await sequelize.sync();
        console.log('✅ Database schema synchronized.');

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
        const { timestamp, hn, patientName, calculatedBsaM2, formulaUsed, prescribedDose, userName, gender, age, employee_id } = req.body;

        const newLog = await DosageLog.create({
            timestamp,
            hn,
            patient_name: patientName,
            calculated_bsa: calculatedBsaM2,
            formula_used: formulaUsed,
            prescribed_dose: prescribedDose,
            user_name: userName,
            gender,
            age
        });

        // บันทึกกิจกรรมการคำนวณและตรวจสอบโดสยา
        const empId = employee_id || '';
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

// Middleware to verify admin or chief role based on employee_id header
async function requireChiefOrAdmin(req, res, next) {
    try {
        const employeeId = req.headers['x-employee-id'];
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Missing employee ID header' });
        }
        const user = await User.findOne({ where: { employee_id: employeeId } });
        if (!user || (user.role.toUpperCase() !== 'ADMIN' && user.role.toUpperCase() !== 'CHIEF')) {
            return res.status(403).json({ success: false, message: 'Admin or Chief Pharmacist access required' });
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
            leaderboardResult
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
                leaderboard
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

// 👥 Admin Drug Management APIs
app.post('/api/admin/drugs', requireChiefOrAdmin, async (req, res) => {
    try {
        const { drug_code, drug_name, calculation_type, default_weight_type, standard_dose_value, standard_dose_unit, max_dose_cap, max_bsa_cap, max_gfr_cap, is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];
        
        if (!drug_name || !calculation_type) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อยา และ ประเภทการคำนวณ)' });
        }

        const newDrug = await Drug.create({
            drug_code: drug_code || null,
            drug_name,
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

app.put('/api/admin/drugs/:id', requireChiefOrAdmin, async (req, res) => {
    try {
        const drugId = req.params.id;
        const { drug_code, drug_name, calculation_type, default_weight_type, standard_dose_value, standard_dose_unit, max_dose_cap, max_bsa_cap, max_gfr_cap, is_active } = req.body;
        const employeeId = req.headers['x-employee-id'];

        if (!drug_name || !calculation_type) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }

        await Drug.update({
            drug_code: drug_code || null,
            drug_name,
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

app.delete('/api/admin/drugs/:id', requireChiefOrAdmin, async (req, res) => {
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

// รัน Server ที่พอร์ต 5004 เป็นตัวกลางกระจายคำสั่ง
const PORT = 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Clinical API Bridge is running on http://localhost:${PORT}`);
});