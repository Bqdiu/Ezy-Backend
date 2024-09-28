const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductVarientsService = sequelize.define(
  "ProductVarientsService",
  {
    product_varients_service_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_varients_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_varients",
        key: "product_varients_id",
      },
    },
    service_id: {
      type: DataTypes.INTEGER,
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
    tableName: "product_varients_service",
    timestamps: false,
  }
);

module.exports = ProductVarientsService;
