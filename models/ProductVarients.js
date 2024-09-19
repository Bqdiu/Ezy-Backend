const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductVarients = sequelize.define(
  "ProductVarients",
  {
    product_varients_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Product",
        key: "product_id",
      },
    },
    product_classify_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ProductClassify",
        key: "product_classify_id",
      },
    },
    product_size_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "ProductSize",
        key: "product_size_id",
      },
    },
    classify: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    stock: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sale_percents: {
      type: DataTypes.DOUBLE,
      allowNull: true,
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
    tableName: "product_varients",
  }
);

module.exports = ProductVarients;
