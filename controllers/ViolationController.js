const sequelize = require("../config/database");
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
      where: { role_id: 1 },
      attributes: ["user_id", "username", "full_name", "email"],
      include: [
        {
          model: Violations,
          required: true,
          where: { status: "Chưa xử lý" },
          attributes: ["violation_id", "date_reported", "status", "notes"],
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
    });

    const customersData = reportedCustomers.map((user) => {
      const violation_count = user.Violations.length;
      let warning_level = "Thấp";

      if (violation_count > 5 && violation_count < 10) {
        warning_level = "Trung bình";
      } else if (violation_count >= 10) {
        warning_level = "Cao";
      }

      const violations = user.Violations.map((violation) => ({
        violation_id: violation.violation_id,
        violation_type: violation.ViolationType.violation_name,
        priority_level: violation.ViolationType.priority_level,
        date_reported: violation.date_reported,
        status: violation.status,
        notes: violation.notes,
        imgs: violation.ViolationImgs.map((img) => img.img_url),
      }));

      return {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        violation_count,
        warning_level,
        violations,
      };
    });

    res.status(200).json({
      success: true,
      data: customersData,
    });
  } catch (error) {
    console.error("Error fetching reported customers:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
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
              attributes: ["violation_id", "date_reported", "status", "notes"],
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
      let warning_level = "Thấp";

      if (violation_count > 5 && violation_count < 10) {
        warning_level = "Trung bình";
      } else if (violation_count >= 10) {
        warning_level = "Cao";
      }

      const violations = owner.Violations.map((violation) => ({
        violation_id: violation.violation_id,
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
        warning_level,
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

const handleViolationResolution = async (req, res) => {
  const { userId, action_type, notes, updated_by_id } = req.body;

  try {
    // Bước 1: Thêm bản ghi vào bảng ViolationHistory
    await ViolationHistory.create({
      violator_id: userId,
      action_type,
      status: "Đã xử lý",
      notes,
      updated_by_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Bước 2: Cập nhật trạng thái tất cả các vi phạm của user thành "Đã xử lý"
    await Violations.update(
      { status: "Đã xử lý", resolved_date: new Date() },
      {
        where: {
          user_id: userId,
          status: "Chưa xử lý",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Vi phạm của người dùng ID ${userId} đã được xử lý thành công.`,
    });
  } catch (error) {
    console.error("Error handling violation resolution:", error);
    res.status(500).json({
      error: true,
      message:
        error.message || "An error occurred during violation resolution.",
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
  } catch (error) {
    console.error("Error sending violation:", error);
    res.status(500).json({
      error: true,
      message: error.message || "An error occurred",
    });
  }
};

module.exports = {
  getReportedCustomers,
  getShopsWithViolations,
  getViolationHistory,
  handleViolationResolution,
  getViolationType,
};
