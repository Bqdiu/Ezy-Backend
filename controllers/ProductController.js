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
const translate = require("translate-google");
const { de } = require("translate-google/languages");
const { Op } = require("sequelize");
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
        stock: { [Sequelize.Op.gt]: 0 },
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
    const { pageNumbers = 1, limit = 28 } = req.query;
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
    const totalPages = await Product.count({
      where: {
        sub_category_id: Array.from(subCategoryIds),
      },
    });
    const suggestedProducts = await Product.findAll({
      where: {
        sub_category_id: Array.from(subCategoryIds),
        stock: { [Sequelize.Op.gt]: 0 },
      },
      limit,
      offset,
    });
    res.status(200).json({
      success: true,
      data: suggestedProducts,
      total: suggestedProducts.length,
      pageNumbers,
      totalPages: Math.ceil(totalPages / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getSuggestProductsOfShop = async (req, res) => {
  try {
    const { shop_id } = req.params;
    const { pageNumbers = 1, limit = 28 } = req.query;
    const offset = (pageNumbers - 1) * limit;

    const products = await Product.findAll({
      where: {
        shop_id,
        [Op.and]: [
          { avgRating: { [Op.gte]: 4 } },
          { sold: { [Op.gt]: 0 } },
          { stock: { [Op.gt]: 0 } },
        ],
      },
      offset,
      limit,
    });
    const totalProduct = await Product.count({
      where: {
        shop_id,
        [Op.and]: [
          { avgRating: { [Op.gte]: 4 } },
          { sold: { [Op.gt]: 0 } },
          { stock: { [Op.gt]: 0 } },
        ],
      },
    });
    res.status(200).json({
      success: true,
      products,
      totalPage: Math.ceil(totalProduct / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý của shop: ", error);
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
        exclude: ["sub_category_id"],
      },
      include: [
        {
          model: ProductClassify,
          attributes: {
            exclude: ["product_id"],
          },
        },
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
                exclude: ["role_id", "password"],
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

    //Reviews
    const totalRatingQuery = `SELECT SUM(rating) as total_Rating, count(*) as total_Review
    FROM product_review pr
    inner join product_varients pv ON pr.product_varients_id = pv.product_varients_id
    where pv.product_id = ${id}`;
    const totalRating = await sequelize.query(totalRatingQuery, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const avgRating =
      totalRating[0]?.total_Rating / totalRating[0]?.total_Review || 0;

    product.update({ avgRating: avgRating });
    const totalReviews = totalRating[0]?.total_Review;
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    //Tính tổng trên mỗi loại sản phẩm
    const totalStockQuery = `SELECT product_classify_id,SUM(stock) as total_stock from product_varients where product_varients.product_classify_id in 
    (SELECT product_classify_id from product_classify where product_id = ${id})
    group by product_classify_id;`;

    const totalStock = await sequelize.query(totalStockQuery, {
      replacements: { product_id: id },
      type: Sequelize.QueryTypes.SELECT,
    });

    //Tổng sản phẩm của Shop
    if (product && product.Shop && product.Shop.dataValues) {
      const totalProductOfShop = `SELECT COUNT(product_id) as total_product from product where shop_id = ${product.shop_id}`;
      const totalProduct = await sequelize.query(totalProductOfShop, {
        type: Sequelize.QueryTypes.SELECT,
      });
      product.Shop.dataValues.total_product = totalProduct
        ? totalProduct[0]?.total_product
        : 0;
    }

    //Tổng sản phẩm mỗi ProductClassify
    product?.ProductClassifies?.forEach((classify) => {
      const data = totalStock.find(
        (stock) => stock.product_classify_id === classify.product_classify_id
      );

      console.log("Total stock of " + classify?.product_classify_id, data);
      classify.dataValues.total_stock = data ? data.total_stock : 0;
    });
    //Kiểm tra người dùng đã có sub_category_id trong lịch sử tìm kiếm chưa
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

    //Mỗi khi người dùng xem chi tiết sản phẩm thì tăng số lượt xem
    product.visited = product.visited + 1;
    await product.save();

    res.status(200).json({
      success: true,
      product,
      avgRating,
      totalReviews,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getProductVarients = async (req, res) => {
  try {
    const { product_id, product_classify_id } = req.query;

    let productVarient = {};
    if (product_id && product_classify_id) {
      productVarient = await ProductVarients.findAll({
        where: {
          product_id,
          product_classify_id,
        },
        include: [
          {
            model: ProductSize,
            attributes: {
              exclude: ["product_id"],
            },
          },
        ],
      });
    } else {
      productVarient = await ProductVarients.findAll({
        where: {
          product_id,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: productVarient,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu loại sản phẩm: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getAllProductsOfShop = async (req, res) => {
  try {
    const { shop_id, product_id } = req.query;
    const products = await Product.findAll({
      where: {
        shop_id,
        product_id: {
          [Sequelize.Op.ne]: product_id,
        },
        stock: { [Sequelize.Op.gt]: 0 },
      },
      limit: 10,
    });
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm của shop: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getProductBySortAndFilter = async (req, res) => {
  try {
    const { cat_id } = req.params;
    const {
      pageNumbers = 1,
      limit = 28,
      sortBy,
      facet = [],
      minPrice,
      maxPrice,
      ratingFilter,
    } = req.query;
    const offset = (pageNumbers - 1) * limit;
    const facetArray = facet
      ? Array.isArray(facet)
        ? facet.map((value) => parseInt(value, 10))
        : facet.split(",").map((value) => parseInt(value, 10))
      : [];

    let filterConditions = [];
    const whereConditions = {
      stock: { [Sequelize.Op.gt]: 0 },
      ...(ratingFilter && { avgRating: { [Sequelize.Op.eq]: ratingFilter } }),
      ...(minPrice && {
        discounted_price: { [Sequelize.Op.gte]: minPrice },
      }),
      ...(maxPrice && {
        discounted_price: { [Sequelize.Op.lte]: maxPrice },
      }),
    };

    switch (sortBy) {
      case "pop":
        filterConditions = [
          ["visited", "DESC"],
          ["sold", "DESC"],
          ["avgRating", "DESC"],
        ];
        break;
      case "cTime":
        filterConditions = [["created_at", "DESC"]];
        break;
      case "sales":
        filterConditions = [["sold", "DESC"]];
        whereConditions.sold = { [Sequelize.Op.gt]: 0 };
        break;
      case "ASC":
        filterConditions = [
          [
            Sequelize.literal("base_price - (base_price * sale_percents)/100"),
            "ASC",
          ],
        ];
        break;
      case "DESC":
        filterConditions = [
          [
            Sequelize.literal("base_price - (base_price * sale_percents)/100"),
            "DESC",
          ],
        ];
        break;
      default:
        filterConditions = [];
        break;
    }

    var products = [];
    let totalProducts = 0;

    totalProducts = await Product.count({
      where: whereConditions,

      include: [
        {
          model: SubCategory,
          where: {
            category_id: cat_id,
            ...(facetArray.length > 0 && {
              sub_category_id: { [Sequelize.Op.in]: facetArray },
            }),
          },
        },
      ],
    });
    products = await Product.findAll({
      where: whereConditions,
      include: [
        {
          model: SubCategory,
          where: {
            category_id: cat_id,
            ...(facetArray.length > 0 && {
              sub_category_id: { [Sequelize.Op.in]: facetArray },
            }),
          },
        },
      ],

      order: filterConditions,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      products,
      currentPage: pageNumbers,
      totalPages: Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm theo sort và filter: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getSuggestProductsNameBySearch = async (req, res) => {
  try {
    const { search } = req.query;
    if (search !== "") {
      const products = await Product.findAll({
        where: {
          product_name: {
            [Sequelize.Op.like]: `%${search}%`,
          },
        },
        limit: 9,
        order: sequelize.random(),
      });

      res.status(200).json({
        success: true,
        products,
      });
    }
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý theo tên: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const getProductAndShopBySearch = async (req, res) => {
  try {
    const {
      keyword = "",
      pageNumbers = 1,
      limit = 28,
      sortBy,
      minPrice,
      maxPrice,
      ratingFilter,
    } = req.query;
    const offset = (pageNumbers - 1) * limit;

    const lowerKeyword = keyword.toLowerCase();

    let translatedKeyword = await translate(lowerKeyword, {
      from: "en",
      to: "vi",
    });
    const stopWords = ["đôi"];
    translatedKeyword = translatedKeyword
      .split(" ")
      .filter((word) => !stopWords.includes(word))
      .join(" ");

    // console.log("Translated keyword: ", translatedKeyword);
    // const translatedKeywords = translatedKeyword.split(" ");

    let whereConditions = {
      [Sequelize.Op.or]: [
        { product_name: { [Sequelize.Op.like]: `%${keyword}%` } },
        { product_name: { [Sequelize.Op.like]: `%${translatedKeyword}%` } },
        {
          "$SubCategory.sub_category_name$": {
            [Sequelize.Op.like]: `%${keyword}%`,
          },
        },
        {
          "$SubCategory.Category.category_name$": {
            [Sequelize.Op.like]: `%${keyword}%`,
          },
        },
        {
          description: { [Sequelize.Op.like]: `%${keyword}%` },
        },
      ],

      stock: { [Sequelize.Op.gt]: 0 },
      ...(ratingFilter && { avgRating: { [Sequelize.Op.eq]: ratingFilter } }),
      ...(minPrice && {
        discounted_price: { [Sequelize.Op.gte]: minPrice },
      }),
      ...(maxPrice && {
        discounted_price: { [Sequelize.Op.lte]: maxPrice },
      }),
    };

    let filterConditions = [];
    switch (sortBy) {
      case "pop":
        filterConditions = [
          ["visited", "DESC"],
          ["sold", "DESC"],
          ["avgRating", "DESC"],
        ];
        break;
      case "cTime":
        filterConditions = [["created_at", "DESC"]];
        break;
      case "sales":
        filterConditions = [["sold", "DESC"]];
        whereConditions.sold = { [Sequelize.Op.gt]: 0 };
        break;
      case "ASC":
        filterConditions = [
          [
            Sequelize.literal("base_price - (base_price * sale_percents)/100"),
            "ASC",
          ],
        ];
        break;
      case "DESC":
        filterConditions = [
          [
            Sequelize.literal("base_price - (base_price * sale_percents)/100"),
            "DESC",
          ],
        ];
        break;
      default:
        filterConditions = [];
        break;
    }

    let totalProducts = await Product.count({
      where: whereConditions,

      include: [
        {
          model: SubCategory,
          include: {
            model: Category,
          },
        },
      ],
    });
    let products = await Product.findAll({
      where: whereConditions,
      include: [
        {
          model: SubCategory,
          include: {
            model: Category,
          },
        },
      ],

      order: filterConditions,
      limit,
      offset,
    });

    const shop = await Shop.findOne({
      where: {
        shop_name: {
          [Sequelize.Op.like]: `%${keyword}%`,
        },
      },
      include: [
        {
          model: UserAccount,
          attributes: {
            exclude: ["role_id", "password"],
          },
          include: {
            model: Role,
          },
        },
      ],
    });
    if (shop) {
      //Tổng sản phẩm của shop
      const totalProductOfShop = `SELECT COUNT(product_id) as total_product from product where shop_id = ${shop.shop_id}`;
      const totalProduct = await sequelize.query(totalProductOfShop, {
        type: Sequelize.QueryTypes.SELECT,
      });

      shop.dataValues.total_product = totalProduct
        ? totalProduct[0]?.total_product
        : 0;
    }

    res.status(200).json({
      success: true,
      shop,
      products,
      currentPage: pageNumbers,
      totalPages: Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý theo tên: ", error);
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
  getProductVarients,
  getAllProductsOfShop,
  getProductBySortAndFilter,
  getSuggestProductsNameBySearch,
  getProductAndShopBySearch,
  getSuggestProductsOfShop,
};
