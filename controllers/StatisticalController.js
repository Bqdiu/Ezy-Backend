const {
    Product,
    UserOrder,
    UserOrderDetails,
    ProductVarients,
    ProductClassify,
    SubCategory,
    Category,
    Shop,
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

const getPlatformRevenue = async (req, res) => {
    const { start_date, end_date } = req.query;

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
        console.log("Parsed Start Date:", parsedStartDate);
        console.log("Parsed End Date:", parsedEndDate);
        const revenueByMonth = await UserOrder.findAll({
            attributes: [
                [fn("MONTH", col("created_at")), "month"],
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
                order_status_id: 5,
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            group: [fn("MONTH", col("created_at")), fn("YEAR", col("created_at"))],
        });

        const revenueByYear = await UserOrder.findAll({
            attributes: [
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
                order_status_id: 5,
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            group: [fn("YEAR", col("created_at"))],
        });

        const revenueByDay = await UserOrder.findAll({
            attributes: [
                [fn("DAY", col("created_at")), "day"],
                [fn("MONTH", col("created_at")), "month"],
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
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

        const revenueByWeek = await UserOrder.findAll({
            attributes: [
                [fn("WEEK", col("created_at")), "week"],
                [fn("YEAR", col("created_at")), "year"],
                [fn("SUM", col("total_price")), "total_revenue"],
            ],
            where: {
                order_status_id: 5,
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            group: [fn("WEEK", col("created_at")), fn("YEAR", col("created_at"))],
        });


        res.status(200).json({
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
        console.error("Error calculating platform revenue:", error);
        res.status(500).json({
            error: true,
            message: "Đã xảy ra lỗi khi tính doanh thu của sàn.",
        });
    }
};

const getTopSellerShops = async (req, res) => {
    try {
        // Tìm các shop với sản phẩm có doanh số > 0
        const shops = await Product.findAll({
            where: {
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
                                        order_status_id: 5, // Chỉ tính các đơn hàng đã hoàn thành
                                    },
                                    attributes: ["total_price"], // Chỉ lấy total_price
                                },
                            ],
                        },
                    ],
                },
            ],
            attributes: ["shop_id", "sold"], // Chỉ lấy shop_id và sold
            order: [["sold", "DESC"]],
        });

        // Gom nhóm theo shop_id và tính tổng doanh thu cho từng shop
        const shopRevenueMap = {};

        shops.forEach((product) => {
            const shopId = product.shop_id;
            if (!shopRevenueMap[shopId]) {
                shopRevenueMap[shopId] = {
                    shop_id: shopId,
                    total_revenue: 0,
                    products: [],
                };
            }

            // Tính doanh thu cho từng sản phẩm trong shop
            const productRevenue = product.ProductVarients.reduce((varientAcc, productVarient) => {
                const varientRevenue = productVarient.UserOrderDetails.reduce((detailAcc, userOrderDetail) => {
                    if (userOrderDetail.UserOrder) {
                        return detailAcc + userOrderDetail.UserOrder.total_price;
                    }
                    return detailAcc;
                }, 0);
                return varientAcc + varientRevenue;
            }, 0);

            // Cộng doanh thu vào tổng doanh thu shop
            shopRevenueMap[shopId].total_revenue += productRevenue;

            // Lưu thông tin sản phẩm
            shopRevenueMap[shopId].products.push({
                product_id: product.id,
                sold: product.sold,
                revenue: productRevenue,
            });
        });

        // Chuyển dữ liệu từ map sang mảng
        const shopStatistics = Object.values(shopRevenueMap);

        res.status(200).json({
            success: true,
            data: shopStatistics,
        });
    } catch (error) {
        console.error("Error getting best seller shops: ", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getTopSalesRevenue = async (req, res) => {
    const { start_date, end_date } = req.query;

    try {
        // Parse and validate the date range
        const now = new Date();
        const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 3 months ago
        const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

        const parsedStartDate = start_date ? new Date(start_date) : defaultStartDate;
        const parsedEndDate = end_date ? new Date(end_date) : defaultEndDate;

        if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid start_date or end_date.",
            });
        }

        if (parsedStartDate > parsedEndDate) {
            return res.status(400).json({
                success: false,
                message: "start_date must be before end_date.",
            });
        }

        // Query to fetch top 5 shops by total revenue within the specified range
        const topShops = await UserOrder.findAll({
            attributes: [
                "shop_id",
                [fn("SUM", col("UserOrder.total_price")), "total_revenue"],
            ],
            where: {
                order_status_id: 5, // Only completed orders
                created_at: {
                    [Op.between]: [parsedStartDate, parsedEndDate],
                },
            },
            include: [
                {
                    model: Shop,
                    attributes: ["shop_name"],
                },
            ],
            group: ["shop_id", "Shop.shop_name"],
            order: [[fn("SUM", col("UserOrder.total_price")), "DESC"]],
            limit: 5, // Limit to top 5 results
        });

        // Format the response
        const formattedShops = topShops.map((shop) => ({
            shop_id: shop.shop_id,
            shop_name: shop.Shop?.shop_name || "Unknown",
            total_revenue: parseFloat(shop.dataValues.total_revenue) || 0,
        }));

        res.status(200).json({
            success: true,
            data: formattedShops,
        });
    } catch (error) {
        console.error("Error fetching top shops by revenue:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching top shops by revenue.",
        });
    }
};

const getTopCategorySales = async (req, res) => {
    const { start_date, end_date } = req.query;

    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 3 months ago

    const parsedStartDate = start_date && !isNaN(new Date(start_date)) ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date && !isNaN(new Date(end_date)) ? new Date(end_date) : defaultEndDate;

    if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
            error: true,
            message: "start_date must be before end_date",
        });
    }

    try {
        // Fetch category sales data
        const categorySales = await UserOrderDetails.findAll({
            attributes: [
                [fn("SUM", col("UserOrderDetails.quantity")), "total_quantity_sold"],
                [col("ProductVarient->Product->SubCategory->Category.category_name"), "category_name"],
            ],
            include: [
                {
                    model: ProductVarients,
                    as: "ProductVarient",
                    attributes: [],
                    include: [
                        {
                            model: Product,
                            as: "Product",
                            attributes: [],
                            include: [
                                {
                                    model: SubCategory,
                                    as: "SubCategory",
                                    attributes: [],
                                    include: [
                                        {
                                            model: Category,
                                            as: "Category",
                                            attributes: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: UserOrder,
                    as: "UserOrder",
                    attributes: [],
                    where: {
                        order_status_id: 5, // Completed orders
                        created_at: {
                            [Op.between]: [parsedStartDate, parsedEndDate],
                        },
                    },
                },
            ],
            group: [col("ProductVarient->Product->SubCategory->Category.category_name")],
            order: [[fn("SUM", col("UserOrderDetails.quantity")), "DESC"]],
            limit: 10,
        });

        res.status(200).json({
            success: true,
            data: categorySales,
        });
    } catch (error) {
        console.error("Error fetching category sales data:", error);
        res.status(500).json({
            error: true,
            message: "An error occurred while fetching category sales data.",
        });
    }
};


const getTopSubCategorySales = async (req, res) => {
    const { start_date, end_date } = req.query;

    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 3 months ago

    const parsedStartDate = start_date && !isNaN(new Date(start_date)) ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date && !isNaN(new Date(end_date)) ? new Date(end_date) : defaultEndDate;

    if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
            error: true,
            message: "start_date must be before end_date",
        });
    }

    try {
        // Fetch subcategory sales data
        const subCategorySales = await UserOrderDetails.findAll({
            attributes: [
                [fn("SUM", col("UserOrderDetails.quantity")), "total_quantity_sold"],
                [col("ProductVarient->Product->SubCategory.sub_category_name"), "sub_category_name"],
            ],
            include: [
                {
                    model: ProductVarients,
                    as: "ProductVarient",
                    attributes: [],
                    include: [
                        {
                            model: Product,
                            as: "Product",
                            attributes: [],
                            include: [
                                {
                                    model: SubCategory,
                                    as: "SubCategory",
                                    attributes: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: UserOrder,
                    as: "UserOrder",
                    attributes: [],
                    where: {
                        order_status_id: 5, // Completed orders
                        created_at: {
                            [Op.between]: [parsedStartDate, parsedEndDate],
                        },
                    },
                },
            ],
            group: [col("ProductVarient->Product->SubCategory.sub_category_name")],
            order: [[fn("SUM", col("UserOrderDetails.quantity")), "DESC"]],
            limit: 10,
        });

        res.status(200).json({
            success: true,
            data: subCategorySales,
        });
    } catch (error) {
        console.error("Error fetching subcategory sales data:", error);
        res.status(500).json({
            error: true,
            message: "An error occurred while fetching subcategory sales data.",
        });
    }
};

const getTopProductVariientSales = async (req, res) => {
    const { start_date, end_date } = req.query;

    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 3 months ago

    const parsedStartDate = start_date && !isNaN(new Date(start_date)) ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date && !isNaN(new Date(end_date)) ? new Date(end_date) : defaultEndDate;

    if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
            error: true,
            message: "start_date must be before end_date",
        });
    }

    try {
        // Fetch product variant sales data
        const productVarientSales = await UserOrderDetails.findAll({
            attributes: [
                [fn("SUM", col("UserOrderDetails.quantity")), "total_quantity_sold"],
                [col("ProductVarient.product_varients_id"), "product_varients_id"],
                [col("ProductVarient.classify"), "classify"],
                [col("ProductVarient.Product.product_name"), "product_name"],
                [col("ProductVarient.ProductClassify.product_classify_name"), "product_classify_name"],
                [col("ProductVarient.ProductClassify.type_name"), "type_name"],
            ],
            include: [
                {
                    model: ProductVarients,
                    as: "ProductVarient",
                    attributes: [],
                    include: [
                        {
                            model: Product,
                            as: "Product",
                            attributes: [],
                        },
                        {
                            model: ProductClassify,
                            as: "ProductClassify",
                            attributes: [],
                        },
                    ],
                },
                {
                    model: UserOrder,
                    as: "UserOrder",
                    attributes: [],
                    where: {
                        order_status_id: 5,
                        created_at: {
                            [Op.between]: [parsedStartDate, parsedEndDate],
                        },
                    },
                },
            ],
            group: [
                col("ProductVarient.product_varients_id"),
                col("ProductVarient.classify"),
                col("ProductVarient.Product.product_name"),
                col("ProductVarient.ProductClassify.product_classify_name"),
            ],
            order: [[fn("SUM", col("UserOrderDetails.quantity")), "DESC"]],
            limit: 10,
        });

        res.status(200).json({
            success: true,
            data: productVarientSales,
        });
    } catch (error) {
        console.error("Error fetching product variant sales data:", error);
        res.status(500).json({
            error: true,
            message: "An error occurred while fetching product variant sales data.",
        });
    }
};
const getTopProductSales = async (req, res) => {
    const { start_date, end_date } = req.query;

    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 3 months ago

    const parsedStartDate = start_date && !isNaN(new Date(start_date)) ? new Date(start_date) : defaultStartDate;
    const parsedEndDate = end_date && !isNaN(new Date(end_date)) ? new Date(end_date) : defaultEndDate;

    if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
            error: true,
            message: "start_date must be before end_date",
        });
    }

    try {
        // Fetch top product sales data
        const productSales = await UserOrderDetails.findAll({
            attributes: [
                [fn("SUM", col("UserOrderDetails.quantity")), "total_quantity_sold"],
                [col("ProductVarient.Product.product_id"), "product_id"],
                [col("ProductVarient.Product.product_name"), "product_name"],
            ],
            include: [
                {
                    model: ProductVarients,
                    as: "ProductVarient",
                    attributes: [],
                    include: [
                        {
                            model: Product,
                            as: "Product",
                            attributes: [],
                        },
                    ],
                },
                {
                    model: UserOrder,
                    as: "UserOrder",
                    attributes: [],
                    where: {
                        order_status_id: 5, // Only completed orders
                        created_at: {
                            [Op.between]: [parsedStartDate, parsedEndDate],
                        },
                    },
                },
            ],
            group: [
                col("ProductVarient.Product.product_id"),
                col("ProductVarient.Product.product_name"),
            ],
            order: [[fn("SUM", col("UserOrderDetails.quantity")), "DESC"]],
            limit: 10,
        });

        res.status(200).json({
            success: true,
            data: productSales,
        });
    } catch (error) {
        console.error("Error fetching top product sales data:", error);
        res.status(500).json({
            error: true,
            message: "An error occurred while fetching top product sales data.",
        });
    }
};


module.exports = {
    getBestSellerShop,
    getOrderStatistics,
    getSalesRevenue,
    getPlatformRevenue,
    getTopSellerShops,
    getTopSalesRevenue,
    getTopCategorySales,
    getTopSubCategorySales,
    getTopProductVariientSales,
    getTopProductSales
}