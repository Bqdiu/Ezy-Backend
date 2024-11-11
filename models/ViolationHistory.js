const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ViolationHistory = sequelize.define(
  "ViolationHistory",
  {
    violation_history_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    violator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
    action_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Đã xử lý",
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updated_by_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "violation_history",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ViolationHistory;
