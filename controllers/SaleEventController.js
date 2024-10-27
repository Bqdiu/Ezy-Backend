const {
    SaleEvents,
    SaleEventsOnCategories,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const getAllSaleEvents = async (req, res) => {
    try {
        const saleEvents = await SaleEvents.findAll();
        res.status(200).json({
            success: true,
            data: saleEvents
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message || error
        });
    }
}
const addSaleEvent = async (req, res) => {
    const {
        sale_events_name,
        thumbnail,
        started_at,
        ended_at
    } = req.body;

    try {
        const startDate = new Date(started_at);
        const endDate = new Date(ended_at);

        const newSaleEvent = await SaleEvents.create({
            sale_events_name,
            thumbnail: thumbnail || null,
            started_at: startDate,
            ended_at: endDate,
        });

        res.status(201).json({
            success: true,
            data: newSaleEvent,
            message: 'Tạo sự kiện thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo sự kiện',
            error: error.message,
        });
    }
}
const deleteSaleEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy'
            });
        }

        // Xóa tất cả danh mục liên quan đến sự kiện
        await SaleEventsOnCategories.destroy({ where: { sale_events_id: id } });

        // Xóa sự kiện
        await SaleEvents.destroy({ where: { sale_events_id: id } });

        res.status(200).json({
            success: true,
            message: 'Xóa sự kiện thành công và đã xóa tất cả danh mục liên quan'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa sự kiện',
            error: error.message,
        });
    }
}
const addCategoriesToEvent = async (req, res) => {
    const { id } = req.params;
    const { category_ids } = req.body;

    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy'
            });
        }

        // Lấy danh sách danh mục hiện tại của sự kiện
        const existingCategories = await SaleEventsOnCategories.findAll({
            where: { sale_events_id: id },
            attributes: ["category_id"],
        });

        const existingCategoryIds = existingCategories.map(category => category.category_id);

        // Thêm các danh mục mới (nếu chưa tồn tại)
        const categoriesToAdd = category_ids.filter(category_id => !existingCategoryIds.includes(category_id));
        if (categoriesToAdd.length > 0) {
            const categoriesToAddObjects = categoriesToAdd.map(category_id => ({
                sale_events_id: id,
                category_id
            }));
            await SaleEventsOnCategories.bulkCreate(categoriesToAddObjects);
        }

        // Xóa các danh mục không còn được chọn
        const categoriesToRemove = existingCategoryIds.filter(category_id => !category_ids.includes(category_id));
        if (categoriesToRemove.length > 0) {
            await SaleEventsOnCategories.destroy({
                where: {
                    sale_events_id: id,
                    category_id: categoriesToRemove
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cài đặt danh mục cho sự kiện thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cài đặt danh mục cho sự kiện',
            error: error.message,
        });
    }
};

const getAllCategoryIdsForEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy',
            });
        }

        // Lấy danh sách các mã danh mục sản phẩm của sự kiện
        const categories = await SaleEventsOnCategories.findAll({
            where: { sale_events_id: id },
            attributes: ["category_id"],
        });

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không có danh mục nào cho sự kiện này',
            });
        }

        const categoryIds = categories.map(category => category.category_id);

        res.status(200).json({
            success: true,
            data: categoryIds,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh mục cho sự kiện',
            error: error.message,
        });
    }
};
module.exports = {
    getAllSaleEvents,
    addSaleEvent,
    deleteSaleEvent,
    addCategoriesToEvent,
    getAllCategoryIdsForEvent
}