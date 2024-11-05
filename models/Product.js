const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Shop",
        key: "shop_id",
      },
    },
    sub_category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sub_category",
        key: "sub_category_id",
      },
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_varient_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    gender_object: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    origin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    base_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
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
    stock: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sold: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    visited: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    product_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    avgRating: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
  },
  {
    tableName: "product",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = Product;
