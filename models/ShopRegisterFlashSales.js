const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ShopRegisterFlashSales = sequelize.define(
  "ShopRegisterFlashSales",
  {
    shop_register_flash_sales_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "shop",
        key: "shop_id",
      },
    },
    flash_sales_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "flash_sales",
        key: "flash_sales_id",
      },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product",
        key: "product_id",
      },
    },
    original_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    flash_sale_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "shop_register_flash_sales",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ShopRegisterFlashSales;
