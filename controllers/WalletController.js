const sequelize = require("../config/database");
const { Op, Sequelize } = require("sequelize");

const {
  UserAccount,
  UserWallet,
  WalletTransaction,
} = require("../models/Assosiations");

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
    } = req.query;
    console.log("startDateS: ", startDateS);
    console.log("endDateS: ", endDateS);
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
        endDate.setTime(endDateFilter.getTime());
      }
    }
    const whereConditions = {
      user_wallet_id,
      ...(transactionId && { wallet_transaction_id: transactionId }),
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
      console.log("startDateS: ", startDateS);
      console.log("endDateS: ", endDateS);
      console.log("đây nè1");
    } else if (endDateS) {
      whereConditions.transaction_date = {
        [Op.lte]: endDate,
      };
      console.log("startDateS: ", startDateS);
      console.log("endDateS: ", endDateS);
      console.log("đây nè2");
    } else {
      // Nếu cả hai đều null, có thể không cần lọc theo ngày
      console.log("startDateS: ", startDateS);
      console.log("endDateS: ", endDateS);
      console.log("không có điều kiện thời gian nào được thiết lập");
    }
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

module.exports = {
  getWallet,
  getWalletHistory,
};
