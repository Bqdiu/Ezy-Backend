const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserOrder = sequelize.define(
  "UserOrder",
  {
    user_order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "UserAddress",
        key: "user_address_id",
      },
    },
    order_status_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "OrderStatus",
        key: "order_status_id",
      },
    },
    total_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_order",
    updatedAt: false,
    createdAt: false,
  }
);

module.exports = UserOrder;
