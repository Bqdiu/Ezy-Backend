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
      allowNull: true,
      references: {
        model: "product_classify",
        key: "product_classify_id",
      },
    },
    product_size_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "product_size",
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
      allowNull: true,
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    sale_percents: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    discounted_price: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },
    height: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: 0,
    },
    width: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: 0,
    },
    length: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: 0,
    },
    weight: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: 0,
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
    timestamps: false,
  }
);

module.exports = ProductVarients;
