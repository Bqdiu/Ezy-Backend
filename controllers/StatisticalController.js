const {
    Product,
    UserOrder,
} = require("../models/Assosiations");

const sequelize = require("../config/database");
const { Op, fn, col } = require("sequelize");
const getBestSellerShop = async (req, res) => {
    const { shop_id } = req.query;
    if (!shop_id) {
        return res.status(400).json({
            success: false,
            message: "shop_id is required",
        });
    }
    try {
        const products = await Product.findAll({
            where: {
                shop_id,
            },
            limit: 10,
            order: [["sold", "DESC"]],
        });

        res.status(200).json({
            success: true,
            data: products,
        });
    } catch (error) {
        console.log("Error getting best seller shop: ", error);
        res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
}

const getOrderStatistics = async (req, res) => {
    const { shop_id } = req.query;
    if (!shop_id) {
        return res.status(400).json({
            error: true,
            message: "Missing shop_id",
        });
    }
    try {
        // get order status 2
        const orderStatus2 = await UserOrder.findAll({
            where: {
                shop_id,
                order_status_id: 2,
            },
        });
        // order status 3
        const orderStatus3 = await UserOrder.findAll({
            where: {
                shop_id,
                order_status_id: 3,
            },
        });
        // order status 4
        const orderStatus4 = await UserOrder.findAll({
            where: {
                shop_id,
                order_status_id: 4,
            },
        });
        // order status 5
        const orderStatus5 = await UserOrder.findAll({

            where: {
                shop_id,
                order_status_id: 5,
            },
        });
        // order status 6
        const orderStatus6 = await UserOrder.findAll({
            where: {
                shop_id,
                order_status_id: 6,
            },
        });
        // order status 7
        const orderStatus7 = await UserOrder.findAll({
            where: {
                shop_id,
                order_status_id: 7,
            },
        });
        // product sold out 
        const product_sold_out = await Product.findAll({
            where: {
                shop_id,
                stock: 0
            },
        });
        // product status 1
        const product_status1 = await Product.findAll({
            where: {
                shop_id,
                product_status: 1
            },
        });

        return res.status(200).json({
            success: true,
            data: {
                status_2: orderStatus2.length,
                status_3: orderStatus3.length,
                status_4: orderStatus4.length,
                status_5: orderStatus5.length,
                status_6: orderStatus6.length,
                status_7: orderStatus7.length,
                product_sold_out: product_sold_out.length,
                product_active: product_status1.length
            }
        });

    } catch (error) {
        return res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
}
const getSalesRevenue = async (req, res) => {
    const { shop_id, start_date, end_date } = req.query;

    if (!shop_id) {
        return res.status(400).json({
            error: true,
            message: "Missing shop_id",
        });
    }

    // Xác định khoảng thời gian mặc định là 3 tháng gần nhất
    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ngày cuối cùng của tháng hiện tại
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Ngày đầu tiên của tháng 3 tháng trước

    const parsedStartDate = start_date ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date ? new Date(end_date) : defaultEndDate;

    try {
        const revenueByMonth = await UserOrder.findAll({
            attributes: [
                [fn("MONTH", col("created_at")), "month"],
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
                shop_id,
                order_status_id: 5,
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            group: ["month", "year"],
        });

        const revenueByYear = await UserOrder.findAll({
            attributes: [
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
                shop_id,
                order_status_id: 5,
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            group: ["year"],
        })

        return res.status(200).json({
            success: true,
            data: {
                revenueByMonth,
                revenueByYear,
                start_date: parsedStartDate,
                end_date: parsedEndDate,
            }
        });

    } catch (error) {
        return res.status(500).json({
            error: true,
            message: error.message || error,
        });
    }
};

module.exports = {
    getBestSellerShop,
    getOrderStatistics,
    getSalesRevenue
}