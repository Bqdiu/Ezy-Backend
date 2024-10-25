const sequelize = require("../config/database");
const { Op } = require("sequelize");

const { UserAccount, UserWallet } = require("../models/Assosiations");

const getWallet = async (req, res) => {
  try {
    const { user_id } = req.query;
    const wallet = await UserWallet.findOne({
      where: {
        user_id,
      },
    });

    if (!wallet) {
      return res
        .status(404)
        .json({ error: true, message: "Không tìm thấy thông tin ví" });
    }

    return res.status(200).json({
      error: false,
      message: "Lấy thông tin ví thành công",
      data: wallet,
    });
  } catch (error) {
    console.log("Lỗi khi lấy thông tin ví: ", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || error });
  }
};
