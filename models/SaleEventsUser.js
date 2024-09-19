const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SaleEventsUser = sequelize.define(
  "SaleEventsUser",
  {
    sale_event_user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sale_events_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "SaleEvents",
        key: "sale_events_id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "UserAccount",
        key: "user_id",
      },
    },
  },
  {
    tableName: "sale_events_user",
  }
);

module.exports = SaleEventsUser;
