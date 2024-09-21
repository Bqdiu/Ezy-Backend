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
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Shop,
        },
        {
          model: SubCategory,
        },
      ],
    });
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const getLimitSuggestProducts = async (req, res) => {
  try {
    const userID = 1;
    const randomSubCategories = await SubCategory.findAll({
      include: {
        model: Product,
        required: true,
      },
      order: sequelize.random(),
      limit: 15,
    });
    const historySearches = await HistorySearch.findAll({
      where: { user_id: userID },
      include: {
        model: SubCategory,
      },
    });

    const subCategoryIds = new Set();

    randomSubCategories.forEach((sub) =>
      subCategoryIds.add(sub.sub_category_id)
    );
    historySearches.forEach((search) =>
      subCategoryIds.add(search.SubCategory.sub_category_id)
    );

    const suggestedProducts = await Product.findAll({
      where: {
        sub_category_id: Array.from(subCategoryIds),
      },
      limit: 48,
    });
    res.status(200).json({
      success: true,
      data: suggestedProducts,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const getSuggestProducts = async (req, res) => {
  try {
    const userID = 1;
    const { pageNumbers = 1, limit = 48 } = req.query;
    const offset = (pageNumbers - 1) * limit;

    const randomSubCategories = await SubCategory.findAll({
      include: {
        model: Product,
        required: true,
      },
      order: sequelize.random(),
      limit: 15,
    });
    const historySearches = await HistorySearch.findAll({
      where: { user_id: userID },
      include: {
        model: SubCategory,
      },
    });

    const subCategoryIds = new Set();

    randomSubCategories.forEach((sub) =>
      subCategoryIds.add(sub.sub_category_id)
    );
    historySearches.forEach((search) =>
      subCategoryIds.add(search.SubCategory.sub_category_id)
    );

    const suggestedProducts = await Product.findAll({
      where: {
        sub_category_id: Array.from(subCategoryIds),
      },
      limit,
      offset,
    });
    res.status(200).json({
      success: true,
      data: suggestedProducts,
      total: suggestedProducts.length,
      pageNumbers,
      totalPages: Math.ceil(suggestedProducts.length / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const getProductDetailsByID = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      where: { product_id: id },
      attributes: {
        exclude: ["shop_id", "sub_category_id"],
      },
      include: [
        {
          model: Shop,
          attributes: {
            exclude: ["user_id", "business_style_id"],
          },
          include: [
            {
              model: BusinessStyle,
            },
            {
              model: UserAccount,
              attributes: {
                exclude: ["role_id"],
              },
              include: {
                model: Role,
              },
            },
          ],
        },
        {
          model: SubCategory,
          attributes: {
            exclude: ["category_id"],
          },
          include: {
            model: Category,
          },
        },
        {
          model: ProductVarients,
          attributes: {
            exclude: ["product_id", "product_classify_id", "product_size_id"],
          },
          include: [
            {
              model: ProductClassify,
            },
            {
              model: ProductSize,
              attributes: {
                exclude: ["product_id"],
              },
            },
          ],
        },
        {
          model: ProductSize,
          attributes: {
            exclude: ["product_id"],
          },
        },
        {
          model: ProductImgs,
          attributes: {
            exclude: ["product_id"],
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
            product_id: id,
          },
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // if (!req.session.visitedProduct) {
    //   req.session.visitedProduct = new Set();
    // }

    // if (!req.session.visitedProduct.has(id)) {
    //   product.visited = product.visited + 1;
    //   await product.save();
    //   req.session.visitedProduct.add(id);
    // }
    const history = await HistorySearch.findOne({
      where: {
        user_id: 1,
        sub_category_id: product.SubCategory.sub_category_id,
      },
    });
    if (!history) {
      await HistorySearch.create({
        user_id: 1,
        sub_category_id: product.SubCategory.sub_category_id,
      });
    }

    product.visited = product.visited + 1;
    await product.save();

    res.status(200).json({
      success: true,
      product,
      reviews,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductDetailsByID,
  getSuggestProducts,
  getLimitSuggestProducts,
};
