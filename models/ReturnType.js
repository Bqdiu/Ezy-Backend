const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReturnType = sequelize.define(
  "ReturnType",
  {
    return_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    return_type_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "return_type",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: false,
  }
);

module.exports = ReturnType;
