const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SaleEventsUser = sequelize.define(
  "SaleEventsUser",
  {
    sale_events_user_id: {
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
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
  },
  {
    tableName: "sale_events_user",
    timestamps: false,
  }
);

module.exports = SaleEventsUser;
