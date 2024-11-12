const { Op } = require("sequelize");
const {
  FlashSales,
  ShopRegisterFlashSales,
  Product,
} = require("../models/Assosiations");
const FlashSaleTimerFrame = require("../models/FlashSaleTimeFrame");
const moment = require("moment-timezone");
const timeInVietnam = moment.tz("Asia/Ho_Chi_Minh");

const getAllFlashSales = async (req, res) => {
  try {
    const flashSales = await FlashSales.findAll();
    return res.status(200).json({ success: true, data: flashSales });
  } catch (error) {
    console.log("Lỗi khi getAllFlashSales", error);
    return res
      .status(500)
      .json({ error: true, message: "Lỗi khi getAllFlashSales" });
  }
};
const addFlashSale = async (req, res) => {
  const { flash_sales_name, description, started_at, ended_at, status } =
    req.body;

  if (
    !flash_sales_name ||
    !description ||
    !started_at ||
    !ended_at ||
    !status
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  try {
    const newFlashSale = await FlashSales.create({
      flash_sales_name,
      description,
      started_at,
      ended_at,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Flash Sale được thêm thành công.",
      data: newFlashSale,
    });
  } catch (error) {
    console.error("Lỗi khi thêm Flash Sale:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi thêm Flash Sale.",
    });
  }
};

const updateFlashSale = async (req, res) => {
  const { id } = req.params;
  const { flash_sales_name, description, started_at, ended_at, status } =
    req.body;

  try {
    // Tìm Flash Sale theo ID
    const flashSale = await FlashSales.findByPk(id);
    if (!flashSale) {
      return res
        .status(404)
        .json({ success: false, message: "Flash Sale không tồn tại" });
    }

    // Cập nhật thông tin
    flashSale.flash_sales_name = flash_sales_name;
    flashSale.description = description;
    flashSale.started_at = started_at;
    flashSale.ended_at = ended_at;
    flashSale.status = status;
    flashSale.updatedAt = new Date();

    // Lưu lại thay đổi
    await flashSale.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật Flash Sale thành công",
      data: flashSale,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật Flash Sale:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật Flash Sale",
    });
  }
};

const deleteFlashSale = async (req, res) => {
  const { id } = req.params;

  try {
    const flashSale = await FlashSales.findByPk(id);
    if (!flashSale) {
      return res
        .status(404)
        .json({ success: false, message: "Flash Sale không tồn tại" });
    }

    const now = new Date();
    const startedAt = new Date(flashSale.started_at);

    // So sánh thời gian
    if (startedAt <= now) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa Flash Sale đã bắt đầu",
      });
    }

    await flashSale.destroy(); // Xóa Flash Sale
    res
      .status(200)
      .json({ success: true, message: "Xóa Flash Sale thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa Flash Sale:", error);
    res
      .status(500)
      .json({ success: false, message: "Đã xảy ra lỗi khi xóa Flash Sale" });
  }
};

const getActiveFlashSalesClient = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const offset = (page - 1) * limit;

    const flashSales = await FlashSales.findOne({
      where: {
        status: "active",
        started_at: {
          [Op.lte]: timeInVietnam,
        },
        ended_at: {
          [Op.gt]: timeInVietnam,
        },
      },
    });

    const { count, rows: FlashSaleTimeFrame } =
      await FlashSaleTimerFrame.findAndCountAll({
        where: {
          flash_sales_id: flashSales.flash_sales_id,
          status: "active",
          started_at: {
            [Op.lte]: timeInVietnam, // started_at <= thời gian hiện tại
          },
          ended_at: {
            [Op.gt]: timeInVietnam, // ended_at > thời gian hiện tại
          },
        },
        include: [
          {
            model: ShopRegisterFlashSales,
            include: [
              {
                model: Product,
              },
            ],
          },
        ],
        offset,
        limit,
      });

    const totalPages = Math.ceil(count / limit);

    return res
      .status(200)
      .json({ success: true, data: FlashSaleTimeFrame, totalPages });
  } catch (error) {
    console.error("Lỗi khi lấy Flash Sale:", error);
    res
      .status(500)
      .json({ error: true, message: "Đã xảy ra lỗi khi lấy Flash Sale" });
  }
};

const getFlashSaleTimeFrames = async (req, res) => {
  const { id } = req.params; // Retrieve 'id' from the request parameters

  try {
    const timeFrames = await FlashSaleTimerFrame.findAll({
      where: { flash_sales_id: id },
      order: [['started_at', 'ASC']],
    });

    if (!timeFrames || timeFrames.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có khung giờ nào cho Flash Sale này",
      });
    }

    return res.status(200).json({
      success: true,
      data: timeFrames,
    });
  } catch (error) {
    console.error("Lỗi khi lấy khung giờ:", error.message);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy khung giờ",
    });
  }
};


const addTimeFrame = async (req, res) => {
  const { flash_sales_id, started_at, ended_at, status } = req.body;
  try {
    const flashSale = await FlashSales.findByPk(flash_sales_id);
    if (!flashSale) {
      return res.status(404).json({ success: false, message: "Flash Sale không tồn tại" });
    }

    if (new Date(started_at) < new Date(flashSale.started_at) || new Date(ended_at) > new Date(flashSale.ended_at)) {
      return res.status(400).json({ success: false, message: "Khung giờ phải nằm trong thời gian của Flash Sale" });
    }

    const newTimeFrame = await FlashSaleTimerFrame.create({ flash_sales_id, started_at, ended_at, status });
    res.status(201).json({ success: true, message: "Thêm khung giờ thành công", data: newTimeFrame });
  } catch (error) {
    console.error("Lỗi khi thêm khung giờ:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi thêm khung giờ" });
  }
};

const updateTimeFrame = async (req, res) => {
  const { id } = req.params;
  const { started_at, ended_at, status } = req.body;
  try {
    const timeFrame = await FlashSaleTimerFrame.findByPk(id);
    if (!timeFrame) {
      return res.status(404).json({ success: false, message: "Khung giờ không tồn tại" });
    }

    const flashSale = await FlashSales.findByPk(timeFrame.flash_sales_id);

    if (new Date(started_at) < new Date(flashSale.started_at) || new Date(ended_at) > new Date(flashSale.ended_at)) {
      return res.status(400).json({ success: false, message: "Khung giờ phải nằm trong thời gian của Flash Sale" });
    }

    timeFrame.started_at = started_at;
    timeFrame.ended_at = ended_at;
    timeFrame.status = status;
    await timeFrame.save();

    res.status(200).json({ success: true, message: "Cập nhật khung giờ thành công", data: timeFrame });
  } catch (error) {
    console.error("Lỗi khi cập nhật khung giờ:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi cập nhật khung giờ" });
  }
};

const deleteTimeFrame = async (req, res) => {
  const { id } = req.params;
  try {
    const timeFrame = await FlashSaleTimerFrame.findByPk(id);
    if (!timeFrame) {
      return res.status(404).json({ success: false, message: "Khung giờ không tồn tại" });
    }

    await timeFrame.destroy();
    res.status(200).json({ success: true, message: "Xóa khung giờ thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa khung giờ:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi xóa khung giờ" });
  }
};


module.exports = {
  getAllFlashSales,
  addFlashSale,
  updateFlashSale,
  deleteFlashSale,
  getActiveFlashSalesClient,
  getFlashSaleTimeFrames,
  addTimeFrame,
  updateTimeFrame,
  deleteTimeFrame,
};
