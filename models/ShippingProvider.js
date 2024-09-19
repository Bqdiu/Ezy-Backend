const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ShippingProvider = sequelize.define(
  "ShippingProvider",
  {
    provider_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    provider_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    api_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    api_key: {
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
    tableName: "shipping_provider",
    updatedAt: false,
    createdAt: false,
  }
);

module.exports = ShippingProvider;
