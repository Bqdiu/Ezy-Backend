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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day

    const reportedCustomers = await UserAccount.findAll({
      where: {
        role_id: 1, // Fetch only customers
      },
      attributes: ["user_id", "username", "full_name", "phone_number", "email", "is_banned"],
      include: [
        {
          model: Violations,
          attributes: ["status", "date_reported"],
          required: true,
        },
      ],
    });

    const customersData = reportedCustomers.map((user) => {
      const todayReports = user.Violations
        ? user.Violations.filter((v) => v.date_reported && new Date(v.date_reported) >= today).length
        : 0;

      const pendingCount = user.Violations
        ? user.Violations.filter((v) => v.status === "Chưa xử lý").length
        : 0;

      return {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        pending_count: pendingCount,
        today_reports: todayReports,
        total_violations: user.Violations ? user.Violations.length : 0,
        is_banned: user.is_banned,
      };
    });

    // Sort customers by:
    // 1. Today's reports (descending)
    // 2. Pending reports (descending)
    const sortedCustomers = customersData.sort((a, b) => {
      if (b.today_reports !== a.today_reports) {
        return b.today_reports - a.today_reports;
      }
      return b.pending_count - a.pending_count;
    });

    res.status(200).json({
      success: true,
      data: sortedCustomers,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch users with violations who are shop owners
    const usersWithViolations = await UserAccount.findAll({
      where: {
        role_id: 2, // Role for shop owners
      },
      include: [
        {
          model: Violations,
          as: "Violations",
          attributes: ["violation_id", "status", "date_reported", "notes"],
          required: true, // Only include users with violations
        },
        {
          model: Shop,
          as: "Shop",
          attributes: ["shop_id", "shop_name", "business_email", "shop_address"],
          required: true, // Ensure they are associated with a shop
        },
      ],
    });

    // Map results to the desired format
    const shopData = usersWithViolations.map((user) => {
      const violations = user.Violations || [];
      const pendingCount = violations.filter((v) => v.status === "Chưa xử lý").length;
      const todayReports = violations.filter((v) => new Date(v.date_reported) >= today).length;

      return {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        is_banned: user.is_banned,
        shop_id: user.Shop?.shop_id,
        shop_name: user.Shop?.shop_name,
        shop_address: user.Shop?.shop_address,
        business_email: user.Shop?.business_email,
        pending_count: pendingCount,
        today_reports: todayReports,
        total_violations: violations.length,
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
      message: "An error occurred while fetching shop violations.",
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.google_email,
    pass: process.env.google_app_password,
  },
});

const sendEmail = async (to, subject, notes, action_type, full_name, banUntil = null, violationHistoryId) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
      <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <img src="cid:logo" alt="Company Logo" style="max-width: 150px; margin-bottom: 10px;" />
        <h1 style="margin: 0;">Tài khoản đã bị xử lý</h1>
      </div>
      <div style="padding: 20px;">
        <p>Xin chào <strong>${full_name}</strong>,</p>
        <p>
          ${action_type === "Cảnh cáo"
      ? `Chúng tôi đã nhận được các báo cáo về hành vi của bạn. Dưới đây là các nội dung báo cáo chúng tôi nhận được:`
      : `Tài khoản của bạn đã bị xử lý vì vi phạm nội quy của hệ thống. Dưới đây là các nội dung vi phạm:`
    }
        </p>
        <ul style="list-style-type: none; padding: 0;">
        <li><strong>Mã xử lý:</strong> ${violationHistoryId}</li>
          <li><strong>Nội dung vi phạm:<br /></strong> ${notes}</li>
          <li><strong>Quyết định xử lý:</strong> ${action_type}</li>
          ${banUntil
      ? `<li><strong>Thời gian khóa tài khoản:</strong> Đến ${banUntil.toLocaleString()}</li>`
      : ""
    }
          
        </ul>
        ${action_type === "Cảnh cáo"
      ? `<p style="margin-top: 20px; color: #f44336;">
                Đây là cảnh cáo chính thức. Nếu bạn tiếp tục vi phạm, chúng tôi sẽ áp dụng các hình thức xử lý nghiêm khắc hơn.
              </p>`
      : ""
    }
        <p style="margin-top: 20px;">
          Nếu bạn cho rằng đây là một nhầm lẫn, vui lòng liên hệ với bộ phận hỗ trợ qua email
          <a href="mailto:support@example.com" style="color: #f44336; text-decoration: none;">support@example.com</a>
          để được hỗ trợ kịp thời.
        </p>
        <p>
          Trân trọng,<br />
          <strong>Nhóm Quản lý Tài khoản Ezy</strong>
        </p>
      </div>
      <div style="background-color: #f9f9f9; padding: 10px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
        Email này được gửi tự động, vui lòng không trả lời trực tiếp. <br />
        Để biết thêm thông tin, hãy truy cập <a href="https://example.com/support" style="color: #f44336; text-decoration: none;">Trung tâm hỗ trợ</a>.
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.google_email,
    to,
    subject: `Mã xử lý: ${violationHistoryId} - ${subject}`,
    html: emailHtml,
    attachments: [
      {
        filename: "logo.png",
        path: "https://res.cloudinary.com/dhzjvbdnu/image/upload/v1732433034/jnaxjxdcdyu2y1efkw6u.png", // Replace with your logo's URL or absolute path
        cid: "logo",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};




const markReportAsViewed = async (req, res) => {
  const { reportId } = req.body;

  try {
    const report = await Violations.findOne({ where: { violation_id: reportId } });

    if (!report) {
      return res.status(404).json({ success: false, message: "Báo cáo không tồn tại." });
    }

    if (report.status === "Chưa xử lý") {
      report.status = "Đã xem";
      await report.save();
    }

    res.status(200).json({ success: true, message: "Báo cáo đã được đánh dấu là đã xem." });
  } catch (error) {
    console.error("Error marking report as viewed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Đã xảy ra lỗi khi cập nhật trạng thái báo cáo.",
    });
  }
};

const revokeAccountViolationHandling = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the violation history
    const history = await ViolationHistory.findOne({ where: { violation_history_id: id } });

    if (!history) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch sử vi phạm.' });
    }

    // Get the user's account status from your database
    const user = await UserAccount.findOne({ where: { user_id: history.violator_id } });

    // Delete the violation history
    await history.destroy();

    // Unlock the account if it is locked
    if (user.is_banned) {
      user.is_banned = false;
      user.ban_until = null;
      await user.save();

      try {
        // Unlock the user on Firebase
        await admin.auth().updateUser(user.user_id, { disabled: false });
        return res.status(200).json({
          success: true,
          message: 'Đã thu hồi lịch sử xử lý và mở khóa tài khoản trên Firebase.',
          user_status: 'unlocked',
        });
      } catch (firebaseError) {
        console.error('Error unlocking Firebase user:', firebaseError);
        return res.status(500).json({
          success: false,
          message: 'Mở khóa tài khoản trên Firebase thất bại.',
        });
      }
    }

    res.status(200).json({ success: true, message: 'Đã thu hồi lịch sử xử lý.', user_status: 'active' });
  } catch (error) {
    console.error('Error revoking violation history:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi thu hồi lịch sử xử lý.' });
  }
};

const addViolationHistory = async (req, res) => {
  const { violator_id, action_type, notes, currentAdminId } = req.body;

  if (!violator_id || !action_type || !notes) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    const user = await UserAccount.findOne({ where: { user_id: violator_id } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    let banUntil = null;

    // Handle account locking based on action type
    if (action_type.includes("Khóa")) {
      const daysToBan = parseInt(action_type.match(/\d+/)?.[0], 10) || 0;
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + daysToBan);

      user.is_banned = 1;
      user.ban_until = banUntil;
      await user.save();

      console.log("User banned until:", banUntil);

      // Disable the user in Firebase
      try {
        await admin.auth().updateUser(user.user_id, { disabled: true });
        console.log("Firebase user disabled:", user.user_id);
      } catch (firebaseError) {
        console.error("Error disabling Firebase user:", firebaseError.message);
      }
    }

    // Create violation history record and capture the ID
    const violationHistory = await ViolationHistory.create({
      violator_id,
      action_type,
      status: 'Đã xử lý',
      notes,
      updated_by_id: currentAdminId,
    });

    const violationHistoryId = violationHistory.violation_history_id;

    const subject = `Thông báo xử lý vi phạm`;

    console.log("Sending email to:", user.email);
    await sendEmail(user.email, subject, notes, action_type, user.full_name, banUntil, violationHistoryId);

    res.status(200).json({
      success: true,
      message: `Xử lý vi phạm thành công. Mã xử lý: ${violationHistoryId}`,
    });
  } catch (error) {
    console.error("Error handling violation:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi xử lý vi phạm." });
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
  markReportAsViewed,
  revokeAccountViolationHandling,
  addViolationHistory,
};
