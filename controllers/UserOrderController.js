const sequelize = require("../config/database");
const { Op } = require("sequelize");

const {
  UserOrder,
  UserOrderDetails,
  OrderStatusHistory,
  DiscountVoucher,
  ProductVarients,
  OrderStatus,
  Product,
  Shop,
  UserAccount,
} = require("../models/Assosiations");
const { getOrderDetailGHN } = require("../services/ghnServices");

const checkPaid = async (orderId) => {
  try {
    const order = await UserOrder.findOne({
      where: {
        user_order_id: orderId,
      },
    });
    // const orderStatusHistory = await OrderStatusHistory.findAll({
    //   where: {
    //     user_order_id: orderId,
    //   },
    //   order: [["createdAt", "DESC"]],
    // });

    // const isPendingOnly = orderStatusHistory.every(
    //   (status) => status.order_status_id === 1
    // );
    const isPendingOnly = order.order_status_id === 1;
    return isPendingOnly;
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
        console.log("order: ", product.quantity);
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

const getOrders = async (req, res) => {
  try {
    const { user_id, status_id, limit = 10, page = 1 } = req.body;
    console.log("getOrders", user_id, status_id, limit, page);
    const offset = (page - 1) * limit;
    let whereConditions = {};
    if (status_id !== -1) {
      whereConditions = {
        user_id,
        order_status_id: status_id,
      };
    }
    const { count, rows: orders } = await UserOrder.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: UserOrderDetails,
          include: [
            {
              model: ProductVarients,
              include: [
                {
                  model: Product,
                },
              ],
            },
          ],
        },
        {
          model: OrderStatus,
        },
        {
          model: Shop,
          include: [
            {
              model: UserAccount,
              attributes: ["user_id", "username"],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
    const statusDescriptions = {
      ready_to_pick: "Mới tạo đơn hàng",
      picking: "Nhân viên đang lấy hàng",
      cancel: "Hủy đơn hàng",
      money_collect_picking: "Đang thu tiền người gửi",
      picked: "Nhân viên đã lấy hàng",
      storing: "Hàng đang nằm ở kho",
      transporting: "Đang luân chuyển hàng",
      sorting: "Đang phân loại hàng hóa",
      delivering: "Nhân viên đang giao cho người nhận",
      money_collect_delivering: "Nhân viên đang thu tiền người nhận",
      delivered: "Nhân viên đã giao hàng thành công",
      delivery_fail: "Nhân viên giao hàng thất bại",
      waiting_to_return: "Đang đợi trả hàng về cho người gửi",
      return: "Trả hàng",
      return_transporting: "Đang luân chuyển hàng trả",
      return_sorting: "Đang phân loại hàng trả",
      returning: "Nhân viên đang đi trả hàng",
      return_fail: "Nhân viên trả hàng thất bại",
      returned: "Nhân viên trả hàng thành công",
      exception: "Đơn hàng ngoại lệ không nằm trong quy trình",
      damage: "Hàng bị hư hỏng",
      lost: "Hàng bị mất",
    };
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.order_code !== null) {
          const orderGHNDetailsRes = await getOrderDetailGHN(order.order_code);
          const orderGHNDetails = orderGHNDetailsRes.data;

          if (orderGHNDetails && orderGHNDetails.status) {
            await updateOrderStatus({
              user_order_id: order.user_order_id,
              status: orderGHNDetails.status,
            });
            let logWithDescriptions = [];
            if (orderGHNDetails.log && orderGHNDetails.log.length > 0) {
              logWithDescriptions = orderGHNDetails.log.map((logEntry) => ({
                ...logEntry,
                description:
                  statusDescriptions[logEntry.status] ||
                  "Trạng thái không xác định", // Thêm mô tả
              }));
            }

            return {
              ...order.dataValues,
              ghn_status: orderGHNDetails.status,
              ghn_status_description:
                statusDescriptions[orderGHNDetails.status],
              log: logWithDescriptions,
              leadtime: orderGHNDetails.leadtime,
              updated_date: orderGHNDetails.updated_date,
            };
          }
        }
        return order;
      })
    );

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      orders: updatedOrders,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log("Lỗi khi lấy đơn hàng: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const updateOrderStatus = async (data) => {
  try {
    const { user_order_id, status } = data;

    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: true, message: "Đơn hàng không tồn tại" });
    }

    if (status === "ready_to_pick" && order.order_status_id !== 3) {
      await order.update({
        order_status_id: 3,
        updated_at: new Date(),
      });
      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (status === "picked" && order.order_status_id !== 4) {
      await order.update({
        order_status_id: 4,
        updated_at: new Date(),
      });

      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (status === "cancel" && order.order_status_id !== 6) {
      await order.update({
        order_status_id: 6,
        updated_at: new Date(),
      });

      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (status === "delivered") {
      await order.update({
        return_expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      });
    }
    return true;
  } catch (error) {
    console.log("Lỗi khi cập nhật trạng thái đơn hàng: ", error);
    return false;
  }
};

module.exports = { deleteOrder, checkPaid, getOrders, updateOrderStatus };
