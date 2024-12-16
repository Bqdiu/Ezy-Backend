const sequelize = require("../config/database");
const { Op, Sequelize } = require("sequelize");

const {
  UserAccount,
  UserWallet,
  WalletTransaction,
  Notifications,
} = require("../models/Assosiations");
const vnpay = require("../services/vnpayService");
const {
  ProductCode,
  VnpLocale,
  IpnUnknownError,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnSuccess,
} = require("vnpay");
const dateFormat = require("dateformat");
const getWallet = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const wallet = await UserWallet.findOne({
      where: {
        user_id,
      },
      include: [
        {
          model: WalletTransaction,
        },
      ],
    });

    if (!wallet) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy thông tin ví" });
    }

    return res.status(200).json({
      success: false,
      message: "Lấy thông tin ví thành công",
      wallet,
    });
  } catch (error) {
    console.log("Lỗi khi lấy thông tin ví: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const getWalletHistory = async (req, res) => {
  try {
    const {
      user_wallet_id,
      year = 2024,
      page = 1,
      limit = 10,
      transactionId,
      startDateS,
      endDateS,
    } = req.body;
    console.log(req.body);
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear) || parsedYear < 1000 || parsedYear > 9999) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid year provided." });
    }

    const startDate = new Date(parsedYear, 0, 1);
    const endDate = new Date(parsedYear + 1, 0, 1);
    if (startDateS) {
      const startDateFilter = new Date(startDateS);
      if (!isNaN(startDateFilter.getTime())) {
        startDate.setTime(startDateFilter.getTime());
      }
    }

    if (endDateS) {
      const endDateFilter = new Date(endDateS);
      if (!isNaN(endDateFilter.getTime())) {
        endDateFilter.setHours(23, 59, 59, 999);
        endDate.setTime(endDateFilter.getTime());
      }
    }
    const whereConditions = {
      user_wallet_id,
      ...(transactionId && {
        wallet_transaction_id: transactionId,
      }),
    };
    if (startDateS && endDateS) {
      console.log("startDateS: ", startDateS);
      console.log("endDateS: ", endDateS);
      whereConditions.transaction_date = {
        [Op.between]: [startDate, endDate],
      };
      console.log("đây nè3");
    } else if (startDateS) {
      whereConditions.transaction_date = {
        [Op.gte]: startDate,
      };
      console.log("đây nè1");
    } else if (endDateS) {
      whereConditions.transaction_date = {
        [Op.lte]: endDate,
      };
      console.log("đây nè2");
    } else {
      // Nếu cả hai đều null, có thể không cần lọc theo ngày
      whereConditions.transaction_date = {
        [Op.between]: [startDate, endDate],
      };
      console.log("không có điều kiện thời gian nào được thiết lập");
    }
    console.log("whereConditions: ", whereConditions);
    const { count, rows: walletHistory } =
      await WalletTransaction.findAndCountAll({
        where: whereConditions,
        attributes: [
          "wallet_transaction_id",
          "transaction_type",
          "description",
          "amount",
          "transaction_date",
          [
            sequelize.literal(`DATE_FORMAT(transaction_date, '%Y-%m')`),
            "month",
          ],
        ],
        order: [["transaction_date", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

    const totalPages = Math.ceil(count / limit);

    const historyByMonth = walletHistory.reduce((acc, transaction) => {
      const month = transaction.getDataValue("month");
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(transaction);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin ví thành công",
      walletHistory: historyByMonth,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.log("Lỗi khi lấy thông tin ví: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const depositToWallet = async (req, res) => {
  try {
    const { amount, user_wallet_id } = req.body;
    const userWallet = await UserWallet.findOne({
      where: {
        user_wallet_id,
      },
    });
    if (!userWallet) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy thông tin ví" });
    }
    const date = new Date();
    const createdDate = dateFormat(date, "yyyymmddHHMMss");
    const tommorow = new Date(date.setDate(date.getDate() + 1));
    const expiredDate = dateFormat(tommorow, "yyyymmddHHMMss");

    const ref = `EzyEcommerce_${user_wallet_id}_${createdDate}_${expiredDate}`;

    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: req.ip,
      vnp_TxnRef: ref,
      vnp_OrderInfo: "Thanh toán đơn hàng",
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: "http://localhost:3000/ezy-wallet/deposit",
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: createdDate,
      vnp_ExpireDate: expiredDate,
    });
    if (!paymentUrl) {
      return res.status(400).json({
        error: true,
        message: "Không thể tạo URL thanh toán",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Tạo URL thanh toán thành công",
      paymentUrl,
    });
  } catch (error) {
    console.log("Lỗi khi nạp tiền vào ví: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};

const ipnHandler = async (req, res) => {
  try {
    const { user_wallet_id } = req.query;
    const verify = vnpay.verifyIpnCall(req.body);
    if (!verify.isVerified) {
      return res.json({ status: "error", message: "Xác thực thất bại" });
    }
    if (!verify.isSuccess) {
      return res.json({
        status: "error",
        message: "Giao dịch không thành công",
      });
    }
    const wallet = await UserWallet.findOne({
      where: {
        user_wallet_id,
      },
    });
    if (!wallet) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy thông tin ví" });
    }
    const transaction = await WalletTransaction.findOne({
      where: {
        description: {
          [Op.like]: `vnPayCode: ${verify.vnp_TxnRef}`,
        },
      },
    });
    if (transaction) {
      return res.json({
        status: "success",
        message: "Giao dịch đã được xử lý thành công trước đó",
      });
    }
    switch (verify.vnp_ResponseCode) {
      case "00":
        // Giao dịch thành công
        await wallet.increment("balance", { by: verify.vnp_Amount });
        const transaction = await WalletTransaction.create({
          user_wallet_id,
          transaction_type: "Nạp tiền vào ví",
          description: `vnPayCode: ${verify.vnp_TxnRef}`,
          amount: verify.vnp_Amount,
          transaction_date: new Date(),
        });
        await Notifications.create({
          user_id: wallet.user_id,
          notifications_type: "wallet",
          title: "Nạp tiền vào ví thành công",
          content: `Giao dịch ${transaction.wallet_transaction_id} thành công. Số tiền: ${verify.vnp_Amount} VNĐ đã được cộng vào ví của bạn.`,
          created_at: new Date(),
          updated_at: new Date(),
        });
        return res.json({
          status: "success",
          message: "Giao dịch thành công",
        });
      case "07":
        // Giao dịch bị nghi ngờ
        return res.json({
          status: "warning",
          message:
            "Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)",
        });
      case "09":
        return res.json({
          status: "fail",
          message:
            "Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng",
        });
      case "10":
        return res.json({
          status: "fail",
          message:
            "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
        });
      case "11":
        return res.json({
          status: "fail",
          message:
            "Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "12":
        return res.json({
          status: "fail",
          message: "Thẻ/Tài khoản của khách hàng bị khóa",
        });
      case "13":
        return res.json({
          status: "fail",
          message:
            "Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "24":
        return res.json({
          status: "fail",
          message: "Khách hàng hủy giao dịch",
        });
      case "51":
        return res.json({
          status: "fail",
          message:
            "Tài khoản của quý khách không đủ số dư để thực hiện giao dịch",
        });
      case "65":
        return res.json({
          status: "fail",
          message:
            "Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày",
        });
      case "75":
        return res.json({
          status: "fail",
          message: "Ngân hàng thanh toán đang bảo trì",
        });
      case "79":
        return res.json({
          status: "fail",
          message:
            "KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch",
        });
      case "99":
        return res.json({
          status: "fail",
          message:
            "Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)",
        });
      default:
        return res.json({
          status: "fail",
          message: "Mã phản hồi không xác định",
        });
    }
  } catch (error) {
    console.log("Error in vnPayIPN: ", error);
    return res.json(IpnUnknownError);
  }
};

module.exports = {
  getWallet,
  getWalletHistory,
  depositToWallet,
  ipnHandler,
};
