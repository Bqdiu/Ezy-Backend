const sequelize = require("../config/database");
const { Op } = require("sequelize");
const { OrderStatus } = require("../models/Assosiations");

const getOrderStatus = async (req, res) => {
  try {
    const orderStatus = await OrderStatus.findAll();
    orderStatus.push({ order_status_id: -1, order_status_name: "Tất cả" });
    orderStatus.sort((a, b) => a.order_status_id - b.order_status_id);
    return res.status(200).json({ success: true, data: orderStatus });
  } catch (error) {
    console.log("Lỗi khi getOrderStatus", error);
    return res
      .status(500)
      .json({ error: true, message: "Lỗi khi getOrderStatus" });
  }
};

module.exports = { getOrderStatus };
