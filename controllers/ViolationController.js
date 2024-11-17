const sequelize = require("../config/database");
const admin = require("../firebase/firebaseAdmin");
const { Op } = require("sequelize");
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
      attributes: ["user_id", "username", "full_name", "email"],
      include: [
        {
          model: Violations,
          required: true, // Chỉ lấy user có vi phạm
          attributes: ["status"],
        },
      ],
    });

    // Tính toán số lượng vi phạm
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
      };
    });

    // Lọc user có total_violations > 0
    const filteredCustomers = customersData.filter((user) => user.total_violations > 0);

    res.status(200).json({
      success: true,
      data: filteredCustomers,
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
          where: { role_id: 2 },
          attributes: ["user_id", "username", "full_name", "email"],
          include: [
            {
              model: Violations,
              required: true,
              where: { status: "Chưa xử lý" },
              attributes: ["violation_id", "date_reported", "status", "notes", "sender_id"], // Chỉ lấy sender_id
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
      const violation_count = owner.Violations.length;

      const violations = owner.Violations.map((violation) => ({
        violation_id: violation.violation_id,
        sender_id: violation.sender_id, // Chỉ trả về mã người gửi
        violation_type: violation.ViolationType.violation_name,
        priority_level: violation.ViolationType.priority_level,
        date_reported: violation.date_reported,
        status: violation.status,
        notes: violation.notes,
        imgs: violation.ViolationImgs.map((img) => img.img_url),
      }));

      return {
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        owner_id: owner.user_id,
        owner_name: owner.full_name,
        email: owner.email,
        violation_count,
        violations,
      };
    });

    res.status(200).json({
      success: true,
      data: shopData,
    });
  } catch (error) {
    console.error("Error fetching shops with violations:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
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
    const report = await Violations.findOne({ where: { violation_id: reportId } });

    if (!report) {
      return res.status(404).json({ success: false, message: "Báo cáo không tồn tại." });
    }

    report.status = "Đã xử lý";
    report.resolved_date = new Date();
    await report.save();

    const result = await processViolationPolicy(report.user_id, report.violation_type_id, updated_by_id);

    res.status(200).json({
      success: true,
      message: `Báo cáo với ID ${reportId} đã được xử lý.`,
      result,
    });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Đã xảy ra lỗi khi xử lý báo cáo.",
    });
  }
};


const processViolationPolicy = async (userId, violationTypeId, currentAdminId) => {
  try {
    // Đếm số lần vi phạm cùng loại
    const violationCount = await ViolationHistory.count({
      where: { violator_id: userId, action_type: violationTypeId },
    });

    let penalty = "Cảnh báo";
    let banDuration = 0;

    // Áp dụng chính sách
    if (violationCount === 2) {
      penalty = "Khóa tài khoản 3 ngày";
      banDuration = 3;
    } else if (violationCount === 3) {
      penalty = "Khóa tài khoản 7 ngày";
      banDuration = 7;
    } else if (violationCount === 4) {
      penalty = "Khóa tài khoản 30 ngày";
      banDuration = 30;
    } else if (violationCount >= 5) {
      penalty = "Cấm vĩnh viễn";
    }

    // Nếu quyết định là khóa tài khoản hoặc cấm vĩnh viễn
    if (banDuration > 0 || penalty === "Cấm vĩnh viễn") {
      const user = await UserAccount.findOne({ where: { user_id: userId } });
      if (!user) {
        throw new Error("Tài khoản không tồn tại.");
      }

      // Cập nhật trạng thái trong cơ sở dữ liệu
      user.is_banned = true;

      // Nếu không phải cấm vĩnh viễn, đặt ngày hết hạn khóa tài khoản
      if (banDuration > 0) {
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + banDuration);
        user.ban_until = banUntil;
      } else {
        user.ban_until = null; // Cấm vĩnh viễn
      }

      await user.save();

      // Vô hiệu hóa tài khoản trên Firebase
      await admin.auth().updateUser(userId, { disabled: true });
    }

    // Lưu lịch sử xử phạt
    await ViolationHistory.create({
      violator_id: userId,
      action_type: violationTypeId,
      status: "Đã xử lý",
      notes: penalty,
      updated_by_id: currentAdminId,
    });

    return { penalty, banDuration };
  } catch (error) {
    console.error("Error processing violation policy:", error);
    throw error;
  }
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
