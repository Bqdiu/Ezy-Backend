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
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "UserAccount",
        key: "user_id",
      },
    },
    sub_category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "SubCategory",
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
  }
);

module.exports = HistorySearch;
