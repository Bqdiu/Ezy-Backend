const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
  {
    user_order_history_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_order",
        key: "user_order_id",
      },
      unique: "user_order_status_unique",
    },
    order_status_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "order_status",
        key: "order_status_id",
      },
      unique: "user_order_status_unique",
    },
  },
  {
    tableName: "order_status_history",
    timestamps: true,
    indexes: [
      {
        name: "user_order_status_unique",
        unique: true,
        fields: ["user_order_id", "order_status_id"],
      },
    ],
  }
);

module.exports = OrderStatusHistory;
