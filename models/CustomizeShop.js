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
    img_carousel_1: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    img_carousel_2: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    img_carousel_3: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "customize_shop",
    timestamps: false,
  }
);

module.exports = CustomizeShop;
