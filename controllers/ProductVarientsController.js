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
    if (!product_id || !product_classify_id) {
        res.status(400).json({
            error: true,
            message: "Product ID and Product Classify ID are required"
        });
    }
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
        const product_varients = await ProductVarients.findAll({
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

const deleteAllProductVarients = async (req, res) => {
    const { product_id } = req.body;
    const transaction = await ProductVarients.sequelize.transaction(); // Khởi tạo transaction

    try {
        // Thực hiện thao tác xóa với transaction
        const deleteCount = await ProductVarients.destroy({
            where: { product_id: product_id },
            transaction
        });

        if (deleteCount === 0) {
            // Nếu không có bản ghi nào bị xóa, rollback transaction
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: "No product varients found to delete"
            });
        }

        // Commit transaction nếu xóa thành công tất cả bản ghi
        await transaction.commit();
        res.status(200).json({
            success: true,
            message: "Delete all product varients successfully"
        });
    } catch (error) {
        // Rollback transaction nếu có lỗi
        await transaction.rollback();

        if (error.original && error.original.errno === 1451) {
            res.status(400).json({
                error: true,
                message: "Cannot delete product varients as it is referenced by other records."
            });
        } else {
            res.status(500).json({
                error: true,
                message: error.message || error
            });
        }
    }
}

const deleteSomeProductVarients = async (req, res) => {
    const { product_varients_ids } = req.body;
    if (!Array.isArray(product_varients_ids) || product_varients_ids.length === 0) {
        return res.status(400).json({ message: "product_varients_id invalid" });
    }
    const transaction = await ProductVarients.sequelize.transaction();
    try {
        const deleteCount = await ProductVarients.destroy({
            where: { product_varients_id: product_varients_ids },
            transaction
        });

        if (deleteCount === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: "Not found product_varients_id" });
        }

        await transaction.commit();
        res.status(200).json({
            success: true,
            message: "Delete successfully"
        });
    } catch (error) {
        await transaction.rollback();
        if (error.original && error.original.errno === 1451) {
            res.status(400).json({
                error: true,
                message: "Cannot delete product varients as it is referenced by other records."
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
    deleteProductVarients,
    deleteAllProductVarients,
    deleteSomeProductVarients
}