const {
  Product,
  ProductVarients,
  Shop,
  SubCategory,
  ProductImgs,
  Category,
  ProductClassify,
  ProductSize,
  BusinessStyle,
  UserAccount,
  Role,
  ProductReview,
  HistorySearch,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const getShops = async (req, res) => {
  try {
    const { keyword = "", pageNumbers = 1, limit = 5 } = req.query;
    const offset = (pageNumbers - 1) * limit;
    const shops = await Shop.findAndCountAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
                      SELECT COUNT(*)
                      FROM product AS p
                      WHERE
                        p.shop_id = Shop.shop_id
                    )`),
            "total_product",
          ],
        ],
      },
      where: {
        shop_name: {
          [Op.like]: `%${keyword}%`,
        },
      },
      offset,
      limit,
    });
    const totalShop = shops.count;
    res.status(200).json({
      success: true,
      message: "Lấy danh sách shop thành công",
      shops,
      totalPages: Math.ceil(totalShop / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy danh sách shop: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = { getShops };
