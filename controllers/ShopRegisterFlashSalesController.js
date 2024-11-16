const { Op } = require("sequelize");
const {
    FlashSales,
    ShopRegisterFlashSales,
    Product,
} = require("../models/Assosiations");
const FlashSaleTimerFrame = require("../models/FlashSaleTimeFrame");
const moment = require("moment-timezone");
const { da } = require("translate-google/languages");
const timeInVietnam = moment.tz("Asia/Ho_Chi_Minh");

const getProductShopRegisterFlashSales = async (req, res) => {
    try {
        const { shop_id, flash_sale_time_frame_id } = req.query;

        if (!shop_id) {
            return res.status(400).json({ message: "shop_id is required" });
        }

        let whereCondition = {
            shop_id,
        };

        if (flash_sale_time_frame_id) {
            whereCondition.flash_sale_time_frame_id = flash_sale_time_frame_id;
        }

        const shopRegisterFlashSales = await ShopRegisterFlashSales.findAll({
            where: whereCondition,
            include: [
                {
                    model: FlashSaleTimerFrame,
                },
                {
                    model: Product,
                },
            ],
        });
        return res.status(200).json({
            success: true,
            data: shopRegisterFlashSales
        });
    } catch (error) {
        console.error("Error fetching shop register flash sales:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}
const registerProductToFlashSale = async (req, res) => {
    try {
        const {
            shop_id,
            product_id,
            flash_sale_time_frame_id,
            original_price,
            flash_sale_price,
            quantity
        } = req.body;

        const requiredFields = {
            shop_id: "shop_id là bắt buộc",
            product_id: "product_id là bắt buộc",
            flash_sale_time_frame_id: "flash_sale_time_frame_id là bắt buộc",
            original_price: "original_price là bắt buộc",
            flash_sale_price: "Giá giảm là bắt buộc",
            quantity: "Số lượng là bắt buộc"
        };

        for (const [field, errorMessage] of Object.entries(requiredFields)) {
            if (!req.body[field]) {
                return res.status(400).json({ message: errorMessage });
            }
        }

        if (isNaN(shop_id) || isNaN(product_id) || isNaN(flash_sale_time_frame_id) || isNaN(original_price) || isNaN(flash_sale_price) || isNaN(quantity)) {
            return res.status(400).json({
                message: "shop_id, product_id, flash_sale_time_frame_id, original_price, flash_sale_price, quantity phải là số"
            });
        }

        const product = await Product.findOne({
            where: { product_id }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Calculate total reserved stock for the product in existing flash sales
        const existingFlashSales = await ShopRegisterFlashSales.findAll({
            where: { product_id },
            include: [
                {
                    model: FlashSaleTimerFrame,
                    where: {
                        status: {
                            [Op.or]: ["active", "waiting"]
                        }
                    }
                }
            ]
        });

        const totalReservedStock = existingFlashSales.reduce((total, flashSale) => total + flashSale.quantity, 0);
        let availableStock = product.stock - totalReservedStock;

        // Check if the product is already registered in the same flash sale time frame
        const existingRegistration = await ShopRegisterFlashSales.findOne({
            where: {
                shop_id,
                product_id,
                flash_sale_time_frame_id
            }
        });

        if (existingRegistration) {
            // Adjust available stock for the difference in quantity
            const oldQuantity = existingRegistration.quantity;
            const quantityDifference = quantity - oldQuantity;

            availableStock -= quantityDifference;

            if (availableStock < 0) {
                return res.status(400).json({
                    message: `Số lượng sản phẩm không đủ. Số lượng có thể đăng kí là ${availableStock + quantityDifference}`,
                    available_stock: availableStock + quantityDifference
                });
            }

            if (flash_sale_price >= original_price) {
                return res.status(400).json({
                    message: "Giá giảm phải nhỏ hơn giá gốc"
                });
            }

            // Update the existing record
            existingRegistration.original_price = original_price;
            existingRegistration.flash_sale_price = flash_sale_price;
            existingRegistration.quantity = quantity;
            await existingRegistration.save();

            return res.status(200).json({
                success: true,
                message: "Flash sale registration updated successfully",
                data: existingRegistration
            });
        } else {
            if (quantity > availableStock) {
                return res.status(400).json({
                    message: `Số lượng sản phẩm không đủ. Số lượng có thể đăng kí là ${availableStock}`,
                    available_stock: availableStock
                });
            }

            if (flash_sale_price >= original_price) {
                return res.status(400).json({
                    message: "Giá giảm phải nhỏ hơn giá gốc"
                });
            }


            // Register product to flash sale
            const shopRegisterFlashSale = await ShopRegisterFlashSales.create({
                shop_id,
                product_id,
                flash_sale_time_frame_id,
                original_price,
                flash_sale_price,
                quantity
            });

            return res.status(200).json({
                success: true,
                message: "Product registered to flash sale successfully",
                data: shopRegisterFlashSale
            });
        }
    } catch (error) {
        console.error("Error registering product to flash sale:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const unsubscribeFlashSale = async (req, res) => {
    try {
        const { shop_id, product_id, flash_sale_time_frame_id } = req.body;

        if (!shop_id || !product_id || !flash_sale_time_frame_id) {
            return res.status(400).json({ message: "shop_id, product_id, flash_sale_time_frame_id are required" });
        }

        if (isNaN(shop_id) || isNaN(product_id) || isNaN(flash_sale_time_frame_id)) {
            return res.status(400).json({ message: "shop_id, product_id, flash_sale_time_frame_id must be numbers" });
        }

        const shopRegisterFlashSale = await ShopRegisterFlashSales.findOne({
            where: {
                shop_id,
                product_id,
                flash_sale_time_frame_id
            }
        });

        if (!shopRegisterFlashSale) {
            return res.status(404).json({ message: "Flash sale registration not found" });
        }

        await shopRegisterFlashSale.destroy();

        return res.status(200).json({
            success: true,
            message: "Flash sale registration deleted successfully"
        });
    } catch (error) {
        console.error("Error unsubscribing from flash sale:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};




module.exports = {
    getProductShopRegisterFlashSales,
    registerProductToFlashSale
}