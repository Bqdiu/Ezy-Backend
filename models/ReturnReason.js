const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReturnReason = sequelize.define(
  "ReturnReason",
  {
    return_reason_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    return_reason_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "return_reason",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: true,
  }
);

module.exports = ReturnReason;
