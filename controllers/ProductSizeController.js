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

const deleteSomeProductSize = async (req, res) => {
    const { product_size_ids } = req.body;

    if (!product_size_ids || !Array.isArray(product_size_ids) || product_size_ids.length === 0) {
        return res.status(400).json({
            error: true,
            message: "product_size_ids must be an array and not empty"
        });
    }

    const transaction = await ProductSize.sequelize.transaction();
    try {
        const product_sizes = await ProductSize.destroy({
            where: {
                product_size_id: product_size_ids
            },
            transaction
        });
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
};

const updateSomeProductSize = async (req, res) => {
    const { product_size_ids, product_size_names, type_of_size } = req.body;

    if (!product_size_ids || !Array.isArray(product_size_ids) || product_size_ids.length === 0) {
        return res.status(400).json({
            error: true,
            message: "product_size_ids must be an array and not empty"
        });
    }

    if (!product_size_names || !Array.isArray(product_size_names) || product_size_names.length === 0) {
        return res.status(400).json({
            error: true,
            message: "product_size_names must be an array and not empty"
        });
    }

    if (product_size_ids.length !== product_size_names.length) {
        return res.status(400).json({
            error: true,
            message: "product_size_ids and product_size_names must have the same length"
        });
    }

    const product_sizes = await ProductSize.findAll({
        where: {
            product_size_id: product_size_ids
        }
    });

    if (product_sizes.length !== product_size_ids.length) {
        return res.status(404).json({
            error: true,
            message: "Some product_size_ids not found"
        });
    }

    const transaction = await ProductSize.sequelize.transaction();
    try {
        const product_sizes = [];
        for (let i = 0; i < product_size_ids.length; i++) {
            const updatedProductSize = await ProductSize.update({
                product_size_name: product_size_names[i],
                type_of_size: type_of_size
            }, {
                where: {
                    product_size_id: product_size_ids[i]
                },
                transaction
            });

            product_sizes.push(updatedProductSize);
        }
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
};

const updateTypeOfProductSize = async (req, res) => {
    const { product_id, type_of_size } = req.body;
    
    if (!product_id || !type_of_size) {
        return res.status(400).json({
            error: true,
            message: "product_id and type_of_size are required"
        });
    }

    const transaction = await ProductSize.sequelize.transaction();
    try {
        const product_sizes = await ProductSize.update({
            type_of_size: type_of_size
        }, {
            where: {
                product_id: product_id
            },
            transaction
        });

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
    addSomeProductSize,
    deleteSomeProductSize,
    updateSomeProductSize,
    updateTypeOfProductSize
}