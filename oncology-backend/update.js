const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('oncology_db', 'root', 'admin', {
    host: 'localhost',
    dialect: 'mysql'
});

async function run() {
    try {
        await sequelize.query("UPDATE users SET role = 'head' WHERE role = 'chief'");
        console.log("Roles updated successfully!");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
