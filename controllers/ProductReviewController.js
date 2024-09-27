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

const getProductReview = async (req, res) => {
  const { product_id } = req.params;
  const { rating = 6, pageNumbers = 1, limit = 10 } = req.query;
  const offset = (pageNumbers - 1) * limit;
  try {
    if (rating >= 1 && rating <= 5) {
      const totalReviews = await ProductReview.count({
        attributes: {
          exclude: ["user_id", "product_varients_id"],
        },
        include: [
          {
            model: UserAccount,
            include: {
              model: Role,
            },
          },
          {
            model: ProductVarients,
            where: {
              product_id: product_id,
            },
          },
        ],
        where: {
          rating: rating,
        },
      });
      const reviews = await ProductReview.findAll({
        attributes: {
          exclude: ["user_id", "product_varients_id"],
        },
        include: [
          {
            model: UserAccount,
            include: {
              model: Role,
            },
          },
          {
            model: ProductVarients,
            where: {
              product_id: product_id,
            },
            include: [
              {
                model: ProductSize,
              },
              {
                model: ProductClassify,
              },
            ],
          },
        ],
        where: {
          rating: rating,
        },
        order: [["created_at", "DESC"]],
        offset,
        limit,
      });
      res.status(200).json({
        success: true,
        reviews,
        totalPage: Math.ceil(totalReviews / limit),
      });
    } else {
      const totalReviews = await ProductReview.count({
        attributes: {
          exclude: ["user_id", "product_varients_id"],
        },
        include: [
          {
            model: UserAccount,
            include: {
              model: Role,
            },
          },
          {
            model: ProductVarients,
            where: {
              product_id: product_id,
            },
          },
        ],
      });
      const reviews = await ProductReview.findAll({
        attributes: {
          exclude: ["user_id", "product_varients_id"],
        },
        include: [
          {
            model: UserAccount,
            include: {
              model: Role,
            },
          },
          {
            model: ProductVarients,
            where: {
              product_id: product_id,
            },
            include: [
              {
                model: ProductSize,
              },
              {
                model: ProductClassify,
              },
            ],
          },
        ],
        order: [["created_at", "DESC"]],
        offset,
        limit,
      });

      res.status(200).json({
        success: true,
        reviews,
        totalPage: Math.ceil(totalReviews / limit),
      });
    }
  } catch (error) {
    console.log("Lỗi khi lấy review: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = { getProductReview };
