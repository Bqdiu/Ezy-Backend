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
  ShopRegisterFlashSales,
  FlashSaleTimerFrame,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const Sequelize = require("sequelize");
const ImgCustomizeShop = require("../models/ImgCustomizeShop");
const { database } = require("firebase-admin");
const Op = Sequelize.Op;

const getShops = async (req, res) => {
  try {
    const { keyword = "", pageNumbers = 1, limit = 5 } = req.query;
    const offset = (pageNumbers - 1) * limit;

    const { count, rows: shops } = await Shop.findAndCountAll({
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
      order: [
        [
          sequelize.literal(
            "(SELECT COUNT(shop_id) from shop_register_events sre inner join sale_events se on sre.sale_events_id = se.sale_events_id where sre.shop_id = Shop.shop_id and se.is_actived = 1 and se.started_at <= NOW() and se.ended_at > NOW())"
          ),
          "DESC",
        ],
        [
          sequelize.literal(
            "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
          ),
          "DESC",
        ],
        ["total_ratings", "DESC"],
      ],
      offset,
      limit,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách shop thành công",
      shops,
      totalPages: Math.ceil(count / limit),
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
                product_status: 1,
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
    shop_id,
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
    phone_number,
    user_id,
  } = req.body;
  try {
    const new_shop = await Shop.create({
      shop_id,
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
      phone_number,
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

const getShopByUserID = async (req, res) => {
  const { user_id } = req.query;
  try {
    const shop = await Shop.findOne({
      where: {
        user_id: user_id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the shop.",
      error: error.message,
    });
  }
};

// only edit valid values
const updateShopProfile = async (req, res) => {
  try {
    const {
      shop_id,
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
      phone_number,
    } = req.body;
    const shop = await Shop.findOne({
      where: {
        shop_id,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    await Shop.update(
      {
        shop_name: shop_name || shop.shop_name,
        logo_url: logo_url || shop.logo_url,
        shop_description: shop_description || shop.shop_description,
        business_style_id: business_style_id || shop.business_style_id,
        tax_code: tax_code || shop.tax_code,
        business_email: business_email || shop.business_email,
        province_id: province_id || shop.province_id,
        district_id: district_id || shop.district_id,
        ward_code: ward_code || shop.ward_code,
        shop_address: shop_address || shop.shop_address,
        citizen_number: citizen_number || shop.citizen_number,
        full_name: full_name || shop.full_name,
        phone_number: phone_number || shop.phone_number,
      },
      {
        where: {
          shop_id,
        },
      }
    );

    const updatedShop = await Shop.findOne({
      where: {
        shop_id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Shop updated successfully",
      data: updatedShop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the shop",
      error: error.message || error,
    });
  }
};

module.exports = {
  getShops,
  getShopDetail,
  createShop,
  getShopByUserID,
  updateShopProfile,
};
