const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductClassify = sequelize.define(
  "ProductClassify",
  {
    product_classify_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product",
        key: "product_id",
      },
    },
    product_classify_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "product_classify",
    timestamps: false,
  }
);

module.exports = ProductClassify;
