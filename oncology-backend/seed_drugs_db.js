const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

async function run() {
    // 1. Connect and seed MySQL directly
    const sequelize = new Sequelize('oncology_db', 'root', 'admin', {
        host: 'localhost',
        dialect: 'mysql',
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('Connected to database to seed drugs.');

        // Define Drug model exactly as in server.js to insert records
        const Drug = sequelize.define('Drug', {
            drug_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            drug_code: DataTypes.STRING(50),
            drug_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true
            },
            drug_category: {
                type: DataTypes.ENUM('CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'SUPPORTIVE_CARE'),
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
            }
        }, {
            tableName: 'drugs',
            timestamps: false
        });

        const defaultDrugs = [
            {
                drug_code: 'VINCRISTINE',
                drug_name: 'VINCRISTINE',
                drug_category: 'CHEMOTHERAPY',
                calculation_type: 'BSA',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 1.40,
                standard_dose_unit: 'mg/m2',
                max_dose_cap: 2.00
            },
            {
                drug_code: 'CARBOPLATIN',
                drug_name: 'CARBOPLATIN',
                drug_category: 'CHEMOTHERAPY',
                calculation_type: 'CALVERT_FORMULA',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 5.00,
                standard_dose_unit: 'Target AUC',
                max_gfr_cap: 125
            },
            {
                drug_code: 'BLEOMYCIN',
                drug_name: 'BLEOMYCIN',
                drug_category: 'CHEMOTHERAPY',
                calculation_type: 'FIXED_DOSE',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 30.00,
                standard_dose_unit: 'units'
            },
            {
                drug_code: 'CISPLATIN',
                drug_name: 'CISPLATIN',
                drug_category: 'CHEMOTHERAPY',
                calculation_type: 'BSA',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 75.00,
                standard_dose_unit: 'mg/m2'
            },
            {
                drug_code: 'TRASTUZUMAB',
                drug_name: 'TRASTUZUMAB',
                drug_category: 'TARGETED_THERAPY',
                calculation_type: 'WEIGHT_BASED',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 6.00,
                standard_dose_unit: 'mg/kg'
            },
            {
                drug_code: 'PEMBROLIZUMAB',
                drug_name: 'PEMBROLIZUMAB',
                drug_category: 'IMMUNOTHERAPY',
                calculation_type: 'FIXED_DOSE',
                default_weight_type: 'ACTUAL',
                standard_dose_value: 200.00,
                standard_dose_unit: 'mg'
            }
        ];

        for (const d of defaultDrugs) {
            const [inst, created] = await Drug.findOrCreate({
                where: { drug_name: d.drug_name },
                defaults: d
            });
            if (created) {
                console.log(`Seeded drug: ${d.drug_name}`);
            } else {
                // Update to make active and ensure all parameters are set correctly
                await inst.update(d);
                console.log(`Updated drug: ${d.drug_name}`);
            }
        }
        console.log('✅ Default drugs seeded successfully in MySQL.');

    } catch (err) {
        console.error('❌ Failed to seed drugs:', err);
    } finally {
        await sequelize.close();
    }

    // 2. Modify server.js to add auto-seeding logic
    const serverPath = path.join(__dirname, 'server.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');

    const injectionRegex = /console\.log\(`✅ Seeded \${defaultSolvents\.length\} default solvents\.\`\);\s*\}\s*\}/;

    const seedCode = `console.log(\`✅ Seeded \${defaultSolvents.length} default solvents.\`);
        }

        // Seed default drugs if empty or has low count
        const drugCount = await Drug.count();
        if (drugCount <= 1) {
            console.log('💊 Seeding default drugs...');
            const defaultDrugsList = [
                {
                    drug_code: 'VINCRISTINE',
                    drug_name: 'VINCRISTINE',
                    drug_category: 'CHEMOTHERAPY',
                    calculation_type: 'BSA',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 1.40,
                    standard_dose_unit: 'mg/m2',
                    max_dose_cap: 2.00
                },
                {
                    drug_code: 'CARBOPLATIN',
                    drug_name: 'CARBOPLATIN',
                    drug_category: 'CHEMOTHERAPY',
                    calculation_type: 'CALVERT_FORMULA',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 5.00,
                    standard_dose_unit: 'Target AUC',
                    max_gfr_cap: 125
                },
                {
                    drug_code: 'BLEOMYCIN',
                    drug_name: 'BLEOMYCIN',
                    drug_category: 'CHEMOTHERAPY',
                    calculation_type: 'FIXED_DOSE',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 30.00,
                    standard_dose_unit: 'units'
                },
                {
                    drug_code: 'CISPLATIN',
                    drug_name: 'CISPLATIN',
                    drug_category: 'CHEMOTHERAPY',
                    calculation_type: 'BSA',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 75.00,
                    standard_dose_unit: 'mg/m2'
                },
                {
                    drug_code: 'TRASTUZUMAB',
                    drug_name: 'TRASTUZUMAB',
                    drug_category: 'TARGETED_THERAPY',
                    calculation_type: 'WEIGHT_BASED',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 6.00,
                    standard_dose_unit: 'mg/kg'
                },
                {
                    drug_code: 'PEMBROLIZUMAB',
                    drug_name: 'PEMBROLIZUMAB',
                    drug_category: 'IMMUNOTHERAPY',
                    calculation_type: 'FIXED_DOSE',
                    default_weight_type: 'ACTUAL',
                    standard_dose_value: 200.00,
                    standard_dose_unit: 'mg'
                }
            ];

            for (const d of defaultDrugsList) {
                await Drug.findOrCreate({
                    where: { drug_name: d.drug_name },
                    defaults: d
                });
            }
            console.log('✅ Seeded default drugs.');
        }
    }`;

    if (!serverContent.includes('const defaultDrugsList =')) {
        if (injectionRegex.test(serverContent)) {
            serverContent = serverContent.replace(injectionRegex, seedCode);
            fs.writeFileSync(serverPath, serverContent, 'utf8');
            console.log('✅ Added auto-seeding logic to server.js');
        } else {
            console.error('❌ Failed to match injectionRegex in server.js');
        }
    } else {
        console.log('ℹ️ Auto-seeding logic already in server.js');
    }
}

run();
