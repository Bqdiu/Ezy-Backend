const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SubCategory = sequelize.define(
  "SubCategory",
  {
    sub_category_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "category",
        key: "category_id",
      },
    },
    sub_category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "sub_category",
    timestamps: false,
  }
);

module.exports = SubCategory;
