require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

console.log('Seeding solvents to database...');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'oncology_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'admin',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    }
);

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
    }
}, {
    tableName: 'solvents',
    timestamps: false
});

const list = [
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

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');
        
        // Sync model structure
        await Solvent.sync();
        
        for (const name of list) {
            const existing = await Solvent.findOne({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('solvent_name')),
                    name.toLowerCase()
                )
            });
            if (!existing) {
                await Solvent.create({ solvent_name: name });
                console.log(`Added: ${name}`);
            } else {
                console.log(`Exists: ${name}`);
            }
        }
        console.log('All solvents seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error during seeding:', err);
        process.exit(1);
    }
}

seed();
