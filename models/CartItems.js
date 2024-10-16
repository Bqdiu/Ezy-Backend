const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CartItems = sequelize.define(
  "CartItems",
  {
    cart_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cart_shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cart_shop",
        key: "cart_shop_id",
      },
    },
    product_varients_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_varients",
        key: "product_varients_id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    selected: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "cart_items",
    timestamps: true,
  }
);

module.exports = CartItems;
