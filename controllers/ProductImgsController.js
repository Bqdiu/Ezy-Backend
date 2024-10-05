const {
    Product,
    ProductImgs
} = require("../models/Assosiations");

const addProductImage = async (req, res) => {
    try {
        const { product_id, url } = req.body;
        const newImage = await ProductImgs.create({
            product_id: product_id,
            url: url
        });
        res.status(200).json({
            success: true,
            data: newImage
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });        
    }
}



module.exports = {
    addProductImage
}