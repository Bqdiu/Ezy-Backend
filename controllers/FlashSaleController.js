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
const { st } = require("translate-google/languages");
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

  // Kiểm tra thông tin đầu vào
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
    const startTime = new Date(started_at);
    const endTime = new Date(ended_at);

    // Kiểm tra thời gian bắt đầu là 00:00:00
    if (
      startTime.getHours() !== 0 ||
      startTime.getMinutes() !== 0 ||
      startTime.getSeconds() !== 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu phải là 00:00:00.",
      });
    }

    // Kiểm tra thời gian kết thúc là 23:59:59
    if (
      endTime.getHours() !== 23 ||
      endTime.getMinutes() !== 59 ||
      endTime.getSeconds() !== 59
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải vào lúc 23:59:59.",
      });
    }

    // Kiểm tra bắt đầu và kết thúc cùng ngày
    if (
      startTime.toDateString() !== endTime.toDateString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu và kết thúc phải cùng một ngày.",
      });
    }

    // Kiểm tra trùng lặp thời gian với các Flash Sale khác
    const overlappingFlashSales = await FlashSales.findAll({
      where: {
        [Op.or]: [
          { started_at: { [Op.between]: [started_at, ended_at] } },
          { ended_at: { [Op.between]: [started_at, ended_at] } },
          {
            [Op.and]: [
              { started_at: { [Op.lte]: started_at } },
              { ended_at: { [Op.gte]: ended_at } },
            ],
          },
        ],
      },
    });

    if (overlappingFlashSales.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Thời gian Flash Sale bị trùng lặp với một Flash Sale khác.",
      });
    }

    // Tạo mới Flash Sale
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

    // So sánh thời gian: Không cho phép xóa nếu còn dưới 1 giờ trước khi bắt đầu
    const diffInMilliseconds = startedAt - now;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

    if (diffInHours <= 1) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa Flash Sale khi sắp đến thời gian bắt đầu (dưới 1 giờ)",
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

    // Kiểm tra khung giờ nằm trong thời gian của Flash Sale
    if (
      new Date(started_at) < new Date(flashSale.started_at) ||
      new Date(ended_at) > new Date(flashSale.ended_at)
    ) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ phải nằm trong thời gian của Flash Sale",
      });
    }

    // Chuẩn hóa thời gian: loại bỏ giây và mili-giây
    const startTime = new Date(started_at);
    const endTime = new Date(ended_at);
    startTime.setSeconds(0, 0);
    endTime.setSeconds(0, 0);

    // Kiểm tra giờ bắt đầu là số chẵn và đúng 00 phút, 00 giây
    if (startTime.getHours() % 2 !== 0 || startTime.getMinutes() !== 0 || startTime.getSeconds() !== 0) {
      return res.status(400).json({
        success: false,
        message: "Giờ bắt đầu phải là giờ chẵn và đúng 00 phút 00 giây (ví dụ: 00:00:00, 02:00:00, 04:00:00, ...)",
      });
    }

    // Tính chênh lệch thời gian
    const diffInMilliseconds = endTime - startTime;
    const diffInSeconds = diffInMilliseconds / 1000;

    // Cho phép khoảng cách tối đa là 1 giờ 59 phút 59 giây
    if (diffInSeconds > 7199) {
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu và kết thúc phải cách nhau tối đa 1 giờ 59 phút 59 giây",
      });
    }

    // Kiểm tra trùng khung giờ
    const overlappingTimeFrames = await FlashSaleTimerFrame.findAll({
      where: {
        flash_sales_id,
        [Op.or]: [
          {
            started_at: { [Op.between]: [started_at, ended_at] },
          },
          {
            ended_at: { [Op.between]: [started_at, ended_at] },
          },
          {
            [Op.and]: [
              { started_at: { [Op.lte]: started_at } },
              { ended_at: { [Op.gte]: ended_at } },
            ],
          },
        ],
      },
    });

    if (overlappingTimeFrames.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ bị trùng với khung giờ khác trong Flash Sale",
      });
    }

    // Tạo mới khung giờ
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
  const { started_at, ended_at } = req.body;
  try {
    const timeFrame = await FlashSaleTimerFrame.findByPk(id);
    if (!timeFrame) {
      return res
        .status(404)
        .json({ success: false, message: "Khung giờ không tồn tại" });
    }

    const flashSale = await FlashSales.findByPk(timeFrame.flash_sales_id);

    // Kiểm tra khung giờ nằm trong thời gian của Flash Sale
    if (
      new Date(started_at) < new Date(flashSale.started_at) ||
      new Date(ended_at) > new Date(flashSale.ended_at)
    ) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ phải nằm trong thời gian của Flash Sale",
      });
    }

    // Kiểm tra thời gian bắt đầu phải nhỏ hơn thời gian kết thúc
    if (new Date(started_at) >= new Date(ended_at)) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu",
      });
    }

    // Chuẩn hóa thời gian: loại bỏ giây và mili-giây
    const startTime = new Date(started_at);
    const endTime = new Date(ended_at);
    startTime.setSeconds(0, 0);
    endTime.setSeconds(0, 0);

    // Kiểm tra giờ bắt đầu là số chẵn
    if (startTime.getHours() % 2 !== 0 || startTime.getMinutes() !== 0 || startTime.getSeconds() !== 0) {
      return res.status(400).json({
        success: false,
        message: "Giờ bắt đầu phải là giờ chẵn và đúng 00 phút 00 giây (ví dụ: 00:00:00, 02:00:00, 04:00:00, ...)",
      });
    }

    // Tính chênh lệch thời gian
    const diffInMilliseconds = new Date(ended_at) - new Date(started_at);
    const diffInSeconds = diffInMilliseconds / 1000;

    // Cho phép khoảng cách tối đa là 1 giờ 59 phút 59 giây
    if (diffInSeconds > 7199) { // 1 giờ 59 phút 59 giây = 7199 giây
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu và kết thúc phải cách nhau tối đa 1 giờ 59 phút 59 giây",
      });
    }

    // Kiểm tra không trùng khung giờ
    const overlappingTimeFrames = await FlashSaleTimerFrame.findAll({
      where: {
        flash_sales_id: timeFrame.flash_sales_id,
        flash_sale_time_frame_id: { [Op.ne]: id }, // Loại trừ chính khung giờ đang chỉnh sửa
        [Op.or]: [
          {
            started_at: { [Op.between]: [started_at, ended_at] },
          },
          {
            ended_at: { [Op.between]: [started_at, ended_at] },
          },
          {
            [Op.and]: [
              { started_at: { [Op.lte]: started_at } },
              { ended_at: { [Op.gte]: ended_at } },
            ],
          },
        ],
      },
    });

    if (overlappingTimeFrames.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Khung giờ bị trùng với khung giờ khác trong Flash Sale",
      });
    }

    // Cập nhật thời gian
    timeFrame.started_at = started_at;
    timeFrame.ended_at = ended_at;
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
    if (timeFrame.status === "active" || timeFrame.status === "ended") {
      return res
        .status(400)
        .json({ success: false, message: "Không thể xóa khung giờ đã kết thúc hoặc đang diễn ra" });
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
const getShopRegisteredProductsByFlashSale = async (req, res) => {
  const { id } = req.params;

  try {
    const timeFrames = await FlashSaleTimerFrame.findAll({
      where: { flash_sales_id: id },
      order: [["started_at", "ASC"]],
      include: [
        {
          model: ShopRegisterFlashSales,
          include: [
            {
              model: Product,
              attributes: ["product_id", "product_name", "thumbnail", "sold", "base_price"],
            },
            {
              model: Shop,
              attributes: ["shop_id", "shop_name", "shop_address", "phone_number"],
            },
          ],
        },
      ],
    });

    if (!timeFrames || timeFrames.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có khung giờ nào cho Flash Sale này",
      });
    }

    // Nhóm dữ liệu theo khung giờ
    const groupedData = timeFrames.map((timeFrame) => ({
      time_frame_id: timeFrame.flash_sale_time_frame_id,
      started_at: timeFrame.started_at,
      ended_at: timeFrame.ended_at,
      status: timeFrame.status,
      registered_products: timeFrame.ShopRegisterFlashSales.map((registration) => ({
        shop: {
          shop_id: registration.Shop.shop_id,
          shop_name: registration.Shop.shop_name,
          address: registration.Shop.shop_address,
          phone_number: registration.Shop.phone_number,
        },
        product: {
          product_id: registration.Product.product_id,
          product_name: registration.Product.product_name,
          thumbnail: registration.Product.thumbnail,
          base_price: registration.Product.base_price,
          flash_sale_price: registration.flash_sale_price,
          sold: registration.sold,
        },
        quantity: registration.quantity,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: groupedData,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin sản phẩm và cửa hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin sản phẩm và cửa hàng",
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
