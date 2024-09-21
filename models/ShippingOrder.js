const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ShippingOrder = sequelize.define(
  "ShippingOrder",
  {
    shipping_order_id: {
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
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "shipping_provider",
        key: "provider_id",
      },
    },
    order_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tracking_number: {
      type: DataTypes.STRING,
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
    updatedAt: false,
    createdAt: false,
    tableName: "shipping_order",
    timestamps: false,
  }
);

module.exports = ShippingOrder;
