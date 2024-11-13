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
} = require("../models/Assosiations");

const {
    createOrderGHN
} = require("../services/ghnServices");
const ReturnType = require("../models/ReturnType");
const { ca, da } = require("translate-google/languages");


const getReturnRequest = async (req, res) => {
    const { shop_id, return_type_id, limit = 5, page = 1 } = req.query;
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
            where: { user_order_id: returnRequest.user_order_id }
        });
        if (!order) {
            return res.status(404).json({ error: true, message: "Order not found" });
        }
        data.cod_amount = 0;
        data.payment_type_id = order.shipping_fee > 0 ? 2 : 1;
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
                is_processed : 1,
                order_status_id: 7,
                updated_at: new Date(),
            });
            await returnRequest.update({
                status_id: 2,
                updatedAt: new Date(),
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
        // update return request
        await returnRequest.update({
            status_id: 3,
            updatedAt: new Date(),
        })

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

module.exports = {
    getReturnRequest,
    acceptReturnRequest,
    rejectReturnRequest,
    getReturnOrder
}