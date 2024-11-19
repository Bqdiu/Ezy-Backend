const {
  RequestSupports,
  UserAccount,
  Shop,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const { io, userSocketMap } = require("../socket");
const { su } = require("translate-google/languages");
const getSupportRequest = async (req, res) => {
  try {
    const supportRequests = await RequestSupports.findAll({
      include: [
        {
          model: UserAccount,
          attributes: ["full_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: supportRequests,
    });
  } catch (error) {
    console.error("Error fetching support requests:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support requests",
    });
  }
};

const sendRequestSupport = async (req, res) => {
  try {
    const { user_id } = req.query;
    const requestSupport = await RequestSupports.create({
      requestor_id: user_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (io) {
      io.emit("newSupportRequest", {
        message: "Có yêu cầu hỗ trợ mới",
        request_support_id: requestSupport.request_support_id,
        requestor_id: user_id,
        status: "waiting",
      });
    }

    res.status(200).json({
      success: true,
      data: requestSupport,
    });
  } catch (error) {
    console.error("Error sending support request:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send support request",
    });
  }
};

const acceptRequestSupport = async (req, res) => {
  try {
    const { request_support_id, user_id } = req.query;
    const requestSupport = await RequestSupports.findByPk(request_support_id);
    await requestSupport.update({
      resolver_id: user_id,
      status: "processing",
    });
    const supporter = await UserAccount.findByPk(requestSupport.resolver_id);
    const sender = await UserAccount.findOne({
      where: { user_id: requestSupport.requestor_id },
      include: [
        {
          model: Shop,
        },
      ],
    });
    if (io) {
      const socketId = userSocketMap.get(requestSupport.requestor_id);
      if (socketId) {
        console.log("Emitting supportRequestAccepted to", socketId);
        io.to(socketId).emit("supportRequestAccepted", {
          message: "Yêu cầu của bạn đã được chấp nhận",
          requestSupport: requestSupport,
          supporter: supporter,
          status: "processing",
        });
      }
    }
    res.status(200).json({
      success: true,
      data: requestSupport,
      sender: sender,
      supporter: supporter,
    });
  } catch (error) {
    console.error("Error accepting support request:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to accept support request",
    });
  }
};

const closeRequestSupport = async (req, res) => {
  try {
    const { request_support_id } = req.query;
    const requestSupport = await RequestSupports.findByPk(request_support_id);
    await requestSupport.update({
      resolved_at: new Date(),
      status: "done",
    });
    if (io) {
      const socketSenderId = userSocketMap.get(requestSupport.requestor_id);
      const socketSupporterId = userSocketMap.get(requestSupport.resolver_id);
      if (socketSenderId && socketSupporterId) {
        console.log("Emitting supportRequestClosed to", socketSenderId);
        io.to(socketSenderId).emit("supportRequestClosed", {
          message: "Yêu cầu đã được đóng",
        });
        io.to(socketSupporterId).emit("supportRequestClosed", {
          message: "Yêu cầu đã được đóng",
        });
      }
    }
    return res.status(200).json({
      success: true,
      message: "Kết Thúc Yêu Cầu Hỗ Trợ Thành Công",
    });
  } catch (error) {
    console.error("Error closing support request:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to close support request",
    });
  }
};

const getRequestById = async (req, res) => {
  try {
    const { request_support_id } = req.query;
    const requestSupport = await RequestSupports.findOne({
      where: { request_support_id: request_support_id },
    });

    const supporter = await UserAccount.findByPk(requestSupport.resolver_id);
    const sender = await UserAccount.findOne({
      where: { user_id: requestSupport.requestor_id },
      include: [
        {
          model: Shop,
        },
      ],
    });
    res.status(200).json({
      success: true,
      data: requestSupport,
      supporter: supporter,
      sender: sender,
    });
  } catch (error) {
    console.error("Error fetching support request:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support request",
    });
  }
};

module.exports = {
  getSupportRequest,
  sendRequestSupport,
  acceptRequestSupport,
  getRequestById,
  closeRequestSupport,
};
