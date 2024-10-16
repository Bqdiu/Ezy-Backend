const {
    ProductSize,
} = require("../models/Assosiations");

const getSizeOfProduct = async (req, res) => {
    try {
        const { product_id } = req.query;
        const product_size = await ProductSize.findAll({
            where: { product_id: product_id },
            attributes: ["product_size_id"],
        });
        res.status(200).json({
            success: true,
            data: product_size,
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}

const addProductSize = async (req, res) => {
    const {
        product_id,
        product_size_name,
        type_of_size,
    } = req.body;
    try {
        const product_size = await ProductSize.create({
            product_id: product_id,
            product_size_name: product_size_name,
            type_of_size: type_of_size,
        });
        res.status(200).json({
            success: true,
            data: product_size
        });

    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}

module.exports = {
    addProductSize,
    getSizeOfProduct
}