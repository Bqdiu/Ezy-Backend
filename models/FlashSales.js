const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FlashSales = sequelize.define(
  "FlashSales",
  {
    flash_sales_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    flash_sales_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "flash_sales",
    timestamps: true,
  }
);

module.exports = FlashSales;
