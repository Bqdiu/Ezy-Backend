const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Role = require("./Role");

const UserAccount = sequelize.define(
  "UserAccount",
  {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci",
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    security_password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: true,
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
      allowNull: true,
      validate: {
        notEmpty: true,
        isNumeric: true,
        len: [10, 10],
      },
    },
    gender: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        isIn: [["Nam", "Nữ", "Khác"]],
      },
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        notEmpty: true,
        isDate: true,
        isBefore: new Date().toISOString(),
      },
    },
    avt_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: true,
        isInt: true,
      },
    },
    setup: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    email_history: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_banned: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
    },
  },
  {
    tableName: "user_account",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);
UserAccount.describe().then((description) => {
  console.log(description);
});

module.exports = UserAccount;
