const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserOrder = sequelize.define(
  "UserOrder",
  {
    user_order_id: {
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
    user_address_string: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    final_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    shipping_fee: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    discount_shipping_fee: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    discount_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    payment_method_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "payment_method",
        key: "payment_method_id",
      },
    },
    transaction_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    order_note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    return_expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    order_status_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "order_status",
        key: "order_status_id",
      },
    },
    is_reviewed: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "user_order",
    updatedAt: false,
    createdAt: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = UserOrder;
