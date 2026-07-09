const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'oncology_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'admin',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

async function alterTable() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection established.');
        
        const queries = [
            "ALTER TABLE drugs ADD COLUMN dose_per_pack DECIMAL(10,2) NULL;",
            "ALTER TABLE drugs ADD COLUMN package_type VARCHAR(50) NULL;",
            "ALTER TABLE drugs ADD COLUMN inventory_qty DECIMAL(10,2) DEFAULT 0;",
            "ALTER TABLE drugs ADD COLUMN inventory_min DECIMAL(10,2) DEFAULT 0;",
            "ALTER TABLE drugs ADD COLUMN inventory_max DECIMAL(10,2) DEFAULT 0;",
            "ALTER TABLE drugs ADD COLUMN is_auto_dispensed TINYINT(1) DEFAULT 0;"
        ];
        
        for (let q of queries) {
            try {
                await sequelize.query(q);
                console.log(`✅ Executed: ${q}`);
            } catch (err) {
                if (err.message.includes('Duplicate column name')) {
                    console.log(`ℹ️ Column already exists: ${q.split('ADD COLUMN ')[1].split(' ')[0]}`);
                } else {
                    console.log(`❌ Error executing: ${q}`, err.message);
                }
            }
        }
        console.log('🎉 Schema update complete.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

alterTable();
