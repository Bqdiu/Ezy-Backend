const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserOrderDetails = sequelize.define(
  "UserOrderDetails",
  {
    user_order_details_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "UserOrder",
        key: "user_order_id",
      },
    },
    product_varients_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ProductVarients",
        key: "product_varients_id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    is_reviewed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "user_order_details",
    updatedAt: false,
    createdAt: false,
  }
);

module.exports = UserOrderDetails;
