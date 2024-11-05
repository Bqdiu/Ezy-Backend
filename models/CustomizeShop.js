const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CustomizeShop = sequelize.define(
  "CustomizeShop",
  {
    customize_shop_id: {
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
  },
  {
    tableName: "customize_shop",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = CustomizeShop;
