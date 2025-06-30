require("dotenv").config();
const { Sequelize } = require("sequelize");

const dbPort = process.env.DB_PORT;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: dbPort ? parseInt(dbPort, 10) : 3306,
    dialect: "mysql",
    dialectOptions: {
      charset: "utf8mb4",
    },
  }
);

try {
  sequelize.authenticate();
  console.log("Conectado ao MySQL com sucesso.");
} catch (error) {
  console.log(error);
}

module.exports = sequelize;
