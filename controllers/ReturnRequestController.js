const sequelize = require("../config/database");
const { Op, Sequelize, or, where } = require("sequelize");

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
} = require("../models/Assosiations");

const {
    getOrderDetailGHN,
    createOrderGHN,
    cancelOrderGHN,
} = require("../services/ghnServices");
const ReturnType = require("../models/ReturnType");


const getReturnRequest = async (req, res) => {
    const { shop_id, return_type_id } = req.query;
    if (!return_type_id) {
        return res.status(400).json({
            message: "Return Type ID is required",
            error: true,
        })
    }

    if(!shop_id){
        return res.status(400).json({
            message: "Shop ID is required",
            error: true,
        })
    }

    try {
        const returnRequest = await ReturnRequest.findAll({
            where: {
                shop_id,
                return_type_id
            },
            include: [
                {
                    model: UserOrder,
                    include: [
                        {
                            model: UserOrderDetails,
                            include: [
                                {
                                    model: ProductVarients,
                                    include: [
                                        {
                                            model: Product,
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: OrderStatus,
                        },
                    ]
                },
                {
                    model: ReturnReason,
                },
                {
                    model: ReturnType,
                }
            ]
        })

        return res.status(200).json({
            message: "Return request fetched successfully",
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


module.exports = {
    getReturnRequest,
}