const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RequestSupports = sequelize.define(
  "RequestSupports",
  {
    request_support_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    requestor_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
    resolver_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Đang chờ xử lý",
    },
  },
  {
    tableName: "request_supports",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: true,
  }
);

module.exports = RequestSupports;
