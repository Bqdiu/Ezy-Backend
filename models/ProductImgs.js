const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductImgs = sequelize.define(
  "ProductImgs",
  {
    product_imgs_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "product",
        key: "product_id",
      },
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "product_imgs",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ProductImgs;
