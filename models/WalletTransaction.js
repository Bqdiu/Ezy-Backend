const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    wallet_transaction_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_wallet",
        key: "user_wallet_id",
      },
    },
    transaction_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    transaction_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "wallet_transaction",
    updatedAt: false,
    createdAt: false,
  }
);

module.exports = WalletTransaction;
