const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FlashSaleTimerFrame = sequelize.define(
  "FlashSaleTimeFrame",
  {
    flash_sale_time_frame_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    flash_sales_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "flash_sales",
        key: "flash_sales_id",
      },
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "flash_sale_time_frame",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
    indexes: [
      {
        unique: true,
        fields: ["flash_sales_id", "started_at", "ended_at"],
      },
    ],
  }
);

module.exports = FlashSaleTimerFrame;
