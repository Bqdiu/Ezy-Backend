const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserAddress = sequelize.define(
  "UserAddress",
  {
    user_address_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_account",
        key: "user_id",
      },
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.CHAR,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "user_address",
    timestamps: false,
  }
);

module.exports = UserAddress;
