const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentMethod = sequelize.define(
  "PaymentMethod",
  {
    payment_method_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_method_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "payment_method",
    timestamps: true,
  }
);

module.exports = PaymentMethod;
