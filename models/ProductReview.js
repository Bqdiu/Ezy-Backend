const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductReview = sequelize.define(
  "ProductReview",
  {
    review_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "UserAccount",
        key: "user_id",
      },
    },
    product_varients_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ProductVarients",
        key: "product_varients_id",
      },
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    review_content: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    updatedAt: false,
    createdAt: false,
    tableName: "product_review",
  }
);

module.exports = ProductReview;
