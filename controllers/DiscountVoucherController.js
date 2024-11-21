const sequelize = require("../config/database");
const { Op } = require("sequelize");

const {
  DiscountVoucherType,
  DiscountVoucher,
  UserAccount,
  SaleEvents,
  SaleEventsUser,
  SaleEventsOnCategories,
  ShopRegisterEvents,
  DiscountVoucherUsage,
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
    // const { user_id } = req.query;
    const { user_id, totalPayment, cart } = req.body;

    console.log("totalPayment: ", totalPayment);

    const validEvents = await SaleEvents.findAll({
      where: {
        is_actived: true,
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
        quantity: {
          [Op.gt]: 0,
        },
        started_at: {
          [Op.lte]: new Date(),
        },
        ended_at: {
          [Op.gt]: new Date(),
        },
      },
      include: [
        {
          model: DiscountVoucherType,
        },
        {
          model: SaleEvents,
          include: [
            {
              model: SaleEventsOnCategories,
            },
            {
              model: ShopRegisterEvents,
            },
          ],
        },
      ],
    });

    const usedVouchers = await DiscountVoucherUsage.findAll({
      where: {
        user_id,
        discount_voucher_id: {
          [Op.in]: validVouchers.map((voucher) => voucher.discount_voucher_id),
        },
      },
    });

    if (validVouchers.length === 0) {
      return res.status(404).json({
        error: true,
        message: "Không có voucher hợp lệ cho sự kiện này",
      });
    }

    const usageMap = usedVouchers.reduce((acc, usage) => {
      acc[usage.discount_voucher_id] = usage.total_used; // Sử dụng total_used thay vì usage
      return acc;
    }, {});

    let cartSelected = cart.filter((item) => item.selected === 1);
    const vouchersWithValidity = validVouchers.map((voucher) => {
      const isOrderValueValid =
        totalPayment?.totalPrice >= voucher.min_order_value;
      const currentUsage = usageMap[voucher.discount_voucher_id] || 0;
      const maxUsage = voucher.usage;
      const isUsageValid = currentUsage < maxUsage;
      console.log("totalPayment: ", totalPayment);
      console.log(voucher.min_order_value);
      console.log("isOrderValueValid: ", isOrderValueValid);
      const validCategories = voucher.SaleEvent.SaleEventsOnCategories.map(
        (category) => category.category_id
      );
      console.log("validCategories: ", validCategories);
      console.log("cartSelected: ", cartSelected[0]?.CartItems);
      const hasValidCategory = cartSelected.some((cartItem) =>
        cartItem?.CartItems?.some((item) =>
          validCategories.includes(
            item?.ProductVarient?.Product?.SubCategory?.category_id
          )
        )
      );

      console.log("hasValidCategory: ", hasValidCategory);

      const shopParticipatesInEvent = cartSelected.some((cartItem) =>
        voucher.SaleEvent.ShopRegisterEvents.some(
          (event) => event.shop_id === cartItem.shop_id
        )
      );

      console.log("shopParticipatesInEvent: ", shopParticipatesInEvent);

      const isVoucherValid =
        isUsageValid &&
        isOrderValueValid &&
        hasValidCategory &&
        shopParticipatesInEvent;
      console.log("isVoucherValid: ", isVoucherValid);
      return {
        ...voucher.dataValues,
        isVoucherValid,
      };
    });

    const sortVouchers = vouchersWithValidity.sort((a, b) => {
      if (a.isVoucherValid && !b.isVoucherValid) {
        return -1;
      }
      if (!a.isVoucherValid && b.isVoucherValid) {
        return 1;
      }

      const valueA = calculateMaxVoucherValue(a);
      const valueB = calculateMaxVoucherValue(b);
      return valueB - valueA;
    });

    const voucherFreeShip = sortVouchers.filter(
      (voucher) => voucher.discount_voucher_type_id === 1
    );

    const voucherDiscount = sortVouchers.filter(
      (voucher) => voucher.discount_voucher_type_id === 2
    );

    res.status(200).json({
      success: true,
      data: {
        voucherFreeShip,
        voucherDiscount,
      },
    });
  } catch (error) {
    console.log("Lỗi fetch voucher: ", error);
    res.status(500).json({ error: true, message: error.message || error });
  }
};

const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await DiscountVoucher.findAll();
    res.status(200).json({ success: true, vouchers });
  } catch (error) {
    console.log("Lỗi fetch voucher: ", error);
    res.status(500).json({ error: true, message: error.message || error });
  }
};

const addVoucher = async (req, res) => {
  try {
    const {
      sale_events_id,
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at,
      ended_at,
    } = req.body;

    const newVoucher = await DiscountVoucher.create({
      sale_events_id,
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at,
      ended_at,
    });

    res.status(201).json({ success: true, voucher: newVoucher });
  } catch (error) {
    console.error("Error adding voucher: ", error);
    res
      .status(500)
      .json({ error: true, message: error.message || "Server error" });
  }
};

const getAllDiscountVoucherType = async (req, res) => {
  try {
    const voucherTypes = await DiscountVoucherType.findAll();
    res.status(200).json({ success: true, voucherTypes });
  } catch (error) {
    console.error("Error fetching voucher types: ", error);
    res
      .status(500)
      .json({ error: true, message: error.message || "Server error" });
  }
};

const addVoucherByEventId = async (req, res) => {
  try {
    const {
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at,
      ended_at,
    } = req.body;

    // Extract sale_events_id from the URL parameters
    const sale_events_id = req.params.id;

    // Verify if the sale event exists
    const saleEvent = await SaleEvents.findByPk(sale_events_id);
    if (!saleEvent) {
      return res
        .status(404)
        .json({ error: true, message: "Sale event not found." });
    }

    // Create a new voucher associated with the sale event
    const newVoucher = await DiscountVoucher.create({
      sale_events_id,
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at: new Date(started_at),
      ended_at: new Date(ended_at),
    });

    res.status(201).json({ success: true, voucher: newVoucher });
  } catch (error) {
    console.error("Error adding voucher:", error);
    res
      .status(500)
      .json({ error: true, message: error.message || "Server error" });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at,
      ended_at,
    } = req.body;

    // Find the voucher by ID
    const voucher = await DiscountVoucher.findByPk(id);
    if (!voucher) {
      return res
        .status(404)
        .json({ error: true, message: "Voucher not found." });
    }

    // Directly assign values from request, assuming all fields are provided by frontend
    await voucher.update({
      discount_voucher_type_id,
      discount_voucher_code,
      discount_voucher_name,
      description,
      discount_type,
      min_order_value,
      discount_value,
      discount_max_value,
      quantity,
      usage,
      started_at: started_at ? new Date(started_at) : voucher.started_at,
      ended_at: ended_at ? new Date(ended_at) : voucher.ended_at,
    });

    res.status(200).json({
      success: true,
      message: "Voucher updated successfully",
      voucher,
    });
  } catch (error) {
    console.error("Error updating voucher:", error);
    res
      .status(500)
      .json({ error: true, message: error.message || "Server error" });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the voucher by ID
    const voucher = await DiscountVoucher.findByPk(id);
    if (!voucher) {
      return res
        .status(404)
        .json({ error: true, message: "Voucher not found." });
    }

    await voucher.destroy();

    res
      .status(200)
      .json({ success: true, message: "Voucher deleted successfully" });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    res
      .status(500)
      .json({ error: true, message: error.message || "Server error" });
  }
};

module.exports = {
  getVoucherList,
  getAllVouchers,
  addVoucher,
  getAllDiscountVoucherType,
  addVoucherByEventId,
  updateVoucher,
  deleteVoucher,
};
