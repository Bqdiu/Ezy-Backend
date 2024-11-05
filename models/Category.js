const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define(
  "Category",
  {
    category_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "category",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = Category;
