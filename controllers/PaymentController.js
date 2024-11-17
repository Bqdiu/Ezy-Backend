const sequelize = require("../config/database");
const { Op, json, where } = require("sequelize");
const {
  UserAccount,
  ProductVarients,
  UserOrder,
  UserOrderDetails,
  OrderStatusHistory,
  CartItems,
  DiscountVoucher,
  UserWallet,
  WalletTransaction,
  Shop,
  Product,
  ShopRegisterFlashSales,
  FlashSaleTimerFrame,
  Notifications,
} = require("../models/Assosiations");
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
const dateFormat = require("dateformat");
const { io } = require("../socket");
const { is } = require("translate-google/languages");
const { title } = require("process");
const reserveStock = async (validCart) => {
  for (const shop of validCart) {
    for (const item of shop.CartItems) {
      const productVarient = await ProductVarients.findOne({
        where: {
          product_varients_id: item.product_varients_id,
        },
      });
      if (!productVarient || item.quantity > productVarient.stock) {
        return false;
      }
      return true;
    }
  }
};

const checkStock = async (validCart) => {
  for (const shop of validCart) {
    for (const item of shop.CartItems) {
      const productVarient = await ProductVarients.findOne({
        where: {
          product_varients_id: item.product_varients_id,
        },
        include: [
          {
            model: Product,
            attributes: ["product_status"],
            include: [
              { model: Shop, attributes: ["shop_status"] },
              {
                model: ShopRegisterFlashSales,
                include: [
                  {
                    model: FlashSaleTimerFrame,
                    where: {
                      status: "active",
                      started_at: {
                        [Op.lte]: new Date(),
                      },
                      ended_at: {
                        [Op.gt]: new Date(),
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      if (productVarient.Product.ShopRegisterFlashSales.length > 0) {
        if (
          productVarient.Product.ShopRegisterFlashSales[0].quantity -
            productVarient.Product.ShopRegisterFlashSales[0].sold !==
          0
        ) {
          console.log(
            "quantity: ",
            productVarient.Product.ShopRegisterFlashSales[0].quantity
          );
          console.log(
            "sold: ",
            productVarient.Product.ShopRegisterFlashSales[0].sold
          );
          console.log("item.quantity: ", item.quantity);

          const isEnoughFlashSaleStock =
            item.quantity +
              productVarient.Product.ShopRegisterFlashSales[0].sold <=
            productVarient.Product.ShopRegisterFlashSales[0].quantity;
          console.log("isEnoughFlashSaleStock: ", isEnoughFlashSaleStock);
          if (!isEnoughFlashSaleStock) {
            return {
              isEnoughStock: false,
              message: "Sản phẩm hiện không đủ trong phiên flash sale",
            };
          }
        }
      }
      if (!productVarient || item.quantity > productVarient.stock) {
        return {
          isEnoughStock: false,
          message: "Sản phẩm hiện không đủ tồn kho",
        };
      }
      if (productVarient.Product.product_status !== 1) {
        return {
          isEnoughStock: false,
          message: "Sản phẩm hiện không còn kinh doanh",
        };
      }
      if (productVarient.Product.Shop.shop_status !== 1) {
        return {
          isEnoughStock: false,
          message: "Cửa hàng hiện không còn kinh doanh",
        };
      }
    }
  }
  return { isEnoughStock: true, message: "Sản phẩm hiện đủ tồn kho" };
};

const momoPayment = async (amount) => {
  return new Promise((resolve, reject) => {
    var accessKey = "F8BBA842ECF85";
    var secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    var partnerCode = "MOMO";
    var orderInfo = "pay with MoMo";
    var redirectUrl = "http://localhost:3000/cart/checkout/result";
    var ipnUrl = "http://localhost:3000/cart/checkout/result";
    var requestType = "payWithMethod";
    var orderId = partnerCode + new Date().getTime();
    var requestId = orderId;
    var extraData = "";
    var lang = "vi";
    var autoCapture = true;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: "Ezy Ecommerce",
      storeId: "MomoTestStore",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      signature,
    });

    const https = require("https");
    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const responseBody = JSON.parse(data);
        if (responseBody.resultCode === 0) {
          resolve(responseBody); // Thanh toán thành công
        } else {
          reject({ error: true, message: "Thanh toán thất bại" });
        }
      });
    });

    req.on("error", (error) => reject({ error: true, message: error.message }));
    req.write(requestBody);
    req.end();
  });
};
const checkoutWithMomo = async (req, res) => {
  try {
    const { user_id, address, totalPayment, validCart, voucher, totalPerItem } =
      req.body;
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

    const isValidVoucher = await checkVoucher(voucher);
    if (!isValidVoucher) {
      return res.status(400).json({
        error: true,
        message: "Voucher không hợp lệ",
      });
    }
    const reserve = await reserveStock(validCart);
    if (!reserve) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm hiện không đủ tồn kho",
      });
    }

    const response = await momoPayment(totalPayment.final);
    console.log(response);
    if (response.success) {
    }
    // if (response.error) {
    //   if (validCart.length === 1) {
    //     const order = await UserOrder.create({
    //       user_id,
    //       shop_id: validCart[0].shop_id,
    //       user_address_id: address.user_address_id,
    //       total_quantity: validCart[0].total_quantity,
    //       total_price: validCart[0].total_price,
    //       final_price: totalPayment.final,
    //       shipping_fee: totalPayment.shippingFee,
    //       discount_shipping_fee: totalPayment.discountShippingFee,
    //       discount_price: totalPayment.discountPrice,
    //       payment_method_id: 1,
    //       transaction_code: "",
    //       order_note: validCart[0].orderNote || "",
    //     });
    //     await OrderStatusHistory.create({
    //       user_order_id: order.user_order_id,
    //       order_status_id: 2,
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //     });

    //     for (const item of validCart[0].CartItems) {
    //       await UserOrderDetails.create({
    //         user_order_id: order.user_order_id,
    //         product_varients_id: item.product_varients_id,
    //         varient_name: item.ProductVarient.Product.product_name,
    //         quantity: item.quantity,
    //         totalPrice: item.price,
    //         discountPrice:
    //           item.ProductVarient.sale_percents > 0
    //             ? item.price * (1 - item.ProductVarient.sale_percents / 100)
    //             : 0,
    //         is_reviewed: false,
    //         thumbnail:
    //           item.ProductVarient.ProductClassify.thumbnail !== null ||
    //           item.ProductVarient.ProductClassify.thumbnail !== "" ||
    //           item.ProductVarient.ProductClassify.thumbnail !== undefined
    //             ? item.ProductVarient.ProductClassify.thumbnail
    //             : item.ProductVarient.Product.thumbnail,
    //         classify:
    //           item.ProductVarient.ProductSize != null &&
    //           item.ProductVarient.classify !== null
    //             ? item.ProductVarient.ProductClassify.product_classify_name +
    //               " " +
    //               item.ProductVarient.ProductSize.product_size_name
    //             : item.ProductVarient.ProductSize === null &&
    //               item.ProductVarient.ProductClassiy !== null
    //             ? item.ProductVarient.ProductClassify.product_classify_name
    //             : "",
    //       });

    //       await CartItems.destroy({
    //         where: {
    //           cart_item_id: item.cart_item_id,
    //         },
    //       });
    //     }
    //   } else if (validCart.length > 1) {
    //     {
    //       for (const shop of validCart) {
    //         const total = totalPerItem.find(
    //           (item) => item.shop_id === shop.shop_id
    //         );
    //         const order = await UserOrder.create({
    //           user_id,
    //           shop_id: shop.shop_id,
    //           user_address_id: address.user_address_id,
    //           total_quantity: shop.total_quantity,
    //           total_price: shop.total_price,
    //           final_price: total.totalPrice,
    //           shipping_fee: total.shippingFee,
    //           discount_shipping_fee: total.discountShippingFee,
    //           discount_price: total.discountPrice,
    //           payment_method_id: 1,
    //           transaction_code: "",
    //           order_note: shop.orderNote || "",
    //         });
    //         await OrderStatusHistory.create({
    //           user_order_id: order.user_order_id,
    //           order_status_id: 1,
    //           createdAt: new Date(),
    //           updatedAt: new Date(),
    //         });
    //         for (const item of shop.CartItems) {
    //           await UserOrderDetails.create({
    //             user_order_id: order.user_order_id,
    //             product_varients_id: item.product_varients_id,
    //             varient_name: item.ProductVarient.Product.product_name,
    //             quantity: item.quantity,
    //             totalPrice: item.price,
    //             discountPrice:
    //               item.ProductVarient.sale_percents > 0
    //                 ? item.price * (1 - item.ProductVarient.sale_percents / 100)
    //                 : 0,
    //             is_reviewed: false,
    //             thumbnail:
    //               item.ProductVarient.ProductClassify.thumbnail !== null ||
    //               item.ProductVarient.ProductClassify.thumbnail !== "" ||
    //               item.ProductVarient.ProductClassify.thumbnail !== undefined
    //                 ? item.ProductVarient.ProductClassify.thumbnail
    //                 : item.ProductVarient.Product.thumbnail,
    //             classify:
    //               item.ProductVarient.ProductSize != null &&
    //               item.ProductVarient.classify !== null
    //                 ? item.ProductVarient.ProductClassify
    //                     .product_classify_name +
    //                   " " +
    //                   item.ProductVarient.ProductSize.product_size_name
    //                 : item.ProductVarient.ProductSize === null &&
    //                   item.ProductVarient.ProductClassiy !== null
    //                 ? item.ProductVarient.ProductClassify.product_classify_name
    //                 : "",
    //           });
    //           await CartItems.destroy({
    //             where: {
    //               cart_item_id: item.cart_item_id,
    //             },
    //           });
    //         }
    //       }
    //     }
    //   }

    //   if (voucher.discountVoucher) {
    //     const discountVoucher = await DiscountVoucher.findOne({
    //       where: {
    //         discount_voucher_id: voucher.discountVoucher.discount_voucher_id,
    //       },
    //     });
    //     discountVoucher.quantity -= 1;
    //     await discountVoucher.save();
    //   }
    //   if (voucher.shippingVoucher) {
    //     const shippingVoucher = await DiscountVoucher.findOne({
    //       where: {
    //         discount_voucher_id: voucher.shippingVoucher.discount_voucher_id,
    //       },
    //     });
    //     shippingVoucher.quantity -= 1;
    //     await shippingVoucher.save();
    //   }
    //   return res.status(400).json(response);
    // } else {
    //   if (validCart.length === 1) {
    //     const order = await UserOrder.create({
    //       user_id,
    //       shop_id: validCart[0].shop_id,
    //       user_address_id: address.user_address_id,
    //       total_quantity: validCart[0].total_quantity,
    //       total_price: validCart[0].total_price,
    //       final_price: totalPayment.final,
    //       shipping_fee: totalPayment.shippingFee,
    //       discount_shipping_fee: totalPayment.discountShippingFee,
    //       discount_price: totalPayment.discountPrice,
    //       payment_method_id: 1,
    //       transaction_code: "",
    //       order_note: validCart[0].orderNote || "",
    //     });
    //     await OrderStatusHistory.create({
    //       user_order_id: order.user_order_id,
    //       order_status_id: 2,
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //     });

    //     for (const item of validCart[0].CartItems) {
    //       await UserOrderDetails.create({
    //         user_order_id: order.user_order_id,
    //         product_varients_id: item.product_varients_id,
    //         varient_name: item.ProductVarient.Product.product_name,
    //         quantity: item.quantity,
    //         totalPrice: item.price,
    //         discountPrice:
    //           item.ProductVarient.sale_percents > 0
    //             ? item.price * (1 - item.ProductVarient.sale_percents / 100)
    //             : 0,
    //         is_reviewed: false,
    //         thumbnail:
    //           item.ProductVarient.ProductClassify.thumbnail !== null ||
    //           item.ProductVarient.ProductClassify.thumbnail !== "" ||
    //           item.ProductVarient.ProductClassify.thumbnail !== undefined
    //             ? item.ProductVarient.ProductClassify.thumbnail
    //             : item.ProductVarient.Product.thumbnail,
    //         classify:
    //           item.ProductVarient.ProductSize != null &&
    //           item.ProductVarient.classify !== null
    //             ? item.ProductVarient.ProductClassify.product_classify_name +
    //               " " +
    //               item.ProductVarient.ProductSize.product_size_name
    //             : item.ProductVarient.ProductSize === null &&
    //               item.ProductVarient.ProductClassiy !== null
    //             ? item.ProductVarient.ProductClassify.product_classify_name
    //             : "",
    //       });

    //       await CartItems.destroy({
    //         where: {
    //           cart_item_id: item.cart_item_id,
    //         },
    //       });
    //     }
    //   } else if (validCart.length > 1) {
    //     {
    //       for (const shop of validCart) {
    //         const total = totalPerItem.find(
    //           (item) => item.shop_id === shop.shop_id
    //         );
    //         const order = await UserOrder.create({
    //           user_id,
    //           shop_id: shop.shop_id,
    //           user_address_id: address.user_address_id,
    //           total_quantity: shop.total_quantity,
    //           total_price: shop.total_price,
    //           final_price: total.totalPrice,
    //           shipping_fee: total.shippingFee,
    //           discount_shipping_fee: total.discountShippingFee,
    //           discount_price: total.discountPrice,
    //           payment_method_id: 1,
    //           transaction_code: "",
    //           order_note: shop.orderNote || "",
    //         });
    //         await OrderStatusHistory.create({
    //           user_order_id: order.user_order_id,
    //           order_status_id: 2,
    //           createdAt: new Date(),
    //           updatedAt: new Date(),
    //         });
    //         for (const item of shop.CartItems) {
    //           await UserOrderDetails.create({
    //             user_order_id: order.user_order_id,
    //             product_varients_id: item.product_varients_id,
    //             varient_name: item.ProductVarient.Product.product_name,
    //             quantity: item.quantity,
    //             totalPrice: item.price,
    //             discountPrice:
    //               item.ProductVarient.sale_percents > 0
    //                 ? item.price * (1 - item.ProductVarient.sale_percents / 100)
    //                 : 0,
    //             is_reviewed: false,
    //             thumbnail:
    //               item.ProductVarient.ProductClassify.thumbnail !== null ||
    //               item.ProductVarient.ProductClassify.thumbnail !== "" ||
    //               item.ProductVarient.ProductClassify.thumbnail !== undefined
    //                 ? item.ProductVarient.ProductClassify.thumbnail
    //                 : item.ProductVarient.Product.thumbnail,
    //             classify:
    //               item.ProductVarient.ProductSize != null &&
    //               item.ProductVarient.classify !== null
    //                 ? item.ProductVarient.ProductClassify
    //                     .product_classify_name +
    //                   " " +
    //                   item.ProductVarient.ProductSize.product_size_name
    //                 : item.ProductVarient.ProductSize === null &&
    //                   item.ProductVarient.ProductClassiy !== null
    //                 ? item.ProductVarient.ProductClassify.product_classify_name
    //                 : "",
    //           });
    //           await CartItems.destroy({
    //             where: {
    //               cart_item_id: item.cart_item_id,
    //             },
    //           });
    //         }
    //       }
    //     }
    //   }

    //   if (voucher.discountVoucher) {
    //     const discountVoucher = await DiscountVoucher.findOne({
    //       where: {
    //         discount_voucher_id: voucher.discountVoucher.discount_voucher_id,
    //       },
    //     });
    //     discountVoucher.quantity -= 1;
    //     await discountVoucher.save();
    //   }
    //   if (voucher.shippingVoucher) {
    //     const shippingVoucher = await DiscountVoucher.findOne({
    //       where: {
    //         discount_voucher_id: voucher.shippingVoucher.discount_voucher_id,
    //       },
    //     });
    //     shippingVoucher.quantity -= 1;
    //     await shippingVoucher.save();
    //   }
    //   return res.status(200).json({
    //     success: true,
    //     message: "Thanh toán thành công",
    //   });
    // }
  } catch (error) {
    console.log("Error in checkoutWithMomo: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const checkoutWithVNPay = async (req, res) => {
  try {
    const {
      user_id,
      address,
      totalPayment,
      validCart,
      voucher,
      totalPerItem,
      selectedService,
    } = req.body;
    console.log(req.body);
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

    const isValidVoucher = await checkVoucher(voucher);
    if (!isValidVoucher) {
      return res.status(400).json({
        error: true,
        message: "Voucher không hợp lệ",
      });
    }
    const reserve = await reserveStock(validCart);
    if (!reserve) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm hiện không đủ tồn kho",
      });
    }

    const date = new Date();
    const createdDate = dateFormat(date, "yyyymmddHHMMss");
    const newDate = new Date(date.getTime() + 2 * 60 * 1000);
    const expiredDate = dateFormat(newDate, "yyyymmddHHMMss");

    const ref = `EzyVnPay_${user_id}_${createdDate}`;

    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: totalPayment.final,
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

    await saveOrder(
      user_id,
      validCart,
      voucher,
      address,
      totalPayment,
      totalPerItem,
      3,
      1,
      ref,
      selectedService
    );

    return res.status(200).json({
      success: true,
      paymentUrl,
    });
  } catch (error) {
    console.log("Error in checkoutWithVNPay: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const vnPayIPN = async (req, res) => {
  try {
    const verify = vnpay.verifyIpnCall(req.query);
    console.log("IPN Fail: ", verify);

    const foundOrderByTransactionCode = await UserOrder.findAll({
      where: {
        transaction_code: verify.vnp_TxnRef,
      },
      include: [
        {
          model: OrderStatusHistory,
        },
        {
          model: UserOrderDetails,
        },
      ],
    });
    if (!verify.isSuccess || !verify.isVerified) {
      foundOrderByTransactionCode.forEach(async (order) => {
        if (order.order_status_id === 1) {
          await order.update({
            is_blocked: 0,
          });
        }
      });
    }
    if (!foundOrderByTransactionCode.length === 0) {
      return res.json({
        status: "fail",
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (verify.isVerified && verify.isSuccess) {
      const isPaid = foundOrderByTransactionCode.every((order) => {
        order.order_status_id === 2;
      });
      if (isPaid) {
        return res.json({
          status: "success",
          message: "Giao dịch đã được xử lý",
        });
      }
    }
    switch (verify.vnp_ResponseCode) {
      case "00":
        // Giao dịch thành công
        foundOrderByTransactionCode.forEach(async (order) => {
          const isPaid = order.OrderStatusHistories.every(
            (history) => history.order_status_id === 1
          );
          if (isPaid) {
            await Notifications.create({
              user_id: order.user_id,
              title: "Đơn hàng của bạn đã được xác nhận",
              content: `Đơn hàng ${order.user_order_id} của bạn đã được xác nhận, chúng tôi sẽ giao hàng trong thời gian sớm nhất`,
              thumbnail: order.UserOrderDetails[0].thumbnail,
              notifications_type: "order",
              created_at: new Date(),
              updated_at: new Date(),
            });
            await OrderStatusHistory.create({
              user_order_id: order.user_order_id,
              order_status_id: 2,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await order.update({
              order_status_id: 2,
              is_blocked: 0,
            });
          }
        });
        return res.json({
          status: "success",
          message: "Giao dịch thành công",
        });
      case "07":
        // Giao dịch bị nghi ngờ
        return res.json({
          status: "warning",
          message:
            "Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)",
        });
      case "09":
        return res.json({
          status: "fail",
          message:
            "Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng",
        });
      case "10":
        return res.json({
          status: "fail",
          message:
            "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
        });
      case "11":
        return res.json({
          status: "fail",
          message:
            "Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "12":
        return res.json({
          status: "fail",
          message: "Thẻ/Tài khoản của khách hàng bị khóa",
        });
      case "13":
        return res.json({
          status: "fail",
          message:
            "Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "24":
        return res.json({
          status: "fail",
          message: "Khách hàng hủy giao dịch",
        });
      case "51":
        return res.json({
          status: "fail",
          message:
            "Tài khoản của quý khách không đủ số dư để thực hiện giao dịch",
        });
      case "65":
        return res.json({
          status: "fail",
          message:
            "Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày",
        });
      case "75":
        return res.json({
          status: "fail",
          message: "Ngân hàng thanh toán đang bảo trì",
        });
      case "79":
        return res.json({
          status: "fail",
          message:
            "KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "99":
        return res.json({
          status: "fail",
          message:
            "Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)",
        });
      default:
        return res.json({
          status: "fail",
          message: "Mã phản hồi không xác định",
        });
    }
  } catch (error) {
    console.log("Error in vnPayIPN: ", error);
    return res.json(IpnUnknownError);
  }
};

const checkoutWithEzyWallet = async (req, res) => {
  try {
    const {
      user_id,
      address,
      totalPayment,
      validCart,
      voucher,
      totalPerItem,
      selectedService,
    } = req.body;
    const user = await UserAccount.findOne({
      where: {
        user_id,
      },
    });
    console.log(req.body);
    const wallet = await UserWallet.findOne({
      where: {
        user_id,
      },
    });
    if (!wallet) {
      return res.status(400).json({
        error: true,
        message: "Tài khoản của bạn không có ví",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy người dùng" });
    }

    const isEnoughStock = await checkStock(validCart);
    if (!isEnoughStock.isEnoughStock) {
      return res.status(400).json({
        error: true,
        message: isEnoughStock.message,
      });
    }
    const isValidVoucher = await checkVoucher(voucher);
    if (!isValidVoucher) {
      return res.status(400).json({
        error: true,
        message: "Voucher không hợp lệ",
      });
    }
    const isEnoughMoney = wallet.balance >= totalPayment.final;
    let transaction_code = "";
    if (isEnoughMoney) {
      wallet.balance -= totalPayment.final;
      const transaction = await WalletTransaction.create({
        user_wallet_id: wallet.user_wallet_id,
        transaction_type: "Thanh Toán",
        amount: -totalPayment.final,
        transaction_date: new Date(),
        description: "Thanh toán Ezy",
      });
      transaction_code = `EzyWallet_${user_id}_${transaction.wallet_transaction_id}`;
      await wallet.save();
    } else {
      return res.status(400).json({
        error: true,
        message: "Số dư trong ví không đủ",
      });
    }

    await saveOrder(
      user_id,
      validCart,
      voucher,
      address,
      totalPayment,
      totalPerItem,
      4,
      2,
      transaction_code,
      selectedService
    );

    return res.status(200).json({
      success: true,
      message: "Thanh toán thành công",
    });
  } catch (error) {
    console.log("Error in checkoutWithEzyWallet: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const checkVoucher = async (selectedVoucher) => {
  if (selectedVoucher.discountVoucher) {
    const discountVoucher = await DiscountVoucher.findOne({
      where: {
        discount_voucher_id:
          selectedVoucher.discountVoucher.discount_voucher_id,
      },
    });
    if (!discountVoucher || discountVoucher.quantity === 0) {
      return false;
    }
  }
  if (selectedVoucher.shippingVoucher) {
    const shippingVoucher = await DiscountVoucher.findOne({
      where: {
        discount_voucher_id:
          selectedVoucher.shippingVoucher.discount_voucher_id,
      },
    });
    if (!shippingVoucher || shippingVoucher.quantity === 0) {
      return false;
    }
  }
  return true;
};

const checkoutWithCOD = async (req, res) => {
  try {
    const {
      user_id,
      address,
      totalPayment,
      validCart,
      voucher,
      totalPerItem,
      selectedService,
    } = req.body;

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
    const isEnoughStock = await checkStock(validCart);
    if (!isEnoughStock.isEnoughStock) {
      return res.status(400).json({
        error: true,
        message: isEnoughStock.message,
      });
    }
    const isValidVoucher = await checkVoucher(voucher);
    if (!isValidVoucher) {
      return res.status(400).json({
        error: true,
        message: "Voucher không hợp lệ",
      });
    }
    await saveOrder(
      user_id,
      validCart,
      voucher,
      address,
      totalPayment,
      totalPerItem,
      1,
      2,
      "",
      selectedService
    );

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

const saveOrder = async (
  user_id,
  validCart,
  voucher,
  address,
  totalPayment,
  totalPerItem,
  payment_method_id,
  order_status_id,
  transaction_code = "",
  selectedService
) => {
  // Theo chuỗi province_id,district_id,ward_code,service_id,service_type_id
  console.log("selectedService", selectedService);
  let vouchers_applied = "";

  if (voucher) {
    if (voucher.discountVoucher) {
      vouchers_applied += `${voucher.discountVoucher.discount_voucher_id},`;
    }
    if (voucher.shippingVoucher) {
      vouchers_applied += `${voucher.shippingVoucher.discount_voucher_id},`;
    }
    vouchers_applied = vouchers_applied.split(",").filter(Boolean).join(","); // Remove the trailing comma and join as a string
  }

  if (validCart.length === 1) {
    // Theo chuỗi province_id,district_id,ward_code,service_id,service_type_id
    let user_address_id_string = `${address.province_id},${address.district_id},${address.ward_code}`;
    if (Array.isArray(selectedService)) {
      const service = selectedService.find(
        (service) => service.shop_id === validCart[0].shop_id
      );
      user_address_id_string += `,${service.service_id},${service.service_type_id}`;
    }
    user_address_id_string = user_address_id_string
      .split(",")
      .filter(Boolean)
      .join(",");
    console.log(user_address_id_string);

    const order = await UserOrder.create({
      user_id,
      shop_id: validCart[0].shop_id,
      user_address_string: address.address,
      user_address_order_name: address.full_name,
      user_address_order_phone_number: address.phone_number,
      user_address_id_string,
      total_quantity: validCart[0].total_quantity,
      total_price: validCart[0].total_price,
      final_price: totalPayment.final,
      shipping_fee: totalPayment.shippingFee,
      discount_shipping_fee: totalPayment.discountShippingFee,
      discount_price: totalPayment.discountPrice,
      payment_method_id: payment_method_id,
      transaction_code: transaction_code,
      order_note: validCart[0].orderNote || "",
      order_code: null,
      order_status_id: order_status_id,
      return_expiration_date: null,
      is_blocked: payment_method_id === 3 ? 1 : 0,
      vouchers_applied: vouchers_applied === "" ? null : vouchers_applied,
    });

    if (payment_method_id === 3) {
      io.emit("newOrder", {
        orderID: order.user_order_id,
        selectedVoucher: voucher,
        timeStamp: new Date(),
      });
      io.emit("unBlockOrder", {
        orderID: order.user_order_id,
        timeStamp: new Date(),
      });
    }
    await OrderStatusHistory.create({
      user_order_id: order.user_order_id,
      order_status_id: order_status_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    let firstThumbnail = "";
    for (const item of validCart[0].CartItems) {
      await UserOrderDetails.create({
        user_order_id: order.user_order_id,
        product_varients_id: item.product_varients_id,
        varient_name: item.ProductVarient.Product.product_name,
        quantity: item.quantity,
        totalPrice: item.price,
        discountPrice: item.ProductVarient.price * item.quantity,
        is_reviewed: false,
        thumbnail:
          item.ProductVarient.ProductClassify !== null &&
          (item.ProductVarient.ProductClassify?.thumbnail !== null ||
            item.ProductVarient.ProductClassify?.thumbnail !== "" ||
            item.ProductVarient.ProductClassify?.thumbnail !== undefined)
            ? item.ProductVarient.ProductClassify.thumbnail
            : item.ProductVarient.Product.thumbnail,

        classify:
          item.ProductVarient.ProductClassify !== null
            ? item.ProductVarient.ProductSize != null &&
              item.ProductVarient.classify !== null
              ? item.ProductVarient.ProductClassify.product_classify_name +
                " " +
                item.ProductVarient.ProductSize.product_size_name
              : item.ProductVarient.ProductSize === null &&
                item.ProductVarient.ProductClassiy !== null
              ? item.ProductVarient.ProductClassify.product_classify_name
              : ""
            : "",
        on_shop_register_flash_sales_id:
          item.ProductVarient.Product.ShopRegisterFlashSales.length > 0 &&
          item.ProductVarient.Product.ShopRegisterFlashSales[0].quantity -
            item.ProductVarient.Product.ShopRegisterFlashSales[0].sold >
            0
            ? item.ProductVarient.Product.ShopRegisterFlashSales[0]
                .shop_register_flash_sales_id
            : null,
      });
      if (firstThumbnail === "") {
        firstThumbnail =
          item.ProductVarient.ProductClassify !== null &&
          (item.ProductVarient.ProductClassify?.thumbnail !== null ||
            item.ProductVarient.ProductClassify?.thumbnail !== "" ||
            item.ProductVarient.ProductClassify?.thumbnail !== undefined)
            ? item.ProductVarient.ProductClassify.thumbnail
            : item.ProductVarient.Product.thumbnail;
      }
      // console.log(
      //   "đúng koooooooooooooo: ",
      //   item.ProductVarient.Product.ShopRegisterFlashSales[0].quantity -
      //     item.ProductVarient.Product.ShopRegisterFlashSales[0].sold >
      //     0
      // );
      if (item.ProductVarient.Product.ShopRegisterFlashSales.length > 0) {
        if (
          item.ProductVarient.Product.ShopRegisterFlashSales[0].quantity -
            item.ProductVarient.Product.ShopRegisterFlashSales[0].sold >
          0
        ) {
          await ShopRegisterFlashSales.update(
            {
              sold:
                item.ProductVarient.Product.ShopRegisterFlashSales[0].sold +
                item.quantity,
            },
            {
              where: {
                shop_register_flash_sales_id:
                  item.ProductVarient.Product.ShopRegisterFlashSales[0]
                    .shop_register_flash_sales_id,
              },
            }
          );
        }
      }

      await CartItems.destroy({
        where: {
          cart_item_id: item.cart_item_id,
        },
      });
    }
    await Notifications.create({
      user_id: user_id,
      notifications_type: "order",
      title:
        order_status_id === 1
          ? "Đơn hàng chờ thanh toán"
          : "Đặt hàng thành công",
      thumbnail: firstThumbnail,
      content:
        order_status_id === 1
          ? `Đơn hàng của bạn đang được chờ thanh toán. Vui lòng thanh toán để tiếp tục đơn hàng. Sau 10 phút không thanh toán đơn hàng sẽ tự động hủy`
          : `Đơn hàng của bạn đã được đặt thành công. Mã đơn hàng: ${order.user_order_id}`,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } else if (validCart.length > 1) {
    {
      for (const shop of validCart) {
        let user_address_id_string = "";
        user_address_id_string = `${address.province_id},${address.district_id},${address.ward_code}`;
        if (Array.isArray(selectedService)) {
          const service = selectedService.find(
            (service) => service.shop_id === shop.shop_id
          );
          user_address_id_string += `,${service.service_id},${service.service_type_id}`;
        }
        user_address_id_string = user_address_id_string
          .split(",")
          .filter(Boolean)
          .join(",");

        const total = totalPerItem.find(
          (item) => item.shop_id === shop.shop_id
        );
        const order = await UserOrder.create({
          user_id,
          shop_id: shop.shop_id,
          user_address_string: address.address,
          user_address_id_string: user_address_id_string,
          user_address_order_name: address.full_name,
          user_address_order_phone_number: address.phone_number,
          total_quantity: shop.total_quantity,
          total_price: shop.total_price,
          final_price: total.totalPrice,
          shipping_fee: total.shippingFee,
          discount_shipping_fee: total.discountShippingFee,
          discount_price: total.discountPrice,
          payment_method_id: payment_method_id,
          transaction_code: transaction_code,
          order_note: shop.orderNote || "",
          order_code: null,
          order_status_id: order_status_id,
          return_expiration_date: null,
          is_blocked: payment_method_id === 3 ? 1 : 0,
        });

        if (payment_method_id === 3) {
          io.emit("newOrder", {
            orderID: order.user_order_id,
            selectedVoucher: voucher,
            timeStamp: new Date(),
          });
          io.emit("unBlockOrder", {
            orderID: order.user_order_id,
            timeStamp: new Date(),
          });
        }

        await OrderStatusHistory.create({
          user_order_id: order.user_order_id,
          order_status_id: order_status_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        let firstThumbnail = "";
        for (const item of shop.CartItems) {
          await UserOrderDetails.create({
            user_order_id: order.user_order_id,
            product_varients_id: item.product_varients_id,
            varient_name: item.ProductVarient.Product.product_name,
            quantity: item.quantity,
            totalPrice: item.price,
            discountPrice: item.ProductVarient.price * item.quantity,

            is_reviewed: false,
            thumbnail:
              item.ProductVarient.product_classify_id !== null
                ? item.ProductVarient.ProductClassify.thumbnail
                : item.ProductVarient.Product.thumbnail,
            classify:
              item.ProductVarient.product_size_id &&
              item.ProductVarient.product_classify_id !== null
                ? item.ProductVarient.ProductClassify.product_classify_name +
                  " " +
                  item.ProductVarient.ProductSize.product_size_name
                : item.ProductVarient.product_size_id === null &&
                  item.ProductVarient.product_classify_id !== null
                ? item.ProductVarient.ProductClassify.product_classify_name
                : "",
            on_shop_register_flash_sales_id:
              item.ProductVarient.Product.ShopRegisterFlashSales.length > 0 &&
              item.ProductVarient.Product.ShopRegisterFlashSales[0].quantity -
                item.ProductVarient.Product.ShopRegisterFlashSales[0].sold >
                0
                ? item.ProductVarient.Product.ShopRegisterFlashSales[0]
                    .shop_register_flash_sales_id
                : null,
          });
          if (item.ProductVarient.Product.ShopRegisterFlashSales.length > 0) {
            if (
              item.ProductVarient.Product.ShopRegisterFlashSales[0].quantity -
                item.ProductVarient.Product.ShopRegisterFlashSales[0].sold >
              0
            ) {
              await ShopRegisterFlashSales.update(
                {
                  sold:
                    item.ProductVarient.Product.ShopRegisterFlashSales[0].sold +
                    item.quantity,
                },
                {
                  where: {
                    shop_register_flash_sales_id:
                      item.ProductVarient.Product.ShopRegisterFlashSales[0]
                        .shop_register_flash_sales_id,
                  },
                }
              );
            }
          }

          await CartItems.destroy({
            where: {
              cart_item_id: item.cart_item_id,
            },
          });
        }
        await Notifications.create({
          user_id: user_id,
          notifications_type: "order",
          title:
            order_status_id === 1
              ? "Đơn hàng chờ thanh toán"
              : "Đặt hàng thành công",
          thumbnail: firstThumbnail,
          content:
            order_status_id === 1
              ? `Đơn hàng của bạn đang được chờ thanh toán. Vui lòng thanh toán để tiếp tục đơn hàng. Sau 10 phút không thanh toán đơn hàng sẽ tự động hủy`
              : `Đơn hàng của bạn đã được đặt thành công. Mã đơn hàng: ${order.user_order_id}`,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  if (voucher.discountVoucher) {
    const discountVoucher = await DiscountVoucher.findOne({
      where: {
        discount_voucher_id: voucher.discountVoucher.discount_voucher_id,
      },
    });
    discountVoucher.quantity -= 1;
    await discountVoucher.save();
  }
  if (voucher.shippingVoucher) {
    const shippingVoucher = await DiscountVoucher.findOne({
      where: {
        discount_voucher_id: voucher.shippingVoucher.discount_voucher_id,
      },
    });
    shippingVoucher.quantity -= 1;
    await shippingVoucher.save();
  }
};

module.exports = {
  checkoutWithCOD,
  checkoutWithEzyWallet,
  checkoutWithVNPay,
  checkoutWithMomo,
  vnPayIPN,
};
