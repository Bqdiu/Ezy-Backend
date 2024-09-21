const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SaleEvents = sequelize.define(
  "SaleEvents",
  {
    sale_events_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sale_events_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "sale_events",
    timestamps: false,
  }
);

module.exports = SaleEvents;
