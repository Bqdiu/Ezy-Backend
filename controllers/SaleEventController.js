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

        await SaleEvents.destroy({ where: { sale_events_id: id } });

        res.status(200).json({
            success: true,
            message: 'Xóa sự kiện thành công'
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
    const { id } = req.params; // ID của sự kiện
    const { category_ids } = req.body; // Danh sách ID danh mục

    try {
        const saleEvent = await SaleEvents.findOne({ where: { sale_events_id: id } });

        if (!saleEvent) {
            return res.status(404).json({
                success: false,
                message: 'Sự kiện không tìm thấy'
            });
        }

        if (category_ids && category_ids.length > 0) {
            const categoriesToAdd = category_ids.map(category_id => ({
                sale_events_id: id,
                category_id
            }));
            await SaleEventsOnCategories.bulkCreate(categoriesToAdd);
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
}
module.exports = {
    getAllSaleEvents,
    addSaleEvent,
    deleteSaleEvent,
    addCategoriesToEvent,
}