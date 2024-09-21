const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Role = require("./Role");

const UserAccount = sequelize.define(
  "UserAccount",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isNumeric: true,
        len: [10, 10],
      },
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Nam", "Nữ", "Khác"]],
      },
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: true,
        isDate: true,
        isBefore: new Date().toISOString(),
      },
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: true,
        isInt: true,
      },
    },
  },
  {
    tableName: "user_account",
    timestamps: false,
  }
);
UserAccount.describe().then((description) => {
  console.log(description);
});

module.exports = UserAccount;
