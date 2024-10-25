const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserOrderDetails = sequelize.define(
  "UserOrderDetails",
  {
    user_order_details_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "user_order",
        key: "user_order_id",
      },
    },
    product_varients_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_varients",
        key: "product_varients_id",
      },
    },
    varient_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classify: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    discountPrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    is_reviewed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "user_order_details",
    updatedAt: false,
    createdAt: false,
  }
);

module.exports = UserOrderDetails;
