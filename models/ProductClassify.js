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
    type_name: {
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
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ProductClassify;
