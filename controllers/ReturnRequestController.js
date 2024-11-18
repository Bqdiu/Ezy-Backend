const sequelize = require("../config/database");
const { Op, Sequelize, or, where } = require("sequelize");

const {
    UserOrder,
    UserOrderDetails,
    ProductVarients,
    OrderStatus,
    Product,
    ReturnReason,
    ReturnRequest,
    UserAccount,
    Shop,
    UserWallet,
    WalletTransaction,
    DiscountVoucher,
    ShopRegisterFlashSales,
    Notifications,
} = require("../models/Assosiations");

const {
    createOrderGHN,
    getOrderDetailGHN,
    cancelOrderGHN
} = require("../services/ghnServices");
const ReturnType = require("../models/ReturnType");
const { ca, da } = require("translate-google/languages");
const e = require("express");


const getReturnRequest = async (req, res) => {
    const { shop_id, return_type_id, limit = 5, page = 1 } = req.body;
    const offset = (page - 1) * limit;

    if (!return_type_id || !shop_id) {
        return res.status(400).json({
            message: `${!return_type_id ? "Return Type ID" : "Shop ID"} is required`,
            error: true,
        });
    }

    try {
        const { count, rows: returnRequest } = await ReturnRequest.findAndCountAll({
            where: { shop_id, return_type_id },
            include: [
                {
                    model: UserOrder,
                    include: [
                        {
                            model: UserOrderDetails,
                            include: [
                                {
                                    model: ProductVarients,
                                    include: [{ model: Product }]
                                }
                            ]
                        },
                        { model: OrderStatus },
                    ]
                },
                { model: ReturnReason },
                { model: ReturnType }
            ],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            message: "Return request fetched successfully",
            success: true,
            data: returnRequest,
            currentPage: page,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: true,
            details: error.message,
        });
    }
}
const acceptReturnRequest = async (req, res) => {
    const { return_request_id } = req.body;
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

    if (!return_request_id) {
        return res.status(400).json({
            message: "Return request ID is required",
            error: true,
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
        const returnRequest = await ReturnRequest.findOne({
            where: { return_request_id }
        });

        if (!returnRequest) {
            return res.status(404).json({
                message: "Return request not found",
                error: true,
            });
        }

        const order = await UserOrder.findOne({
            where: { user_order_id: returnRequest.user_order_id },
            include: [
                {
                    model: UserOrderDetails,
                },
            ],

        });
        if (!order) {
            return res.status(404).json({ error: true, message: "Order not found" });
        }

        const code =
            order.order_return_code !== null
                ? order.order_return_code
                : order.order_code;
        const orderGHNDetailsRes = await getOrderDetailGHN(code);
        const orderGHNDetails = orderGHNDetailsRes.data;
        if (orderGHNDetails.error) {
            return res.status(400).json({
                error: true,
                message: "Error fetching order details from GHN",
                details: orderGHNDetails.error,
            });
        }

        if (orderGHNDetails.status === "delivered") {
            data.cod_amount = 0;
            data.payment_type_id = 2;
            if (returnRequest.return_reason_id === 1 || returnRequest.return_reason_id === 2) {
                data.payment_type_id = 1;
            }
            if (order.payment_method_id === 1) data.cod_amount = order.final_price;

            const resultGHN = await createOrderGHN(order.shop_id, data);
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
                    return_request_status: 2,
                    is_processed: 1,
                    order_status_id: 7,
                    updated_at: new Date(),
                });
                await returnRequest.update({
                    status_id: 2,
                    updatedAt: new Date(),
                });

                if (order.payment_method_id === 3 || order.payment_method_id === 4) {
                    const wallet = await UserWallet.findOne({
                        where: {
                            user_id: order.user_id,
                        },
                    });
                    let final_price;
                    if (returnRequest.return_reason_id !== 1 && returnRequest.return_reason_id !== 2) {
                        final_price = order.final_price - (order.shipping_fee - order.discount_shipping_fee);
                    }
                    else {
                        final_price = order.final_price;
                    }
                    console.log("final_price", final_price);
                    await wallet.update({
                        balance: wallet.balance + final_price,
                    });
                    await WalletTransaction.create({
                        user_wallet_id: wallet.user_wallet_id,
                        transaction_type: "Hoàn tiền",
                        amount: final_price,
                        transaction_date: new Date(),
                        description: "Hoàn tiền đơn hàng",
                    });
                }

                await adjustStockAndSales(order);

                await adjustVouchers(order);
                await Notifications.create({
                    user_id: order.user_id,
                    notifications_type: "order",
                    title: "Yêu cầu trả hàng",
                    thumbnail: order.UserOrderDetails[0].thumbnail,
                    content: `Yêu cầu đã được chấp nhận . Mã đơn hàng: ${order.user_order_id}`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    url: `/user/purchase/order/${order.user_order_id}`,
                });

                return res.status(200).json({
                    success: true,
                    message: "Order created successfully",
                    ghn_data: resultGHN.data,
                    order_data: order,
                    return_request_data: returnRequest,
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "Error creating the new order with GHN.",
                    details: resultGHN.error || "Unknown error",
                    data: resultGHN,
                });
            }
        }

        if (orderGHNDetails.status === "ready_to_pick" || orderGHNDetails.status === "picking") {
            const cancelOrderGHNRes = await cancelOrderGHN(order.shop_id, [code]);
            if (cancelOrderGHNRes.error) {
                return res.status(400).json({
                    error: true,
                    message: "Error cancelling order with GHN",
                    details: cancelOrderGHNRes.error,
                });
            }

            if (cancelOrderGHNRes.data) {
                await order.update({
                    order_status_id: 7,
                    is_processed: 1,
                    return_request_status: 2,
                    updated_at: new Date(),
                });
                await returnRequest.update({
                    status_id: 2,
                    updatedAt: new Date(),
                });

                if (order.payment_method_id === 3 || order.payment_method_id === 4) {
                    const wallet = await UserWallet.findOne({
                        where: {
                            user_id: order.user_id,
                        },
                    });
                    let final_price;
                    if (returnRequest.return_reason_id !== 1 && returnRequest.return_reason_id !== 2) {
                        final_price = order.final_price - (order.shipping_fee - order.discount_shipping_fee);
                    }
                    else {
                        final_price = order.final_price;
                    }
                    console.log("final_price", final_price);
                    await wallet.update({
                        balance: wallet.balance + final_price,
                    });

                    await WalletTransaction.create({
                        user_wallet_id: wallet.user_wallet_id,
                        transaction_type: "Hoàn tiền",
                        amount: final_price,
                        transaction_date: new Date(),
                        description: "Hoàn tiền đơn hàng",
                    });
                }


                await adjustStockAndSales(order);

                await adjustVouchers(order);

                await Notifications.create({
                    user_id: order.user_id,
                    notifications_type: "order",
                    title: "Yêu cầu hủy đơn hàng",
                    thumbnail: order.UserOrderDetails[0].thumbnail,
                    content: `Yêu cầu đã được chấp nhận . Mã đơn hàng: ${order.user_order_id}`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    url: `/user/purchase/order/${order.user_order_id}`,
                });

                return res.status(200).json({
                    success: true,
                    message: "Order cancelled successfully",
                    data: cancelOrderGHNRes.data,
                });
            }
        }
        return res.status(400).json({
            error: true,
            message: "Order status is not valid for return",
            order_status: orderGHNDetails.status,
            notification: "Không thể chấp nhận yêu cầu trả hàng với đơn hàng đang được giao",
        });
    } catch (error) {
        console.error('Error processing return request:', error);
        return res.status(500).json({
            message: "Internal server error",
            error: true,
        });
    }
};


const rejectReturnRequest = async (req, res) => {
    const {
        return_request_id
    } = req.body;
    if (!return_request_id) {
        return res.status(400).json({
            message: "Return request ID is required",
            error: true,
        })
    }
    try {
        const returnRequest = await ReturnRequest.findOne({
            where: {
                return_request_id
            }
        })

        if (!returnRequest) {
            return res.status(404).json({
                message: "Return request not found",
                error: true,
            })
        }

        const order = await UserOrder.findOne({
            where: { user_order_id: returnRequest.user_order_id },
            include: [
                {
                    model: UserOrderDetails,
                },
            ],

        });
        if (!order) {
            return res.status(404).json({ error: true, message: "Order not found" });
        }

        // update return request
        await returnRequest.update({
            status_id: 3,
            updatedAt: new Date(),
        })

        await Notifications.create({
            user_id: order.user_id,
            notifications_type: "order",
            title: "Yêu cầu trả hàng",
            thumbnail: order.UserOrderDetails[0].thumbnail,
            content: `Yêu cầu bị từ chối. Mã đơn hàng: ${order.user_order_id}`,
            created_at: new Date(),
            updated_at: new Date(),
            url: `/user/purchase/order/${order.user_order_id}`,
        });

        return res.status(200).json({
            message: "Return request rejected successfully",
            success: true,
            data: returnRequest,
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: true,
        })
    }
}

const getReturnOrder = async (req, res) => {
    const { user_order_id, shop_id } = req.query;
    if (!user_order_id) {
        return res.status(400).json({
            error: true,
            message: "Missing return user_order_id",
        });
    }

    try {
        const returnOrder = await UserOrder.findOne({
            where: {
                user_order_id,
            },
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
        });

        return res.status(200).json({
            success: true,
            data: returnOrder,
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message,
        });
    }
}


async function adjustStockAndSales(order) {
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
    if (order?.UserOrderDetails?.length > 0) {
        await Promise.all(
            order?.UserOrderDetails?.map(async (product) => {
                await ProductVarients.increment(
                    { stock: product.quantity },
                    { where: { product_varients_id: product.product_varients_id } }
                );
                if (product.on_shop_register_flash_sales_id !== null) {
                    await ShopRegisterFlashSales.decrement(
                        { sold: product.quantity },
                        { where: { shop_register_flash_sales_id: product.on_shop_register_flash_sales_id } }
                    );
                }
            })
        );
    }

}

async function adjustVouchers(order) {
    if (order.vouchers_applied !== null) {
        const vouchersApplied = order.vouchers_applied.split(",").map(Number);
        await Promise.all(
            vouchersApplied.map(async (voucherId) => {
                await DiscountVoucher.increment(
                    { quantity: 1 },
                    { where: { discount_voucher_id: voucherId } }
                );
            })
        );
    }
}

module.exports = {
    getReturnRequest,
    acceptReturnRequest,
    rejectReturnRequest,
    getReturnOrder
}