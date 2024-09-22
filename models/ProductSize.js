const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductSize = sequelize.define(
  "ProductSize",
  {
    product_size_id: {
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
    product_size_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type_of_size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "product_size",
    timestamps: false,
  }
);

module.exports = ProductSize;
