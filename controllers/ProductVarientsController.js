const {
    ProductVarients,
} = require("../models/Assosiations");

const addProductVarients = async (req, res) => {
    const {
        product_id,
        product_classify_id,
        product_size_id,
        price,
        stock,
        sale_percents,
        height,
        length,
        width,
        weight,
    } = req.body;
    try {
        const product_varient = await ProductVarients.create({
            product_id: product_id,
            product_classify_id: product_classify_id,
            product_size_id: product_size_id,
            price: price,
            stock: stock,
            sale_percents: sale_percents,
            height: height,
            length: length,
            width: width,
            weight: weight
        });
        res.status(200).json({
            success: true,
            data: product_varient
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}

const findProductVarients = async (req, res) => {
    const { product_id } = req.query;
    if (!product_id) {
        res.status(400).json({
            error: true,
            message: "Product ID is required"
        });
    }
    try {
        const product_varients = await ProductVarients.findOne({
            where: { product_id: product_id }
        });
        res.status(200).json({
            success: true,
            data: product_varients
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}

const deleteProductVarients = async (req, res) => {
    const { product_varients_id } = req.body;
    try {
        await ProductVarients.destroy({
            where: { product_varients_id: product_varients_id }
        });
        res.status(200).json({
            success: true,
            message: "Delete product varient successfully"
        });
    } catch (error) {
        if (error.original && error.original.errno === 1451) {
            res.status(400).json({
                error: true,
                message: "Cannot delete product varient as it is referenced by other records."
            });
        } else {
            res.status(500).json({
                error: true,
                message: error.message || error
            });
        }
    }
}


module.exports = {
    addProductVarients,
    findProductVarients,
    deleteProductVarients
}