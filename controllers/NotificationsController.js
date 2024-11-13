const {
    UserOrder,
    UserOrderDetails,
    ProductVarients,
    OrderStatus,
    Product,
    ReturnReason,
    ReturnRequest,
    UserAccount,
    Shop,
    Notifications,
} = require("../models/Assosiations");

const createNotification = async (req, res) => {
    const { user_id, notifications_type, title, thumbnail, content } = req.body;
    if (!user_id || !notifications_type || !title || !content) {
        return res.status(400).json({
            message: "User ID, Notification Type, Title and Content are required", error: true
        });
    }

    try {
        const notify = await Notifications.create({
            user_id: user_id,
            notifications_type: notifications_type,
            title: title,
            thumbnail: thumbnail,
            content: content,
            created_at: new Date(),
            updated_at: new Date()

        });
        return res.status(200).json(notify);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", error: true });
    }
}

module.exports = {
    createNotification
}