const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ViolationActions = sequelize.define(
  "ViolationActions",
  {
    violation_action_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    violation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "violations",
        key: "violation_id",
      },
    },
    action_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Cảnh Cáo",
    },
    date_performed: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "violation_actions",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ViolationActions;
