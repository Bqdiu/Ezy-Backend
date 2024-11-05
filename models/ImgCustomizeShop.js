const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ImgCustomizeShop = sequelize.define(
  "ImgCustomizeShop",
  {
    img_customize_shop_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customize_shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "customize_shop",
        key: "customize_shop_id",
      },
    },
    img_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "img_customize_shop",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = ImgCustomizeShop;
