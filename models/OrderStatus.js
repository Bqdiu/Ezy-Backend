const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrderStatus = sequelize.define(
  "OrderStatus",
  {
    order_status_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_status_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "order_status",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = OrderStatus;
