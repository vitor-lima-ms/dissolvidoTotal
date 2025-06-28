const { DataTypes } = require("sequelize");

const db = require("../db/conn");

const Sample = db.define("Sample", {
  importId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  point: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = Sample;
