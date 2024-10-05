const {
    Product,
    ProductClassify,
} = require("../models/Assosiations");

const getAllProductClassify = async (req, res) => {
    try {
        const productClassify = await ProductClassify.findAll();
        res.status(200).json({
            success: true,
            data: productClassify,
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error 
        });
    }
}


const getProductClassifyByProductID = async (req, res) => {
    try {
        const { product_id } = req.query;
        const productClassify = await ProductClassify.findAll({
            where: { product_id: product_id },
            include: [
                {
                    model: Product,
                    attributes: ["product_id", "product_name"],
                },
            ],
        });
        res.status(200).json({
            success: true,
            data: productClassify,
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error 
        });
    }
}

const addProductClassify = async (req, res) => {
    const {
        product_id,
        product_classify_name,
        type_name,
        thumbnail,
    } = req.body;
    try {
        const product_classify = await ProductClassify.create({
            product_id: product_id,
            product_classify_name: product_classify_name,
            type_name: type_name,
            thumbnail: thumbnail
        });
        res.status(200).json({
            success: true,
            data: product_classify
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}

module.exports = {
    getAllProductClassify,
    getProductClassifyByProductID,
    addProductClassify
};  