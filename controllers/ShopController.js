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
  CustomizeShop,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const Sequelize = require("sequelize");
const ImgCustomizeShop = require("../models/ImgCustomizeShop");
const Op = Sequelize.Op;

const getShops = async (req, res) => {
  try {
    const { keyword = "", pageNumbers = 1, limit = 5 } = req.query;
    const offset = (pageNumbers - 1) * limit;
    const shops = await Shop.findAll({
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
      include: [
        {
          model: UserAccount,
        },
      ],
      where: {
        shop_name: {
          [Op.like]: `%${keyword}%`,
        },
      },
      offset,
      limit,
    });
    const totalShop = await Shop.count({
      where: {
        shop_name: {
          [Op.like]: `%${keyword}%`,
        },
      },
    });
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
const getShopDetail = async (req, res) => {
  try {
    const { shop_username } = req.params;
    const shop = await Shop.findOne({
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
      include: [
        {
          model: UserAccount,
          include: Role,
          where: {
            username: shop_username,
          },
        },
        {
          model: Product,
          where: {
            [Op.and]: [
              {
                stock: { [Op.gt]: 0 },
                avgRating: { [Op.gte]: 4 },
                sold: { [Op.gt]: 0 },
              },
            ],
          },
          limit: 6,
        },
        {
          model: CustomizeShop,
          include: [
            {
              model: ImgCustomizeShop,
            },
          ],
        },
      ],
    });
    if (!shop) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy shop",
      });
    }
    const subCategories = await SubCategory.findAll({
      attributes: [
        [
          Sequelize.fn("DISTINCT", Sequelize.col("sub_category_name")),
          "sub_category_name",
        ],
        "sub_category_id",
        "category_id",
      ],
      include: [
        {
          model: Product,
          where: {
            shop_id: shop.shop_id,
          },
          attributes: [], // Không cần thuộc tính của Product trong kết quả
        },
        {
          model: Category,
          attributes: ["category_name"],
        },
      ],
      raw: true,
    });

    res.status(200).json({
      success: true,
      message: "Lấy thông tin shop thành công",
      shop,
      subCategories,
    });
  } catch (error) {
    console.log("Lỗi khi lấy thông tin shop: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const createShop = async (req, res) => {
  const {
    shop_name,
    logo_url,
    shop_description,
    business_style_id,
    tax_code,
    business_email,
    province_id,
    district_id,
    ward_code,
    shop_address,
    citizen_number,
    full_name,
    user_id,
  } = req.body;
  try {
    const new_shop = await Shop.create({
      shop_name,
      logo_url,
      shop_description,
      business_style_id,
      tax_code,
      business_email,
      province_id,
      district_id,
      ward_code,
      shop_address,
      citizen_number,
      full_name,
      user_id,
    });
    res.status(200).json({
      success: true,
      shop: new_shop,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = { getShops, getShopDetail, createShop };
