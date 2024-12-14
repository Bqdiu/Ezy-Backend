const { Op } = require("sequelize");
const {
  FlashSales,
  ShopRegisterFlashSales,
  Product,
  Shop,
} = require("../models/Assosiations");
const FlashSaleTimerFrame = require("../models/FlashSaleTimeFrame");
const moment = require("moment-timezone");
const { Sequelize } = require("sequelize");
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
  const {
    flash_sales_name,
    description,
    started_at,
    ended_at,
    status,
    thumbnail,
  } = req.body;

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

  if (!thumbnail) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng cung cấp thumbnail hợp lệ." });
  }

  try {
    const newFlashSale = await FlashSales.create({
      flash_sales_name,
      thumbnail,
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
  const {
    flash_sales_name,
    description,
    started_at,
    ended_at,
    status,
    thumbnail,
  } = req.body;

  try {
    // Tìm Flash Sale theo ID
    const flashSale = await FlashSales.findByPk(id);
    if (!flashSale) {
      return res
        .status(404)
        .json({ success: false, message: "Flash Sale không tồn tại" });
    }

    // Cập nhật thông tin
    flashSale.flash_sales_name = flash_sales_name || flashSale.flash_sales_name;
    flashSale.description = description || flashSale.description;
    flashSale.started_at = started_at || flashSale.started_at;
    flashSale.ended_at = ended_at || flashSale.ended_at;
    flashSale.status = status || flashSale.status;
    flashSale.thumbnail = thumbnail || flashSale.thumbnail; // Giữ nguyên nếu không có thumbnail mới
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
    let flashSales = await FlashSales.findOne({
      where: {
        status: "active",
        started_at: {
          [Op.lte]: new Date(), // started_at <= thời gian hiện tại
        },
        ended_at: {
          [Op.gt]: new Date(), // ended_at > thời gian hiện tại
        },
      },
    });
    if (!flashSales) {
      flashSales = await FlashSales.findOne({
        where: {
          status: "waiting",
          started_at: {
            [Op.gt]: new Date(), // started_at > thời gian hiện tại
          },
        },
        order: [["started_at", "ASC"]],
        limit: 1,
      });
    }

    if (!flashSales) {
      flashSales = await FlashSales.findOne({
        where: {
          status: "ended",
        },
        order: [["ended_at", "DESC"]],
        limit: 1,
      });
    }

    let FlashSaleTimeFrame = await FlashSaleTimerFrame.findAll({
      where: {
        flash_sales_id: flashSales?.flash_sales_id,
        status: "active",
        started_at: {
          [Op.lte]: new Date(), // started_at <= thời gian hiện tại
        },
        ended_at: {
          [Op.gt]: new Date(), // ended_at > thời gian hiện tại
        },
      },
      include: [
        {
          model: ShopRegisterFlashSales,
          include: [
            {
              model: Product,
              attributes: [
                "product_id",
                "product_name",
                "thumbnail",
                "sold",
                "avgRating",
              ],
            },
          ],
          order: [["sold", "DESC"]],
          limit: 12,
        },
      ],
    });

    if (FlashSaleTimeFrame.length === 0) {
      FlashSaleTimeFrame = await FlashSaleTimerFrame.findAll({
        where: {
          flash_sales_id: flashSales.flash_sales_id,
          status: "waiting",
        },
        order: [["started_at", "ASC"]],
        include: [
          {
            model: ShopRegisterFlashSales,
            include: [
              {
                model: Product,
                attributes: [
                  "product_id",
                  "product_name",
                  "thumbnail",
                  "sold",
                  "avgRating",
                ],
              },
            ],
            order: [["sold", "DESC"]],
            limit: 12,
          },
        ],

        limit: 1,
      });

      if (FlashSaleTimeFrame.length === 0) {
        FlashSaleTimeFrame = await FlashSaleTimerFrame.findAll({
          where: {
            flash_sales_id: flashSales.flash_sales_id,
            status: "ended",
          },
          order: [["ended_at", "DESC"]],
          include: [
            {
              model: ShopRegisterFlashSales,
              include: [
                {
                  model: Product,
                  attributes: [
                    "product_id",
                    "product_name",
                    "thumbnail",
                    "sold",
                    "avgRating",
                  ],
                },
              ],
              order: [["sold", "DESC"]],
              limit: 12,
            },
          ],
          limit: 1,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: FlashSaleTimeFrame,
      flashSales: flashSales,
    });
  } catch (error) {
    console.error("Lỗi khi lấy Flash Sale:", error);
    res
      .status(500)
      .json({ error: true, message: "Đã xảy ra lỗi khi lấy Flash Sale" });
  }
};

const getAvailableFlashSalesTimeFrames = async (req, res) => {
  try {
    let timeFrames = await FlashSaleTimerFrame.findAll({
      where: {
        [Op.or]: [
          {
            status: "active",
            started_at: { [Op.lte]: new Date() },
            ended_at: { [Op.gt]: new Date() },
          },
          {
            status: "waiting",
            started_at: { [Op.gt]: new Date() },
          },
        ],
      },
      limit: 5,
    });

    if (timeFrames.length === 0) {
      timeFrames = await FlashSaleTimerFrame.findAll({
        where: {
          status: "ended",
        },
        order: [["ended_at", "DESC"]],
        limit: 1,
      });
    }

    return res.status(200).json({ success: true, data: timeFrames });
  } catch (error) {
    console.error("Lỗi khi lấy khung giờ:", error.message);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy khung giờ",
    });
  }
};

const getProductByTimeFrame = async (req, res) => {
  try {
    const { page = 1, limit = 30, flash_sale_time_frame_id } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows: products } =
      await ShopRegisterFlashSales.findAndCountAll(
        {
          where: { flash_sale_time_frame_id },
          include: [
            {
              model: Product,
            },
          ],
          order: [["sold", "DESC"]],
        },
        limit,
        offset
      );

    const totalPages = Math.ceil(count / limit);
    return res.status(200).json({
      success: true,
      data: { products, totalPages, currentPage: page },
    });
  } catch (error) {
    console.log("Lỗi khi lấy sản phẩm theo khung giờ", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lấy sản phẩm theo khung giờ" });
  }
};

const getFlashSaleTimeFrames = async (req, res) => {
  const { id } = req.params; // Retrieve 'id' from the request parameters

  try {
    const timeFrames = await FlashSaleTimerFrame.findAll({
      where: { flash_sales_id: id },
      order: [["started_at", "ASC"]],
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
      return res
        .status(404)
        .json({ success: false, message: "Flash Sale không tồn tại" });
    }

    if (
      new Date(started_at) < new Date(flashSale.started_at) ||
      new Date(ended_at) > new Date(flashSale.ended_at)
    ) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ phải nằm trong thời gian của Flash Sale",
      });
    }

    const newTimeFrame = await FlashSaleTimerFrame.create({
      flash_sales_id,
      started_at,
      ended_at,
      status,
    });
    res.status(201).json({
      success: true,
      message: "Thêm khung giờ thành công",
      data: newTimeFrame,
    });
  } catch (error) {
    console.error("Lỗi khi thêm khung giờ:", error);
    res
      .status(500)
      .json({ success: false, message: "Đã xảy ra lỗi khi thêm khung giờ" });
  }
};

const updateTimeFrame = async (req, res) => {
  const { id } = req.params;
  const { started_at, ended_at, status } = req.body;
  try {
    const timeFrame = await FlashSaleTimerFrame.findByPk(id);
    if (!timeFrame) {
      return res
        .status(404)
        .json({ success: false, message: "Khung giờ không tồn tại" });
    }

    const flashSale = await FlashSales.findByPk(timeFrame.flash_sales_id);

    if (
      new Date(started_at) < new Date(flashSale.started_at) ||
      new Date(ended_at) > new Date(flashSale.ended_at)
    ) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ phải nằm trong thời gian của Flash Sale",
      });
    }

    timeFrame.started_at = started_at;
    timeFrame.ended_at = ended_at;
    timeFrame.status = status;
    await timeFrame.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật khung giờ thành công",
      data: timeFrame,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật khung giờ:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật khung giờ",
    });
  }
};

const deleteTimeFrame = async (req, res) => {
  const { id } = req.params;
  try {
    const timeFrame = await FlashSaleTimerFrame.findByPk(id);
    if (!timeFrame) {
      return res
        .status(404)
        .json({ success: false, message: "Khung giờ không tồn tại" });
    }

    await timeFrame.destroy();
    res
      .status(200)
      .json({ success: true, message: "Xóa khung giờ thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa khung giờ:", error);
    res
      .status(500)
      .json({ success: false, message: "Đã xảy ra lỗi khi xóa khung giờ" });
  }
};
//getShopRegisteredProductsByFlashSale
const getShopRegisteredProductsByFlashSale = async (req, res) => {
  const { flash_sales_id } = req.params;

  try {
    if (!flash_sales_id || isNaN(flash_sales_id)) {
      return res.status(400).json({
        success: false,
        message: "ID flash sale không hợp lệ.",
      });
    }

    const registeredProducts = await ShopRegisterFlashSales.findAll({
      include: [
        {
          model: FlashSaleTimerFrame,
          where: { flash_sales_id }, // Chỉ lấy các khung giờ thuộc flash sale ID
          attributes: [], // Không cần thông tin chi tiết về khung giờ
          required: true,
        },
        {
          model: Product,
          attributes: ["product_id", "product_name", "thumbnail", "base_price", "stock"],
        },
        {
          model: Shop,
          attributes: ["shop_id", "shop_name", "logo_url", "shop_description", "business_email", "phone_number"],
        },
      ],
      attributes: ["original_price", "flash_sale_price", "quantity", "sold"],
    });

    if (!registeredProducts || registeredProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm nào được đăng ký trong flash sale này.",
      });
    }

    const responseData = registeredProducts.map((product) => ({
      shop: product.Shop,
      product: product.Product,
      flash_sale_details: {
        original_price: product.original_price,
        flash_sale_price: product.flash_sale_price,
        quantity: product.quantity,
        sold: product.sold,
      },
    }));

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm đã đăng ký:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm đã đăng ký.",
    });
  }
};






const getSuggestFlashSaleForShop = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const currentDate = new Date();

    const count = await FlashSales.count({
      where: {
        [Op.or]: [
          {
            status: "active",
            started_at: {
              [Op.lte]: currentDate, // started_at <= thời gian hiện tại
            },
            ended_at: {
              [Op.gt]: currentDate, // ended_at > thời gian hiện tại
            },
          },
          {
            status: "waiting",
            started_at: {
              [Op.gt]: currentDate, // started_at > thời gian hiện tại
            },
          },
        ],
      },
    });

    const flashSales = await FlashSales.findAll({
      where: {
        [Op.or]: [
          {
            status: "active",
            started_at: {
              [Op.lte]: currentDate,
            },
            ended_at: {
              [Op.gt]: currentDate,
            },
          },
          {
            status: "waiting",
            started_at: {
              [Op.gt]: currentDate,
            },
          },
        ],
      },
      include: [
        {
          model: FlashSaleTimerFrame,
        },
      ],
      order: [["started_at", "ASC"]],
      limit,
      offset,
    });

    if (flashSales.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có Flash Sale nào đang diễn ra hoặc sắp tới",
      });
    }

    const totalPages = Math.ceil(count / limit);
    const currentPage = page;

    return res.status(200).json({
      success: true,
      data: flashSales,
      totalItems: count,
      totalPages,
      currentPage,
      limit,
    });
  } catch (error) {
    console.error(
      "Lỗi khi gợi ý Flash Sale cho cửa hàng:",
      error.message || error
    );
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi gợi ý Flash Sale cho cửa hàng",
    });
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
  getAvailableFlashSalesTimeFrames,
  getProductByTimeFrame,
  getShopRegisteredProductsByFlashSale,
  getSuggestFlashSaleForShop,
};
