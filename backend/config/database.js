import { Sequelize } from "sequelize";

const db = new Sequelize('pendaftaran', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
});

export default db;