const sequelize = require("../config/database");
const { Op } = require("sequelize");
const { UserAccount, ProductVarients } = require("../models/Assosiations");

const checkout = async (req, res) => {
  try {
    const { user_id, paymentMethodID, totalPayment, validCart } = req.body;

    const user = await UserAccount.findOne({
      where: {
        user_id,
      },
    });
    if (!user) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy người dùng" });
    }

    for (const shop of validCart) {
      for (const item of shop.CartItems) {
        const productVarient = await ProductVarients.findOne({
          where: {
            product_varients_id: item.product_varients_id,
          },
        });
        if (!productVarient) {
          return res
            .status(404)
            .json({ error: true, message: "Không tìm thấy sản phẩm" });
        }
        if (item.quantity > productVarient.stock) {
          return res
            .status(400)
            .json({ error: true, message: "Số lượng sản phẩm không đủ" });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Thanh toán thành công",
    });
  } catch (error) {
    console.log("Error in checkout: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

module.exports = {
  checkout,
};
