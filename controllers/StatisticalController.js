const {
    Product,
    UserOrder,
    UserOrderDetails,
    ProductVarients,
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
                sold: {
                    [Op.gt]: 0,
                },
            },
            include: [
                {
                    model: ProductVarients,
                    include: [
                        {
                            model: UserOrderDetails,
                            include: [
                                {
                                    model: UserOrder,
                                    where: {
                                        order_status_id: 5,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [["sold", "DESC"]],
            limit: 5,
        });

        // get sum total price of each UserOrder in ProductVarients if UserOrde is not null

        const total_price_revenue = products.map((product) => {
            const total_price = product.ProductVarients.map((product_varient) => {
                const total_price = product_varient.UserOrderDetails.reduce((acc, userOrderDetail) => {
                    if (userOrderDetail.UserOrder) {
                        return acc + userOrderDetail.UserOrder.total_price;
                    }
                    return acc;
                }, 0);
                return total_price;
            });
            return total_price.reduce((acc, price) => acc + price, 0);
        }
        );



        res.status(200).json({
            success: true,
            data: {
                products: products, 
                total_price_revenue: total_price_revenue,
            },
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
            message: "Thiếu shop_id",
        });
    }

    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ngày cuối của tháng hiện tại
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Ngày đầu của 3 tháng trước

    const parsedStartDate = start_date && !isNaN(new Date(start_date)) ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date && !isNaN(new Date(end_date)) ? new Date(end_date) : defaultEndDate;

    if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
            error: true,
            message: "start_date phải trước end_date",
        });
    }

    try {
        // Revenue by month
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
            group: [fn("MONTH", col("created_at")), fn("YEAR", col("created_at"))],
        });

        // Revenue by year
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
            group: [fn("YEAR", col("created_at"))],
        });

        // Revenue by day
        const revenueByDay = await UserOrder.findAll({
            attributes: [
                [fn("DAY", col("created_at")), "day"],
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
            group: [
                fn("DAY", col("created_at")),
                fn("MONTH", col("created_at")),
                fn("YEAR", col("created_at")),
            ],
        });

        // Revenue by week
        const revenueByWeek = await UserOrder.findAll({
            attributes: [
                [fn("WEEK", col("created_at")), "week"],
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
            group: [fn("WEEK", col("created_at")), fn("YEAR", col("created_at"))],
        });
        return res.status(200).json({
            success: true,
            data: {
                revenueByDay,
                revenueByWeek,
                revenueByMonth,
                revenueByYear,
                start_date: parsedStartDate,
                end_date: parsedEndDate,
            },
        });
    } catch (error) {
        console.error(error); // Ghi log lỗi
        return res.status(500).json({
            error: true,
            message: "Đã xảy ra lỗi khi lấy doanh thu.",
        });
    }
};





module.exports = {
    getBestSellerShop,
    getOrderStatistics,
    getSalesRevenue
}