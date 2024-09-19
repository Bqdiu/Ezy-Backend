const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BusinessStyle = sequelize.define(
  "BusinessStyle",
  {
    business_style_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    business_style_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "business_style",
  }
);

module.exports = BusinessStyle;
