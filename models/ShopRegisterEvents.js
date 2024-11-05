const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ShopRegisterEvents = sequelize.define(
  "ShopRegisterEvents",
  {
    shop_register_events_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "shop",
        key: "shop_id",
      },
    },
    sale_events_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sale_events",
        key: "sale_events_id",
      },
    },
  },
  {
    tableName: "shop_register_events",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ShopRegisterEvents;
