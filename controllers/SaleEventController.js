const {
    SaleEvents
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

module.exports = {
    getAllSaleEvents,
    addSaleEvent,
}