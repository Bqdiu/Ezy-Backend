const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ViolationTypes = sequelize.define(
  "ViolationTypes",
  {
    violation_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    violation_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    priority_level: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Thấp",
    },
  },
  {
    tableName: "violation_types",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: false,
  }
);

module.exports = ViolationTypes;
