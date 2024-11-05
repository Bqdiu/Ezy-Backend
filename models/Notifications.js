const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notifications = sequelize.define(
  "Notifications",
  {
    notification_id: {
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
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "notifications",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

module.exports = Notifications;