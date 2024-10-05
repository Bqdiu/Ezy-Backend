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
        lenght,
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
            lenght: lenght,
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

module.exports = {
    addProductVarients,
}