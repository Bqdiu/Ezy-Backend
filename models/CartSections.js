const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CartSections = sequelize.define(
  "CartSections",
  {
    cart_id: {
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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "cart_sections",
    timestamps: true,
  }
);

module.exports = CartSections;