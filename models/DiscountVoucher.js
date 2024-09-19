const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DiscountVoucher = sequelize.define(
  "DiscountVoucher",
  {
    discount_voucher_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sale_events_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "SaleEvents",
        key: "sale_events_id",
      },
    },
    discount_voucher_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    min_order_value: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    discount_value: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    discount_max_value: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "discount_voucher",
  }
);

module.exports = DiscountVoucher;
