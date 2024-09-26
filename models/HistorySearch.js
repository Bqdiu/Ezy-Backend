const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HistorySearch = sequelize.define(
  "HistorySearch",
  {
    history_search_id: {
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
    sub_category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sub_category",
        key: "sub_category_id",
      },
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["user_id", "sub_category_id"],
      },
    ],
    tableName: "history_search",
    timestamps: false,
  }
);

module.exports = HistorySearch;
