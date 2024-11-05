const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReturnRequest = sequelize.define(
  "ReturnRequest",
  {
    return_request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "shop",
        key: "shop_id",
      },
    },
    user_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_order",
        key: "user_order_id",
      },
    },
    request_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "return_request",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: true,
  }
);

module.exports = ReturnRequest;
