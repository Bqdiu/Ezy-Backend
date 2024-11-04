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

const addSomeProductSize = async (req, res) => {
    const {
        product_id,
        product_size_names,
        type_of_size,
    } = req.body;
    if (!product_id || !product_size_names || !type_of_size) {
        res.status(400).json({
            error: true,
            message: "product_id, product_size_names, type_of_size are required"
        });
    }
    if (product_size_names.length === 0 || !Array.isArray(product_size_names)) {
        res.status(400).json({
            error: true,
            message: "product_size_names must be an array and not empty"
        });
    }
    const transaction = await ProductSize.sequelize.transaction();

    try {
        const product_sizes = await ProductSize.bulkCreate(product_size_names.map((product_size_name) => {
            return {
                product_id: product_id,
                product_size_name: product_size_name,
                type_of_size: type_of_size,
            }
        }), { transaction });
        await transaction.commit();
        res.status(200).json({
            success: true,
            data: product_sizes
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }

}

module.exports = {
    addProductSize,
    getSizeOfProduct,
    addSomeProductSize
}