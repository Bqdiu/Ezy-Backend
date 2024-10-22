const { model } = require("mongoose");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

const {
  DiscountVoucherType,
  DiscountVoucher,
  UserAccount,
  SaleEvents,
  SaleEventsUser,
  SaleEventsOnCategories,
} = require("../models/Assosiations");

const calculateMaxVoucherValue = (voucher) => {
  let value = 0;
  if (voucher.discount_type === "THEO PHẦN TRĂM") {
    value = voucher.discount_max_value;
  } else if (
    voucher.discount_type === "KHÔNG THEO PHẦN TRĂM" ||
    voucher.discount_type === "MIỄN PHÍ VẬN CHUYỂN"
  ) {
    value = voucher.discount_value;
  }
  return value;
};

const getVoucherList = async (req, res) => {
  try {
    const { user_id } = req.query;

    const validEvents = await SaleEvents.findAll({
      where: {
        started_at: {
          [Op.lte]: new Date(), // Thời gian bắt đầu <= ngày hiện tại
        },
        ended_at: {
          [Op.gt]: new Date(), // Thời gian kết thúc > ngày hiện tại
        },
      },
      include: [
        {
          model: SaleEventsUser,
          where: {
            user_id,
          },
        },
      ],
    });

    if (validEvents.length === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Không có sự kiện nào diễn ra" });
    }

    const validEventIds = validEvents.map((event) => event.sale_events_id);

    const validVouchers = await DiscountVoucher.findAll({
      where: {
        sale_events_id: {
          [Op.in]: validEventIds,
        },
      },
      include: [
        {
          model: DiscountVoucherType,
        },
        {
          model: SaleEvents,
          include: {
            model: SaleEventsOnCategories,
          },
        },
      ],
    });
    if (validVouchers.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Không có voucher hợp lệ cho sự kiện này",
      });
    }

    const sortVouchers = validVouchers.sort((a, b) => {
      const valueA = calculateMaxVoucherValue(a);
      const valueB = calculateMaxVoucherValue(b);
      return valueB - valueA;
    });

    res.status(200).json({
      success: true,
      data: sortVouchers,
    });
  } catch (error) {
    console.log("Lỗi fetch voucher: ", error);
    res.status(500).json({ error: true, message: error.message || error });
  }
};

module.exports = {
  getVoucherList,
};
