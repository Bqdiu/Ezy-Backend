const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ViolationImgs = sequelize.define(
  "ViolationImgs",
  {
    violation_img_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    violation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "violations",
        key: "violation_id",
      },
    },
    img_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "violation_imgs",
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    timestamps: false,
  }
);

module.exports = ViolationImgs;
