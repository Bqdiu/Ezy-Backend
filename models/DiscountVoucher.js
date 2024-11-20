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
        model: "sale_events",
        key: "sale_events_id",
      },
    },
    discount_voucher_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "discount_voucher_type",
        key: "discount_voucher_type_id",
      },
    },
    discount_voucher_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount_voucher_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
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
    usage: {
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
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = DiscountVoucher;
