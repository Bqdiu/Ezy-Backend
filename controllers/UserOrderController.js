const sequelize = require("../config/database");
const { Op, Sequelize, or, where } = require("sequelize");
const vnpay = require("../services/vnpayService");
const {
  ProductCode,
  VnpLocale,
  IpnUnknownError,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnSuccess,
} = require("vnpay");
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
  UserWallet,
  WalletTransaction,
  CartSections,
  CartShop,
  CartItems,
  ProductReview,
  ReturnReason,
  ReturnRequest,
  PaymentMethod,
  ShopRegisterFlashSales,
  Notifications,
} = require("../models/Assosiations");
const {
  getOrderDetailGHN,
  createOrderGHN,
  cancelOrderGHN,
} = require("../services/ghnServices");

const dateFormat = require("dateformat");
const { io } = require("../socket");

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
const checkBlockStatus = async (orderId) => {
  try {
    const order = await UserOrder.findOne({
      where: {
        user_order_id: orderId,
      },
    });
    return order.is_blocked === 0;
  } catch (error) {
    console.log("Lỗi khi lấy trạng thái block đơn hàng: ", error);
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
        if (product.on_shop_register_flash_sales_id !== null) {
          await ShopRegisterFlashSales.increment(
            { quantity: product.quantity },
            {
              where: {
                on_shop_register_flash_sales_id:
                  product.on_shop_register_flash_sales_id,
              },
            }
          );
        }
      });
    }

    await UserOrder.update(
      {
        order_status_id: 6,
        is_processed: 1,
        updated_at: new Date(),
        is_canceled_by: 3,
      },
      {
        where: {
          user_order_id: orderId,
        },
      }
    );

    await OrderStatusHistory.create({
      user_order_id: orderId,
      order_status_id: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await Notifications.create({
      user_id: order.user_id,
      notifications_type: "order",
      title: "Đơn hàng đã bị hủy",
      thumbnail: order.UserOrderDetails[0].thumbnail,
      content: `Đơn hàng ${orderId} đã bị hủy do quá thời gian chờ thanh toán`,
      created_at: new Date(),
      updated_at: new Date(),
      url: `/user/purchase/order/${orderId}`,
    });
    console.log("Đã xóa đơn hàng: ", orderId);
  } catch (error) {
    console.log("Lỗi khi xóa đơn hàng: ", error);
  }
};

const getOrders = async (req, res) => {
  try {
    const { user_id, status_id, limit = 10, page = 1, searchText } = req.body;

    console.log(req.body);
    const sanitizedSearchText = searchText.trim().toLowerCase();
    const offset = (page - 1) * limit;
    let whereConditions = {};
    if (status_id !== -1) {
      whereConditions = {
        user_id,
        order_status_id: status_id,
      };
    }
    if (sanitizedSearchText !== "") {
      whereConditions = {
        ...whereConditions,
        [Op.or]: [
          {
            user_order_id: {
              [Op.eq]: isNaN(parseInt(sanitizedSearchText))
                ? null
                : parseInt(sanitizedSearchText),
            },
          },
          {
            "$Shop.shop_name$": {
              [Op.like]: `%${sanitizedSearchText}%`,
            },
          },
          Sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM user_order_details AS uod
              WHERE uod.user_order_id = UserOrder.user_order_id
                AND LOWER(uod.varient_name) LIKE '%${sanitizedSearchText}%'
            )
          `),
        ],
      };
    }

    const { count, rows: orders } = await UserOrder.findAndCountAll({
      include: [
        {
          model: UserOrderDetails,

          include: [
            {
              model: ProductVarients,
              attributes: ["product_varients_id"],

              include: [
                {
                  model: Product,

                  as: "Product",
                  attributes: ["product_id", "product_name"],
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
          required: true,
          include: [
            {
              model: UserAccount,
              attributes: ["user_id", "username"],
            },
          ],
        },
      ],
      where: whereConditions,
      limit,
      offset,
      order: [["updated_at", "DESC"]],
    });

    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.order_code !== null) {
          const code =
            order.order_return_code !== null
              ? order.order_return_code
              : order.order_code;
          const orderGHNDetailsRes = await getOrderDetailGHN(code);
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

const getOrderDetails = async (req, res) => {
  try {
    const { user_order_id } = req.query;

    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,

          include: [
            {
              model: ProductVarients,
              attributes: ["product_varients_id", "product_id"],
            },
          ],
        },
        {
          model: OrderStatus,
        },
        {
          model: OrderStatusHistory,
        },
        {
          model: ReturnRequest,
          attributes: ["return_request_id", "status_id"],
          include: [
            {
              model: ReturnReason,
              attributes: [
                "return_reason_id",
                "return_reason_name",
                "createdAt",
                "updatedAt",
              ],
            },
          ],
        },
        {
          model: Shop,
          required: true,
          include: [
            {
              model: UserAccount,
              attributes: ["user_id", "username"],
            },
          ],
        },
        {
          model: PaymentMethod,
        },
      ],
    });
    if (order.order_code !== null) {
      const orderGHNDetailsRes = await getOrderDetailGHN(
        order.order_return_code !== null
          ? order.order_return_code
          : order.order_code
      );
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

        return res.status(200).json({
          success: true,
          order: {
            ...order.dataValues,
            ghn_status: orderGHNDetails.status,
            ghn_status_description: statusDescriptions[orderGHNDetails.status],
            log: logWithDescriptions,
            leadtime: orderGHNDetails.leadtime,
            updated_date: orderGHNDetails.updated_date,
          },
        });
      }
    }
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log("Lỗi khi lấy chi tiết đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
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

    if (
      status === "ready_to_pick" &&
      order.order_status_id !== 3 &&
      order.order_status_id !== 7
    ) {
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
    } else if (
      status === "picked" &&
      order.order_status_id !== 4 &&
      order.order_status_id !== 7
    ) {
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
    } else if (
      status === "cancel" &&
      order.order_status_id !== 6 &&
      order.order_status_id !== 7
    ) {
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
    } else if (
      status === "delivered" &&
      order.return_expiration_date === null
    ) {
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

const checkoutOrder = async (req, res) => {
  try {
    const { user_order_id } = req.body;
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
        },
      ],
    });

    const date = new Date();
    const createdDate = dateFormat(date, "yyyymmddHHMMss");
    const newDate = new Date(date.getTime() + 2 * 60 * 1000);
    const expiredDate = dateFormat(newDate, "yyyymmddHHMMss");

    const ref = `EzyEcommerce_${order.user_id}_${createdDate}`;

    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: order.final_price,
      vnp_IpAddr: req.ip,
      vnp_TxnRef: ref,
      vnp_OrderInfo: "Thanh toán đơn hàng",
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: "http://localhost:3000/cart/checkout/result",
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: createdDate,
      vnp_ExpireDate: expiredDate,
    });

    if (!paymentUrl) {
      return res.status(400).json({
        error: true,
        message: "Không thể tạo URL thanh toán",
      });
    }
    await order.update({
      is_blocked: 1,
      transaction_code: ref,
    });
    if (io) {
      io.emit("unBlockOrder", {
        orderID: order.user_order_id,
        timeStamp: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      paymentUrl,
    });
  } catch (error) {
    console.log("Lỗi khi tạo đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const checkoutOrderEzyWallet = async (req, res) => {
  try {
    const { user_order_id, user_wallet_id } = req.body;
    console.log(req.body);
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
    });
    if (!order) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }
    const wallet = await UserWallet.findOne({
      where: {
        user_wallet_id,
      },
    });
    if (!wallet) {
      return res.status(404).json({
        error: true,
        message: "Ví không tồn tại",
      });
    }
    if (wallet.balance < order.final_price) {
      return res.status(400).json({
        error: true,
        message: "Số dư không đủ",
      });
    }

    await wallet.update({
      balance: wallet.balance - order.final_price,
    });
    await WalletTransaction.create({
      user_wallet_id: wallet.user_wallet_id,
      transaction_type: "Thanh Toán",
      amount: -order.final_price,
      transaction_date: new Date(),
      description: "Thanh toán Ezy",
    });
    await OrderStatusHistory.create({
      user_order_id,
      order_status_id: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await order.update({
      order_status_id: 2,
      updated_at: new Date(),
      is_blocked: 0,
    });

    return res.status(200).json({
      success: true,
      message: "Thanh toán thành công",
    });
  } catch (error) {
    console.log("Lỗi khi thanh toán bằng ví Ezy: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateBlockStatus = async (user_order_id) => {
  try {
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
    });
    if (order.is_blocked === 1) {
      await order.update({
        is_blocked: 0,
        updated_at: new Date(),
      });
      return true;
    }
  } catch (error) {
    console.log("Lỗi khi cập nhật trạng thái đơn hàng: ", error);
    return false;
  }
};

const getShopOrders = async (req, res) => {
  try {
    const { shop_id, status_id, limit = 10, page = 1, searchText } = req.body;
    console.log("body broooooo", req.body);
    const offset = (page - 1) * limit;
    let whereConditions = {
      shop_id,
      ...(status_id !== -1 && { order_status_id: status_id }),
    };
    let sanitizedSearchText = searchText ? searchText.trim().toLowerCase() : "";

    if (sanitizedSearchText) {
      whereConditions = {
        ...whereConditions,
        [Op.or]: [
          {
            user_order_id: {
              [Op.eq]: isNaN(parseInt(sanitizedSearchText))
                ? null
                : parseInt(sanitizedSearchText),
            },
          },
          {
            "$Shop.shop_name$": {
              [Op.like]: `%${sanitizedSearchText}%`,
            },
          },
          Sequelize.literal(`
            EXISTS (
              SELECT 1
              FROM user_order_details AS uod
              WHERE uod.user_order_id = UserOrder.user_order_id
                AND LOWER(uod.varient_name) LIKE '%${sanitizedSearchText}%'
            )
          `),
        ],
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
                  where: { shop_id },
                },
              ],
            },
          ],
        },
        { model: OrderStatus },
        { model: UserAccount },
        { model: Shop, where: { shop_id } },
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
          const orderGHNDetailsRes = await getOrderDetailGHN(
            order.order_return_code !== null
              ? order.order_return_code
              : order.order_code
          );
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

const cancelOrder = async (req, res) => {
  try {
    const { user_order_id, is_canceled_by } = req.body;
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
        },
      ],
    });
    if (!order) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }
    if (order.order_code !== null) {
      const order_codes = [order.order_code];
      const cancelGHNResult = await cancelOrderGHN(order.shop_id, order_codes);
      if (cancelGHNResult.error) {
        return res.status(400).json({
          error: true,
          message:
            "Câp nhật trạng thái đơn hàng thất bại, vui lòng thử lại sau",
        });
      }
    }
    await order.update({
      order_status_id: 6,
      updated_at: new Date(),
      is_canceled_by,
    });
    await OrderStatusHistory.create({
      user_order_id,
      order_status_id: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await Promise.all(
      order.UserOrderDetails.map(async (product) => {
        await ProductVarients.increment(
          { stock: product.quantity },
          {
            where: {
              product_varients_id: product.product_varients_id,
            },
          }
        );
        product.on_shop_register_flash_sales_id !== null &&
          (await ShopRegisterFlashSales.decrement(
            {
              sold: product.quantity,
            },
            {
              where: {
                shop_register_flash_sales_id:
                  product.on_shop_register_flash_sales_id,
              },
            }
          ));
      })
    );

    if (order.vouchers_applied !== null) {
      const vouchersApplied = order.vouchers_applied.split(",").map(Number);
      await Promise.all(
        vouchersApplied.map(async (voucherId) => {
          await DiscountVoucher.increment(
            { quantity: 1 },
            {
              where: {
                discount_voucher_id: voucherId,
              },
            }
          );
        })
      );
    }

    if (order.payment_method_id === 3 || order.payment_method_id === 4) {
      const wallet = await UserWallet.findOne({
        where: {
          user_id: order.user_id,
        },
      });
      await wallet.update({
        balance: wallet.balance + order.final_price,
      });
      await WalletTransaction.create({
        user_wallet_id: wallet.user_wallet_id,
        transaction_type: "Hoàn tiền",
        amount: order.final_price,
        transaction_date: new Date(),
        description: "Hoàn tiền đơn hàng",
      });
      console.log("Hoàn tiền thành công");
    }

    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi hủy đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const confirmOrderCompleted = async (req, res) => {
  try {
    const { user_order_id } = req.body;
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
          include: [
            {
              model: ProductVarients,
            },
          ],
        },
      ],
    });
    console.log(order);

    if (!order) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }
    await order.update({
      order_status_id: 5,
      updated_at: new Date(),
    });
    await OrderStatusHistory.create({
      user_order_id,
      order_status_id: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await Promise.all(
      order.UserOrderDetails.map(async (product) => {
        await Product.increment(
          { sold: product.quantity },
          {
            where: {
              product_id: product.ProductVarient.product_id,
            },
          }
        );
      })
    );

    return res.status(200).json({
      success: true,
      order,
      message: "Xác nhận giao hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi xác nhận giao hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const confirmOrder = async (req, res) => {
  const { shopId, user_order_id, payment_method_id, shipping_fee } = req.body;
  const data = ({
    note,
    required_note, // required_note: "CHOTHUHANG, CHOXEMHANGKHONGTHU, KHONGCHOXEMHANG",
    from_name, // required
    from_phone, // required
    from_address, // required
    from_ward_name, // required
    from_district_name, // required
    from_province_name, // required
    return_phone,
    return_address,
    return_district_id,
    return_ward_code,
    client_order_code,
    to_name, // required
    to_phone, // required
    to_address, // required
    to_ward_code, // required
    to_district_id, // required
    content,
    weight, // required
    length, // required
    width, // required
    height, // required
    pick_station_id,
    deliver_station_id,
    // insurance_value,
    service_id,
    service_type_id, // required
    coupon,
    pick_shift,
    items, // required
  } = req.body);

  if (!shopId || !user_order_id) {
    return res.status(400).json({
      error: true,
      message: "Shop ID or user order ID is required",
      data: req.body,
    });
  }

  try {
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
        },
        {
          model: Shop,
        },
      ],
    });
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    data.cod_amount = 0;
    data.payment_type_id = shipping_fee > 0 ? 2 : 1;

    if (payment_method_id === 1) data.cod_amount = order.final_price;

    const requiredFields = [
      "from_name",
      "from_phone",
      "from_address",
      "from_ward_name",
      "from_district_name",
      "from_province_name",
      "to_name",
      "to_phone",
      "to_address",
      "to_ward_code",
      "to_district_id",
      "weight",
      "length",
      "width",
      "height",
      "service_type_id",
      "items",
    ];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length) {
      return res.status(400).json({
        error: true,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    const resultGHN = await createOrderGHN(shopId, data);
    if (resultGHN.error) {
      return res.status(400).json({
        error: true,
        message:
          "Failed to create order with GHN. Please check provided data or try again later.",
        details: resultGHN.error,
      });
    }
    if (resultGHN.data) {
      await order.update({
        order_status_id: 3,
        order_code: resultGHN.data.order_code,
        updated_at: new Date(),
      });

      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await Notifications.create({
        user_id: order.user_id,
        notifications_type: "order",
        title: "Xác nhận đơn hàng",
        thumbnail: order.UserOrderDetails[0].thumbnail,
        content: `Đơn hàng được xác nhận. Mã đơn hàng: ${order.user_order_id}`,
        created_at: new Date(),
        updated_at: new Date(),
        url: `/user/purchase/order/${order.user_order_id}`,
      });

      return res.status(200).json({
        success: true,
        message: "Order created successfully",
        ghn_data: resultGHN.data,
        order_data: order,
      });
    } else {
      return res.status(400).json({
        error: true,
        message: "Error creating the order",
        data: resultGHN,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Server error",
      details: error.message,
    });
  }
};

const buyOrderAgain = async (req, res) => {
  try {
    const { user_order_id } = req.body;
    const userOrder = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
          include: [
            {
              model: ProductVarients,
              attributes: ["product_varients_id", "stock", "discounted_price"],
              include: [
                {
                  model: Product,
                  attributes: ["product_id", "product_status"],
                },
              ],
            },
          ],
        },
        {
          model: Shop,
          attributes: ["shop_id", "shop_status"],
        },
      ],
    });
    if (!userOrder) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }
    if (userOrder.Shop.shop_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Cửa hàng đã bị khóa",
      });
    }
    const [cartSections, createdSection] = await CartSections.findOrCreate({
      where: {
        user_id: userOrder.user_id,
      },
      defaults: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const [cartShop, createdShop] = await CartShop.findOrCreate({
      where: {
        cart_id: cartSections.cart_id,
        shop_id: userOrder.shop_id,
      },
      defaults: {
        total_price: 0,
        total_quantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await Promise.all(
      userOrder.UserOrderDetails.map(async (product) => {
        const stock = product.ProductVarient.stock;
        if (product.ProductVarient.Product.product_status === 0) {
          return res.status(400).json({
            error: true,
            message: `Sản phẩm ${product.varient_name}  ${
              product.classify !== "" && "- " + product.classify
            } đã bị khóa`,
          });
        }
        if (stock < product.quantity) {
          return res.status(400).json({
            error: true,
            message: `Sản phẩm ${product.varient_name} ${
              product.classify !== "" && "- " + product.classify
            } không đủ hàng`,
          });
        }
        const cartItem = await CartItems.findOne({
          where: {
            cart_shop_id: cartShop.cart_shop_id,
            product_varients_id: product.product_varients_id,
          },
        });
        const discount_price = product.ProductVarient.discounted_price;
        // console.log(product.ProductVarient);
        if (cartItem) {
          const newQuantity = cartItem.quantity + parseInt(product.quantity);
          if (newQuantity > stock) {
            return res.status(400).json({
              error: true,
              message: `Sản phẩm ${product.varient_name} ${
                product.classify !== "" && "- " + product.classify
              } không đủ hàng`,
            });
          }
          // console.log("price: ", newQuantity * discount_price);
          // console.log("newQuantity: ", newQuantity);
          await cartItem.update({
            quantity: newQuantity,
            selected: 1,
            price: newQuantity * discount_price,
            updatedAt: new Date(),
          });
        } else {
          // console.log("discount_price", discount_price);
          // console.log("product.quantity", product.quantity);
          // console.log("price: ", product.quantity * discount_price);
          await CartItems.create({
            cart_shop_id: cartShop.cart_shop_id,
            product_varients_id: product.product_varients_id,
            quantity: product.quantity,
            price: product.quantity * discount_price,
            selected: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: "Mua lại đơn hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi mua lại đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const reviewOrder = async (req, res) => {
  try {
    const { user_id, user_order_id, ratingList } = req.body;
    const userOrder = await UserOrder.findOne({
      where: {
        user_order_id,
      },
    });
    if (Array.isArray(ratingList) && ratingList.length > 0) {
      await Promise.all(
        ratingList.map(async (rating) => {
          await ProductReview.create({
            rating: rating.rating,
            review_content: rating.review,
            user_order_id,
            product_varients_id: rating.product_varients_id,
            classify: rating.classify,
            user_id,
            created_at: new Date(),
          });
        }),
        await userOrder.update({
          is_reviewed: 1,
        })
      );
    }
    return res.status(200).json({
      success: true,
      message: "Đánh giá đơn hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi đánh giá đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const shopCancelOrder = async (req, res) => {
  try {
    const { user_order_id, shop_id, order_codes } = req.body;

    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
        },
      ],
    });
    if (!order) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }

    if (order.order_status_id === 3) {
      if (!Array.isArray(order_codes) || order_codes.length === 0) {
        return res.status(400).json({
          error: true,
          message:
            "Invalid order codes (order_codes must be an array with at least 1 element)",
        });
      }

      if (!shop_id) {
        return res.status(400).json({
          error: true,
          message: "Shop ID is required",
        });
      }

      const cancleGHNResult = await cancelOrderGHN(shop_id, order_codes);
      if (cancleGHNResult.error) {
        return res.status(400).json({
          error: true,
          message:
            "Failed to cancel order with GHN. Please check provided data or try again later.",
          details: cancleGHNResult.error,
        });
      }
    }

    await order.update({
      order_status_id: 6,
      is_canceled_by: 2,
      updated_at: new Date(),
    });
    await OrderStatusHistory.create({
      user_order_id,
      order_status_id: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await Promise.all(
      order.UserOrderDetails.map(async (product) => {
        await ProductVarients.increment(
          { stock: product.quantity },
          {
            where: {
              product_varients_id: product.product_varients_id,
            },
          }
        );
      })
    );

    if (order.vouchers_applied !== null) {
      const vouchersApplied = order.vouchers_applied.split(",").map(Number);
      await Promise.all(
        vouchersApplied.map(async (voucherId) => {
          await DiscountVoucher.increment(
            { quantity: 1 },
            {
              where: {
                discount_voucher_id: voucherId,
              },
            }
          );
        })
      );
    }

    if (order.payment_method_id === 3 || order.payment_method_id === 4) {
      const wallet = await UserWallet.findOne({
        where: {
          user_id: order.user_id,
        },
      });
      await wallet.update({
        balance: wallet.balance + order.final_price,
      });
      await WalletTransaction.create({
        user_wallet_id: wallet.user_wallet_id,
        transaction_type: "Hoàn tiền",
        amount: order.final_price,
        transaction_date: new Date(),
        description: "Hoàn tiền đơn hàng",
      });
    }
    await Notifications.create({
      user_id: order.user_id,
      notifications_type: "order",
      title: "Hủy đơn hàng",
      thumbnail: order.UserOrderDetails[0].thumbnail,
      content: `Đơn hàng của bạn đã bị hủy bởi cửa hàng. Mã đơn hàng: ${order.user_order_id}`,
      created_at: new Date(),
      updated_at: new Date(),
      url: `/user/purchase/order/${order.user_order_id}`,
    });
    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi hủy đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getReviewOrder = async (req, res) => {
  const { user_order_id } = req.query;
  try {
    const reviews = await ProductReview.findAll({
      where: {
        user_order_id,
      },
    });
    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.log("Lỗi khi lấy đánh giá đơn hàng: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getRequestReason = async (req, res) => {
  try {
    const { type } = req.query;
    let reasons = [];
    if (type === "cancel-request") {
      reasons = await ReturnReason.findAll({
        where: {
          return_reason_id: {
            [Op.in]: [3, 4, 5],
          },
        },
      });
    } else {
      reasons = await ReturnReason.findAll({
        where: {
          return_reason_id: {
            [Op.in]: [1, 2, 6],
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      reasons,
    });
  } catch (error) {
    console.log("Lỗi khi lấy lý do yêu cầu: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const sendRequest = async (req, res) => {
  try {
    const {
      user_order_id,
      return_type_id,
      return_reason_id,
      note,
      ghn_status,
    } = req.body;
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
      include: [
        {
          model: UserOrderDetails,
        },
        {
          model: Shop,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        error: true,
        message: "Đơn hàng không tồn tại",
      });
    }
    await order.update({
      return_request_status: 1,
    });

    await ReturnRequest.create({
      user_id: order.user_id,
      shop_id: order.shop_id,
      user_order_id: order.user_order_id,
      return_type_id,
      return_reason_id,
      note,
      status_id:
        ghn_status === "ready-to-pick" || order.order_code === null ? 2 : 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await Notifications.create({
      user_id: order.Shop.user_id,
      notifications_type: "order",
      title: "Yêu cầu trả hàng",
      thumbnail: order.UserOrderDetails[0].thumbnail,
      content: `Đơn hàng ${order.user_order_id} đã được yêu cầu trả hàng`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (ghn_status === "ready-to-pick" || order.order_code === null) {
      if (order.order_code !== null) {
        const order_codes = [order.order_code];
        const cancelGHNResult = await cancelOrderGHN(
          order.shop_id,
          order_codes
        );
        if (cancelGHNResult.error) {
          return res.status(400).json({
            error: true,
            message:
              "Câp nhật trạng thái đơn hàng thất bại, vui lòng thử lại sau",
          });
        }
      }
      await order.update({
        order_status_id: 6,
        updated_at: new Date(),
        is_canceled_by: 1,
        is_processed: 1,
      });
      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await Notifications.create({
        user_id: order.user_id,
        notifications_type: "order",
        title: "Yêu cầu trả hàng được chấp nhận",
        thumbnail: order.UserOrderDetails[0].thumbnail,
        content: `Đơn hàng ${order.user_order_id} đã bị hủy do yêu cầu trả hàng`,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await Promise.all(
        order.UserOrderDetails.map(async (product) => {
          await ProductVarients.increment(
            { stock: product.quantity },
            {
              where: {
                product_varients_id: product.product_varients_id,
              },
            }
          ),
            product.on_shop_register_flash_sales_id !== null &&
              (await ShopRegisterFlashSales.decrement(
                {
                  sold: product.quantity,
                },
                {
                  where: {
                    shop_register_flash_sales_id:
                      product.on_shop_register_flash_sales_id,
                  },
                }
              ));
        })
      );
      if (
        Array.isArray(order.UserOrderDetails) &&
        order.UserOrderDetails.length > 0
      ) {
        await Promise.all(
          order.UserOrderDetails.map(async (product) => {
            await ProductVarients.increment(
              { stock: product.quantity },
              {
                where: {
                  product_varients_id: product.product_varients_id,
                },
              }
            ),
              product.on_shop_register_flash_sales_id !== null &&
                (await ShopRegisterFlashSales.decrement(
                  {
                    sold: product.quantity,
                  },
                  {
                    where: {
                      shop_register_flash_sales_id:
                        product.on_shop_register_flash_sales_id,
                    },
                  }
                ));
          })
        );
      }

      if (order.vouchers_applied !== null) {
        const vouchersApplied = order.vouchers_applied.split(",").map(Number);
        await Promise.all(
          vouchersApplied.map(async (voucherId) => {
            await DiscountVoucher.increment(
              { quantity: 1 },
              {
                where: {
                  discount_voucher_id: voucherId,
                },
              }
            );
          })
        );
      }

      if (order.payment_method_id === 3 || order.payment_method_id === 4) {
        const wallet = await UserWallet.findOne({
          where: {
            user_id: order.user_id,
          },
        });
        await wallet.update({
          balance: wallet.balance + order.final_price,
        });
        const transaction = await WalletTransaction.create({
          user_wallet_id: wallet.user_wallet_id,
          transaction_type: "Hoàn tiền",
          amount: order.final_price,
          transaction_date: new Date(),
          description: "Hoàn tiền đơn hàng",
        });
        await Notifications.create({
          user_id: wallet.user_id,
          notifications_type: "wallet",
          title: "Hoàn tiền vào ví thành công",
          content: `Giao dịch ${transaction.wallet_transaction_id} thành công. Số tiền: ${verify.vnp_Amount} VNĐ đã được cộng vào ví của bạn.`,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      return res.status(200).json({
        success: true,
        message: "Hủy đơn hàng thành công",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gửi yêu cầu thành công",
    });
  } catch (error) {
    console.log("Lỗi khi gửi yêu cầu: ", error);
    return res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const redeliveryOrder = async (req, res) => {
  const { shopId, user_order_id, payment_method_id, shipping_fee } = req.body;

  const data = ({
    note,
    required_note,
    from_name,
    from_phone,
    from_address,
    from_ward_name,
    from_district_name,
    from_province_name,
    return_phone,
    return_address,
    return_district_id,
    return_ward_code,
    client_order_code,
    to_name,
    to_phone,
    to_address,
    to_ward_code,
    to_district_id,
    content,
    weight,
    length,
    width,
    height,
    pick_station_id,
    deliver_station_id,
    service_id,
    service_type_id,
    coupon,
    pick_shift,
    items,
  } = req.body);

  if (!shopId || !user_order_id) {
    return res.status(400).json({
      error: true,
      message: "Shop ID or user order ID is required",
      data: req.body,
    });
  }

  const requiredFields = [
    "from_name",
    "from_phone",
    "from_address",
    "from_ward_name",
    "from_district_name",
    "from_province_name",
    "to_name",
    "to_phone",
    "to_address",
    "to_ward_code",
    "to_district_id",
    "weight",
    "length",
    "width",
    "height",
    "service_type_id",
    "items",
  ];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length) {
    return res.status(400).json({
      error: true,
      message: `Missing required fields: ${missingFields.join(", ")}`,
      missingFields,
    });
  }

  try {
    const order = await UserOrder.findOne({ where: { user_order_id } });
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    data.cod_amount = 0;
    data.payment_type_id = shipping_fee > 0 ? 2 : 1;

    if (payment_method_id === 1) data.cod_amount = order.final_price;

    const resultGHN = await createOrderGHN(shopId, data);
    if (resultGHN.error) {
      return res.status(400).json({
        error: true,
        message:
          "Failed to create order with GHN. Please check provided data or try again later.",
        details: resultGHN.error,
      });
    }
    if (resultGHN.data) {
      await order.update({
        order_return_code: resultGHN.data.order_code,
        updated_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Order created successfully",
        ghn_data: resultGHN.data,
        order_data: order,
      });
    } else {
      return res.status(400).json({
        error: true,
        message: "Error creating the new order with GHN.",
        details: resultGHN.error || "Unknown error",
        data: resultGHN,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Server error",
      details: error.message,
    });
  }
};

const getOrdersCronjob = async (offset, limit) => {
  try {
    console.log("offset", offset);
    console.log("limit", limit);
    const orders = await UserOrder.findAll({
      where: {
        order_status_id: {
          [Op.ne]: [6, 7],
        },
        is_processed: 0,
      },
      include: [
        {
          model: UserOrderDetails,
        },
        {
          model: Shop,
        },
      ],
      offset,
      limit,
    });
    console.log("orders", orders);
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.order_code !== null) {
          const code =
            order.order_return_code !== null
              ? order.order_return_code
              : order.order_code;
          const orderGHNDetailsRes = await getOrderDetailGHN(code);
          const orderGHNDetails = orderGHNDetailsRes.data;

          if (orderGHNDetails && orderGHNDetails.status) {
            return {
              ...order.dataValues,
              ghn_status: orderGHNDetails.status,
              ghn_status_description:
                statusDescriptions[orderGHNDetails.status],
              updated_date: orderGHNDetails.updated_date,
            };
          }
        }
        return order;
      })
    );
    console.log("updatedOrders", updatedOrders);
    return updatedOrders;
  } catch (error) {
    console.log("Lỗi khi lấy đơn hàng: ", error);
    return [];
  }
};

const processOrder = async (orderItem) => {
  try {
    const user_order_id = orderItem.user_order_id;
    const order = await UserOrder.findOne({
      where: {
        user_order_id,
      },
    });

    const createdAt = new Date(orderItem.created_at);
    const expiredOrderConfirm =
      createdAt < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); //2 ngày
    if (orderItem?.ghn_status !== null || orderItem?.ghn_status !== undefined) {
      const status = orderItem.ghn_status;
      console.log("xử lý đơn hàng giao hàng nhanh");
      if (!order) {
        console.log("Đơn hàng không tồn tại");
        return;
      }
      const updatedAt = new Date(order.updated_at); // Chuyển đổi updated_at thành Date object
      const expiredOrder =
        updatedAt < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); //7 ngày

      const expiredOrderNotDelivered =
        updatedAt < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      if (
        status === "ready_to_pick" &&
        order.order_status_id !== 3 &&
        order.order_status_id !== 7
      ) {
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
      } else if (
        status === "picked" &&
        order.order_status_id !== 4 &&
        order.order_status_id !== 7
      ) {
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
      } else if (
        status === "cancel" &&
        order.order_status_id !== 6 &&
        order.order_status_id !== 7
      ) {
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
      } else if (
        status === "delivered" &&
        order.return_expiration_date === null
      ) {
        await order.update({
          return_expiration_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ),
          updated_at: new Date(),
        });
      } else if (
        status === "delivered" &&
        expiredOrder &&
        order.order_status_id !== 5
      ) {
        await order.update({
          order_status_id: 5,
          updated_at: new Date(),
        });

        await OrderStatusHistory.create({
          user_order_id,
          order_status_id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (
        status === "ready_to_pick" &&
        expiredOrderNotDelivered &&
        order.order_status_id !== 6
      ) {
        await Notifications.create({
          user_id: order.Shop.user_id,
          notifications_type: "order",
          title: "Đơn hàng đã bị hủy",
          thumbnail: order.UserOrderDetails[0].thumbnail,
          content: `Đơn hàng ${order.user_order_id} đã bị hủy do quá thời gian giao hàng`,
          created_at: new Date(),
          updated_at: new Date(),
        });
        await Notifications.create({
          user_id: order.user_id,
          notifications_type: "order",
          title: "Đơn hàng của bạn đã bị hủy",
          thumbnail: order.UserOrderDetails[0].thumbnail,
          content: `Đơn hàng ${order.user_order_id} đã bị hủy do quá thời gian giao hàng`,
          created_at: new Date(),
          updated_at: new Date(),
        });
        await order.update({
          order_status_id: 6,
          updated_at: new Date(),
          is_canceled_by: 1,
          is_processed: 1,
        });

        await OrderStatusHistory.create({
          user_order_id,
          order_status_id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (order.payment_method_id === 3 || order.payment_method_id === 4) {
          const wallet = await UserWallet.findOne({
            where: {
              user_id: order.user_id,
            },
          });
          await wallet.update({
            balance: wallet.balance + order.final_price,
          });
          const transaction = await WalletTransaction.create({
            user_wallet_id: wallet.user_wallet_id,
            transaction_type: "Hoàn tiền",
            amount: order.final_price,
            transaction_date: new Date(),
            description: "Hoàn tiền đơn hàng",
          });
          await Notifications.create({
            user_id: wallet.user_id,
            notifications_type: "wallet",
            title: "Hoàn tiền vào ví thành công",
            content: `Giao dịch ${transaction.wallet_transaction_id} thành công. Số tiền: ${verify.vnp_Amount} VNĐ đã được cộng vào ví của bạn.`,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
        await Promise.all(
          order.UserOrderDetails.map(async (product) => {
            await ProductVarients.increment(
              { stock: product.quantity },
              {
                where: {
                  product_varients_id: product.product_varients_id,
                },
              }
            ),
              product.on_shop_register_flash_sales_id !== null &&
                (await ShopRegisterFlashSales.decrement(
                  {
                    sold: product.quantity,
                  },
                  {
                    where: {
                      shop_register_flash_sales_id:
                        product.on_shop_register_flash_sales_id,
                    },
                  }
                ));
          })
        );
      }
    } else if (orderItem?.order_status_id === 2 && expiredOrderConfirm) {
      console.log("xử lý đơn hàng chưa duyệt");
      await Notifications.create({
        user_id: orderItem.Shop.user_id,
        notifications_type: "order",
        title: "Đơn hàng đã bị hủy",
        thumbnail: orderItem.UserOrderDetails[0].thumbnail,
        content: `Đơn hàng ${orderItem.user_order_id} đã bị hủy do quá thời gian xác nhận`,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await Notifications.create({
        user_id: orderItem.user_id,
        notifications_type: "order",
        title: "Đơn hàng của bạn đã bị hủy",
        thumbnail: orderItem.UserOrderDetails[0].thumbnail,
        content: `Đơn hàng ${orderItem.user_order_id} đã bị hủy do quá thời gian xác nhận`,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await order.update({
        order_status_id: 6,
        updated_at: new Date(),
        is_canceled_by: 1,
        is_processed: 1,
      });

      await OrderStatusHistory.create({
        user_order_id,
        order_status_id: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (
        orderItem.payment_method_id === 3 ||
        orderItem.payment_method_id === 4
      ) {
        const wallet = await UserWallet.findOne({
          where: {
            user_id: orderItem.user_id,
          },
        });
        await wallet.update({
          balance: wallet.balance + orderItem.final_price,
        });
        const transaction = await WalletTransaction.create({
          user_wallet_id: wallet.user_wallet_id,
          transaction_type: "Hoàn tiền",
          amount: orderItem.final_price,
          transaction_date: new Date(),
          description: "Hoàn tiền đơn hàng",
        });
        await Notifications.create({
          user_id: wallet.user_id,
          notifications_type: "wallet",
          title: "Hoàn tiền vào ví thành công",
          content: `Giao dịch ${transaction.wallet_transaction_id} thành công. Số tiền: ${verify.vnp_Amount} VNĐ đã được cộng vào ví của bạn.`,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      await Promise.all(
        orderItem.UserOrderDetails.map(async (product) => {
          await ProductVarients.increment(
            { stock: product.quantity },
            {
              where: {
                product_varients_id: product.product_varients_id,
              },
            }
          ),
            product.on_shop_register_flash_sales_id !== null &&
              (await ShopRegisterFlashSales.decrement(
                {
                  sold: product.quantity,
                },
                {
                  where: {
                    shop_register_flash_sales_id:
                      product.on_shop_register_flash_sales_id,
                  },
                }
              ));
        })
      );
    }
  } catch (error) {
    console.log("Lỗi khi xử lý đơn hàng: ", error);
  }
};

const processOrdersInBatches = async (batchsize) => {
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const orders = await getOrdersCronjob(offset, batchsize);
    if (orders.length === 0) {
      hasMore = false;
    } else {
      console.log(`Xử lý lô ${offset / batchsize + 1}...`);

      await Promise.all(orders.map((order) => processOrder(order)));
      offset += batchsize;
    }
  }
  console.log("Đã xử lý xong tất cả đơn hàng.");
};

module.exports = {
  deleteOrder,
  checkPaid,
  getOrders,
  updateOrderStatus,
  checkoutOrder,
  updateBlockStatus,
  checkBlockStatus,
  getShopOrders,
  checkoutOrderEzyWallet,
  cancelOrder,
  confirmOrderCompleted,
  buyOrderAgain,
  reviewOrder,
  confirmOrder,
  getReviewOrder,
  getRequestReason,
  sendRequest,
  shopCancelOrder,
  getOrderDetails,
  redeliveryOrder,
  getOrdersCronjob,
  processOrdersInBatches,
};
