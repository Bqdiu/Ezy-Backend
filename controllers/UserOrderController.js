const sequelize = require("../config/database");
const { Op } = require("sequelize");

const {
  UserOrder,
  UserOrderDetails,
  OrderStatusHistory,
  DiscountVoucher,
  ProductVarients,
} = require("../models/Assosiations");

const checkPaid = async (orderId) => {
  try {
    const orderStatusHistory = await OrderStatusHistory.findAll({
      where: {
        user_order_id: orderId,
      },
    });

    if (orderStatusHistory[0].order_status_id === 1) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Lỗi khi lấy trạng thái đơn hàng: ", error);
  }
};

const deleteOrder = async (orderId, selectedVoucher) => {
  try {
    const order = await UserOrder.findOne({
      where: {
        user_order_id: orderId,
      },
      include: [
        {
          model: UserOrderDetails,
        },
      ],
    });

    if (order) {
      const { discountVoucher, shippingVoucher } = selectedVoucher;
      if (discountVoucher) {
        await DiscountVoucher.increment(
          { quantity: 1 },
          {
            where: {
              discount_voucher_id: discountVoucher.discount_voucher_id,
            },
          }
        );
      }
      if (shippingVoucher) {
        await DiscountVoucher.increment(
          { quantity: 1 },
          {
            where: {
              discount_voucher_id: shippingVoucher.discount_voucher_id,
            },
          }
        );
      }
      order.UserOrderDetails.forEach(async (product) => {
        console.log("order: ", product);

        await ProductVarients.increment(
          { stock: product.quantity },
          {
            where: {
              product_varients_id: product.product_varients_id,
            },
          }
        );
      });
    }

    await UserOrder.destroy({
      where: {
        user_order_id: orderId,
      },
    });

    await UserOrderDetails.destroy({
      where: {
        user_order_id: orderId,
      },
    });

    await OrderStatusHistory.destroy({
      where: {
        user_order_id: orderId,
      },
    });
    console.log("Đã xóa đơn hàng: ", orderId);
  } catch (error) {
    console.log("Lỗi khi xóa đơn hàng: ", error);
  }
};

module.exports = { deleteOrder, checkPaid };
