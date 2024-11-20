const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DiscountVoucherUsage = sequelize.define(
  "DiscountVoucherUsage",
  {
    discount_voucher_usage_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    discount_voucher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "discount_voucher",
        key: "discount_voucher_id",
      },
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
    usage: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "discount_voucher_usage",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = DiscountVoucherUsage;
