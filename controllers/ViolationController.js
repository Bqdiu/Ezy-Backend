const sequelize = require("../config/database");
const admin = require("../firebase/firebaseAdmin");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const {
  Violations,
  ViolationTypes,
  ViolationImgs,
  ViolationHistory,
  UserAccount,
  Shop,
} = require("../models/Assosiations");
const Sequelize = require("sequelize");
const { ca } = require("translate-google/languages");

const getReportedCustomers = async (req, res) => {
  try {
    const reportedCustomers = await UserAccount.findAll({
      where: { role_id: 1 }, // Chỉ lấy khách hàng
      attributes: ["user_id", "username", "full_name", "email", "is_banned"],
      include: [
        {
          model: Violations,
          attributes: ["status"],
        },
      ],
    });

    // Tính toán số lượng vi phạm và phân loại trạng thái
    const customersData = reportedCustomers.map((user) => {
      const pendingCount = user.Violations.filter((v) => v.status === "Chưa xử lý").length;
      const resolvedCount = user.Violations.filter((v) => v.status === "Đã xử lý").length;

      return {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        pending_count: pendingCount,
        resolved_count: resolvedCount,
        total_violations: pendingCount + resolvedCount,
        role_id: user.role_id,
        is_banned: user.is_banned, // Thêm trạng thái khóa
      };
    });

    res.status(200).json({
      success: true,
      data: customersData,
    });
  } catch (error) {
    console.error("Error fetching reported customers:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
    });
  }
};

const getShopsWithViolations = async (req, res) => {
  try {
    const shopsWithViolations = await Shop.findAll({
      include: [
        {
          model: UserAccount,
          where: { role_id: 2 }, // Chủ shop
          attributes: ["user_id", "username", "full_name", "email", "is_banned"],
          include: [
            {
              model: Violations,
              attributes: ["violation_id", "status", "date_reported", "notes", "sender_id"],
              include: [
                {
                  model: ViolationTypes,
                  attributes: ["violation_name", "priority_level"],
                },
                {
                  model: ViolationImgs,
                  attributes: ["img_url"],
                },
              ],
            },
          ],
        },
      ],
    });

    const shopData = shopsWithViolations.map((shop) => {
      const owner = shop.UserAccount;
      const violations = owner.Violations;

      const pendingCount = violations.filter((v) => v.status === "Chưa xử lý").length;
      const resolvedCount = violations.filter((v) => v.status === "Đã xử lý").length;

      return {
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        owner_id: owner.user_id,
        owner_name: owner.full_name,
        email: owner.email,
        is_banned: owner.is_banned,
        pending_count: pendingCount,
        resolved_count: resolvedCount,
        violations: violations.map((v) => ({
          violation_id: v.violation_id,
          violation_type: v.ViolationType.violation_name,
          priority_level: v.ViolationType.priority_level,
          date_reported: v.date_reported,
          status: v.status,
          notes: v.notes,
          imgs: v.ViolationImgs.map((img) => img.img_url),
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: shopData,
    });
  } catch (error) {
    console.error("Error fetching shop violations:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
    });
  }
};

const getViolationHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const violationHistory = await ViolationHistory.findAll({
      where: { violator_id: userId },
      attributes: [
        "violation_history_id",
        "action_type",
        "status",
        "notes",
        "updated_by_id",
        "updatedAt",
      ],
      order: [["updatedAt", "DESC"]],
    });

    const historyWithUsernames = await Promise.all(
      violationHistory.map(async (history) => {
        const user = await UserAccount.findOne({
          where: { user_id: history.updated_by_id },
          attributes: ["username"],
        });

        return {
          ...history.toJSON(),
          updated_by_username: user ? user.username : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: historyWithUsernames,
    });
  } catch (error) {
    console.error("Error fetching violation history:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
    });
  }
};

const getViolationType = async (req, res) => {
  try {
    const { type } = req.query;
    const whereArrays = {
      shop: [1, 2, 3, 4, 5, 6, 7, 8],
      user: [9, 10, 11, 12, 13, 14, 15, 16, 8],
    };
    const violationType = await ViolationTypes.findAll({
      where: {
        violation_type_id: {
          [Op.in]: whereArrays[type],
        },
      },
    });
    return res.status(200).json({
      success: true,
      data: violationType,
    });
  } catch (error) {
    console.error("Error fetching violation type:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
    });
  }
};

const sendViolation = async (req, res) => {
  try {
    const { user_id, sender_id, violation_type_id, notes, imgs } = req.body;

    const violation = await Violations.create({
      user_id,
      sender_id,
      violation_type_id,
      date_reported: new Date(),
      status: "Chưa xử lý",
      notes,
    });

    const violationImgs = imgs.map((img) => ({
      violation_id: violation.violation_id,
      img_url: img,
    }));

    await ViolationImgs.bulkCreate(violationImgs);

    return res.status(200).json({
      success: true,
      message: "Tố cáo thành công",
    });
  } catch (error) {
    console.error("Error sending violation:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
    });
  }
};
const getReportedShops = async (req, res) => {
  try {
    const reportedShops = await UserAccount.findAll({
      where: { role_id: 2 },
      include: [
        {
          model: Violations,
          attributes: ["status", "violation_type", "notes", "resolved_date"],
        },
      ],
    });

    const formattedData = reportedShops.map((shop) => ({
      user_id: shop.user_id,
      full_name: shop.full_name,
      email: shop.email,
      pending_count: shop.Violations.filter((v) => v.status === "Chưa xử lý").length,
      resolved_count: shop.Violations.filter((v) => v.status === "Đã xử lý").length,
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching shop violations" });
  }
};

const getUserViolations = async (req, res) => {
  const { userId } = req.params;

  try {
    const violations = await Violations.findAll({
      where: { user_id: userId },
      attributes: [
        "violation_id",
        "violation_type_id",
        "sender_id", // Chỉ lấy mã người gửi
        "date_reported",
        "status",
        "notes",
      ],
      include: [
        {
          model: ViolationTypes,
          attributes: ["violation_name", "priority_level"],
        },
        {
          model: ViolationImgs,
          attributes: ["img_url"],
        },
      ],
      order: [["date_reported", "DESC"]],
    });

    const formattedViolations = violations.map((violation) => ({
      violation_id: violation.violation_id,
      sender_id: violation.sender_id, // Chỉ trả về mã người gửi
      violation_type: violation.ViolationType?.violation_name || "Không xác định",
      priority_level: violation.ViolationType?.priority_level || "Không xác định",
      date_reported: violation.date_reported,
      status: violation.status,
      notes: violation.notes,
      imgs: violation.ViolationImgs.map((img) => img.img_url),
    }));

    res.status(200).json({
      success: true,
      data: formattedViolations,
    });
  } catch (error) {
    console.error("Error fetching user violations:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
    });
  }
};



const updateStatusViolation = async (req, res) => {
  const { reportId, updated_by_id } = req.body;

  try {
    // Tìm báo cáo theo ID
    const report = await Violations.findOne({ where: { violation_id: reportId } });

    if (!report) {
      return res.status(404).json({ success: false, message: "Báo cáo không tồn tại." });
    }

    report.status = "Đã xử lý";
    report.resolved_date = new Date();
    await report.save();

    // Tìm thông tin người vi phạm
    const violator = await UserAccount.findOne({ where: { user_id: report.user_id } });
    if (!violator) {
      return res.status(404).json({ success: false, message: "Người vi phạm không tồn tại." });
    }

    // Gọi logic xử lý vi phạm
    const result = await processViolationPolicy(report.user_id, report.violation_type_id, updated_by_id);

    // Gửi email thông báo
    const subject = "Thông báo xử lý vi phạm";
    const text = `Kính gửi ${violator.full_name},\n\nBáo cáo vi phạm của bạn đã được xử lý. Quyết định: ${result.penalty}.\nNếu bạn có thắc mắc, vui lòng liên hệ với bộ phận hỗ trợ.\n\nTrân trọng,\nHệ thống quản lý.`; 

    await sendEmail(violator.email, subject, text);

    res.status(200).json({
      success: true,
      message: `Báo cáo với ID ${reportId} đã được xử lý và email đã được gửi.`,
      result,
    });
  } catch (error) {
    console.error("Error resolving report or sending email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Đã xảy ra lỗi khi xử lý báo cáo.",
    });
  }
};


const processViolationPolicy = async (userId, violationTypeId, currentAdminId) => {
  try {
    const violationCount = await ViolationHistory.count({
      where: { violator_id: userId, action_type: violationTypeId },
    });

    let penalty = "Cảnh báo";
    let banUntil = null; // Không khóa

    // Áp dụng chính sách vi phạm
    if (violationCount === 2) {
      penalty = "Khóa tài khoản 3 ngày";
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + 3); // Khóa 3 ngày
    } else if (violationCount === 3) {
      penalty = "Khóa tài khoản 7 ngày";
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + 7); // Khóa 7 ngày
    } else if (violationCount === 4) {
      penalty = "Khóa tài khoản 30 ngày";
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + 30); // Khóa 30 ngày
    } else if (violationCount >= 5) {
      penalty = "Cấm vĩnh viễn";
      banUntil = null; // Đặt là null để biểu thị cấm vĩnh viễn
    }

    // Cập nhật trạng thái tài khoản nếu cần
    if (banUntil !== null || penalty === "Cấm vĩnh viễn") {
      await lockAccount(userId, banUntil);
    }

    // Lưu lịch sử xử phạt
    await ViolationHistory.create({
      violator_id: userId,
      action_type: violationTypeId,
      status: "Đã xử lý",
      notes: penalty,
      updated_by_id: currentAdminId,
    });

    return { penalty, banUntil };
  } catch (error) {
    console.error("Lỗi xử lý chính sách vi phạm:", error.message);
    throw error;
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.google_email,
    pass: process.env.google_app_password,
  },
});
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: "your-email@gmail.com", // Email gửi
    to,                          // Email người nhận
    subject,                     // Tiêu đề
    text,                        // Nội dung
  };

  await transporter.sendMail(mailOptions);
};


module.exports = {
  getReportedCustomers,
  getShopsWithViolations,
  getViolationHistory,
  getViolationType,
  sendViolation,
  getUserViolations,
  updateStatusViolation,
  processViolationPolicy,
};
