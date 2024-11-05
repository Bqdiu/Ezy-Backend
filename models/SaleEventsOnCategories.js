const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SaleEventsOnCategories = sequelize.define(
  "SaleEventsOnCategories",
  {
    sale_events_on_categories_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sale_events_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sale_events",
        key: "sale_events_id",
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "category",
        key: "category_id",
      },
    },
  },
  {
    tableName: "sale_events_on_categories",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = SaleEventsOnCategories;
