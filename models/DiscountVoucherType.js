const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DiscountVoucherType = sequelize.define(
  "DiscountVoucherType",
  {
    discount_voucher_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    discount_voucher_type_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "discount_voucher_type",
    timestamps: false,
  }
);

module.exports = DiscountVoucherType;
