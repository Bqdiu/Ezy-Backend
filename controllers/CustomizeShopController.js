const { su } = require("translate-google/languages");
const {
    CustomizeShop,
    ImgCustomizeShop,
} = require("../models/Assosiations");

const getCustomizeShop = async (req, res) => {
    const { shop_id } = req.query;
    if (!shop_id) {
        return res.status(400).json({
            error: true,
            message: "Shop ID is required"
        });
    }
    try {
        const customizeShop = await CustomizeShop.findAll({
            where: {
                shop_id: shop_id
            },
            include: [
                {
                    model: ImgCustomizeShop,
                }
            ]
        });

        if (customizeShop.length === 0) {
            return res.status(404).json({
                error: true,
                message: "Customize shop not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: customizeShop
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message
        });
    }
};
const createCustomize = async (req, res) => {
    const { shop_id, img_urls } = req.body;

    if (!shop_id) {
        return res.status(400).json({
            error: true,
            message: "Shop ID is required"
        });
    }

    if (!Array.isArray(img_urls) || img_urls.length === 0) {
        return res.status(400).json({
            error: true,
            message: "img_urls invalid"
        });
    }

    const transaction = await CustomizeShop.sequelize.transaction();
    try {
        const customizeShop = await CustomizeShop.create(
            { shop_id },
            { transaction }
        );

        const imgCustomizeShop = img_urls.map((img_url) => ({
            customize_shop_id: customizeShop.customize_shop_id,
            img_url
        }));

        await ImgCustomizeShop.bulkCreate(imgCustomizeShop, { transaction });

        await transaction.commit();
        return res.status(200).json({
            success: true,
            data: customizeShop
        });
    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message
        });
    }
};

const addImageCustom = async (req, res) => {
    const { customize_shop_id, img_urls } = req.body;

    if (!customize_shop_id) {
        return res.status(400).json({
            error: true,
            message: "Customize shop ID is required"
        });
    }

    if (!Array.isArray(img_urls) || img_urls.length === 0) {
        return res.status(400).json({
            error: true,
            message: "img_urls invalid"
        });
    }

    const transaction = await ImgCustomizeShop.sequelize.transaction();
    try {

        const customizeShop = await CustomizeShop.findOne({
            where: { customize_shop_id }
        });

        if (!customizeShop) {
            return res.status(404).json({
                error: true,
                message: "Customize shop not found"
            });
        }

        const imgCustomizeShop = img_urls.map((img_url) => ({
            customize_shop_id,
            img_url
        }));

        const created = await ImgCustomizeShop.bulkCreate(imgCustomizeShop, { transaction });

        await transaction.commit();
        return res.status(200).json({
            success: true,
            data: created
        });
    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message
        });
    }
};
const deleteImageCustom = async (req, res) => {
    const { img_customize_shop_ids } = req.body;

    if (!Array.isArray(img_customize_shop_ids) || img_customize_shop_ids.length === 0) {
        return res.status(400).json({
            error: true,
            message: "img_customize_shop_ids invalid"
        });
    }

    const transaction = await ImgCustomizeShop.sequelize.transaction();

    try {
        const existingImages = await ImgCustomizeShop.findAll({
            where: { img_customize_shop_id: img_customize_shop_ids },
            attributes: ['img_customize_shop_id'],
            raw: true 
        });

        const validIds = existingImages.map(img => img.img_customize_shop_id);

        if (validIds.length === 0) {
            return res.status(404).json({
                error: true,
                message: "No valid images found to delete"
            });
        }

        await ImgCustomizeShop.destroy({
            where: { img_customize_shop_id: validIds },
            transaction
        });

        await transaction.commit();

        return res.status(200).json({
            success: true,
            message: "Images deleted",
            data: validIds
        });
    } catch (error) {
        await transaction.rollback();

        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message
        });
    }
};


const deleteCustomizeShop = async (req, res) => {
    const { customize_shop_id } = req.body;

    if (!customize_shop_id) {
        return res.status(400).json({
            error: true,
            message: "Customize shop ID is required"
        });
    }

    const transaction = await CustomizeShop.sequelize.transaction();
    try {

        const custom_shop = await CustomizeShop.findOne({
            where: { customize_shop_id }
        });

        if (!custom_shop) {
            return res.status(404).json({
                error: true,
                message: "Customize shop not found"
            });
        }

        const count = await ImgCustomizeShop.count({
            where: { customize_shop_id }
        });

        if (count > 0) {
            await ImgCustomizeShop.destroy({
                where: { customize_shop_id },
                transaction
            });
        }

        await CustomizeShop.destroy({
            where: { customize_shop_id },
            transaction
        });

        await transaction.commit();
        return res.status(200).json({
            success: true,
            message: "Customize shop deleted"
        });
    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({
            error: true,
            message: "Server error",
            details: error.message
        });
    }
};

module.exports = {
    getCustomizeShop,
    createCustomize,
    addImageCustom,
    deleteImageCustom,
    deleteCustomizeShop
}