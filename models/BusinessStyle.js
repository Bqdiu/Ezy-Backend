const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BusinessStyle = sequelize.define(
  "BusinessStyle",
  {
    business_style_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    business_style_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "business_style",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

BusinessStyle.describe().then((description) => {
  console.log(description);
});

module.exports = BusinessStyle;
