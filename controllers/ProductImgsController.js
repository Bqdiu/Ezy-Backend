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

const addSomeProductImages = async (req, res) => {
    try {
        const { product_id, urls } = req.body;

        if (!product_id || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                error: true,
                message: "product_id and a non-empty array of urls are required"
            });
        }

        const newImages = await ProductImgs.bulkCreate(
            urls.map(url => ({
                product_id,
                url
            }))
        );

        res.status(200).json({
            success: true,
            data: newImages
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || 'An unexpected error occurred'
        });
    }
};

const deleteSomeProductImages = async (req, res) => {
    try {
        const { product_imgs_ids } = req.body;

        // Validate required fields
        if (!Array.isArray(product_imgs_ids) || product_imgs_ids.length === 0) {
            return res.status(400).json({
                error: true,
                message: "A non-empty array of product_imgs_ids is required"
            });
        }

        const transaction = await ProductImgs.sequelize.transaction();

        await ProductImgs.destroy({
            where: {
                product_imgs_id: product_imgs_ids
            },
            transaction
        });
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: "Product images deleted successfully",
            data: product_imgs_ids
        });
        
    }catch (error) {
        await transaction.rollback();

        console.error("Error deleting product images:", error); 
        res.status(500).json({
            error: true,
            message: error.message || 'An unexpected error occurred'
        });
    }
}


module.exports = {
    addProductImage,
    addSomeProductImages,
    deleteSomeProductImages
}