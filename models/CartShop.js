const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CartShop = sequelize.define(
  "CartShop",
  {
    cart_shop_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cart_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cart_sections",
        key: "cart_id",
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
    total_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "cart_shop",
    timestamps: true,
  }
);

module.exports = CartShop;
