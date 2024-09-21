const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Shop = sequelize.define(
  "Shop",
  {
    shop_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shop_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    business_style_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "business_style",
        key: "business_style_id",
      },
    },
    business_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total_reviews: {
      type: DataTypes.BIGINT,
      allowNull: true,
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
    shop_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    citizen_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
  },
  {
    updatedAt: false,
    createdAt: false,
    tableName: "shop",
  }
);

module.exports = Shop;
