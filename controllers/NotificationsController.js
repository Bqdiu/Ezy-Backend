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
      message: "User ID, Notification Type, Title and Content are required",
      error: true,
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
      updated_at: new Date(),
    });
    return res.status(200).json(notify);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error", error: true });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { user_id, page = 1, limit = 6, type = "" } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let whereConditions = { user_id: user_id };
    if (type !== "") {
      whereConditions.notifications_type = type;
    }
    const { count, rows: notifications } = await Notifications.findAndCountAll({
      where: whereConditions,
      order: [["created_at", "DESC"]],
      offset,
      limit: parseInt(limit, 10),
    });

    const unReadCount = await Notifications.count({
      where: { user_id: user_id, is_read: 0 },
    });
    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: notifications,
      totalPages: totalPages,
      unReadCount,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: error.message || error, error: true });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { user_id, type = "" } = req.query;
    let whereConditions = { user_id: user_id };
    if (type !== "") {
      whereConditions.notifications_type = type;
    }
    await Notifications.update(
      { is_read: 1 },
      {
        where: whereConditions,
      }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: error.message || error, error: true });
  }
};
const markNotificationAsRead = async (req, res) => {
  try {
    const { notification_id } = req.query;
    await Notifications.update(
      { is_read: 1 },
      {
        where: { notification_id: notification_id },
      }
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: error.message || error, error: true });
  }
};
module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markNotificationAsRead,
};
