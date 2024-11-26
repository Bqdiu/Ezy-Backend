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
  ShopRegisterFlashSales,
  FlashSaleTimerFrame,
  ShopRegisterEvents,
  SaleEvents,
} = require("../models/Assosiations");
const sequelize = require("../config/database");
const Sequelize = require("sequelize");
const translate = require("translate-google");
const { de, fi } = require("translate-google/languages");
const { Op } = require("sequelize");
const { model } = require("mongoose");
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
    const { user_id } = req.query;
    const subCategoryIds = new Set();
    //Gợi ý sản phẩm dựa trên danh trên danh mục phụ và lịch sử tìm kiếm của người dùng và phương pháp lấy ngẫu nhiên sản phẩm từ các shop khác nhau
    // Lấy 15 sub category ngẫu nhiên
    const randomSubCategories = await SubCategory.findAll({
      include: {
        model: Product,
        required: true,
      },
      order: sequelize.random(),
      limit: 15,
    });

    randomSubCategories.forEach((sub) =>
      subCategoryIds.add(sub.sub_category_id)
    );

    // Nếu có user_id, lấy lịch sử tìm kiếm và thêm sub category id từ lịch sử
    if (user_id) {
      const historySearches = await HistorySearch.findAll({
        where: { user_id: user_id },
        include: {
          model: SubCategory,
        },
      });

      historySearches.forEach((search) =>
        subCategoryIds.add(search.SubCategory.sub_category_id)
      );
    }

    const shops = await Shop.findAll({
      include: [
        {
          model: Product,
          where: {
            sub_category_id: Array.from(subCategoryIds),
            stock: { [Sequelize.Op.gt]: 0 },
            product_status: 1,
          },
          required: true,
        },
      ],
      where: {
        shop_status: 1,
      },
    });

    let suggestedProducts = [];

    // Tìm kiếm sản phẩm dựa trên sub category id từ tập hợp subCategoryIds
    for (const shop of shops) {
      const products = await Product.findAll({
        where: {
          shop_id: shop.shop_id,
          sub_category_id: Array.from(subCategoryIds),
          stock: { [Sequelize.Op.gt]: 0 },
          product_status: 1,
        },
        include: [
          {
            model: Shop,
            required: true,
            attributes: ["shop_name", "shop_id", "shop_status"],
          },
        ],
        order: [
          [sequelize.random()],
          ["sold", "DESC"],
          ["avgRating", "DESC"],
          ["visited", "DESC"],
        ],
        limit: 6, // Giới hạn số sản phẩm từ mỗi shop
      });

      suggestedProducts = [...suggestedProducts, ...products];
    }

    // Tìm các flash sale cho sản phẩm đã chọn
    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: suggestedProducts.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const saleEventsCount = await ShopRegisterEvents.count({
      where: {
        shop_id: suggestedProducts.map((product) => product.shop_id),
      },
      include: [
        {
          model: SaleEvents,
          required: true,
          where: {
            is_actived: true,
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
    });

    // Kết hợp sản phẩm với flash sales
    const productsWithFlashSales = suggestedProducts.map((product) => {
      const productFlashSales = flashSales.filter(
        (sale) => sale.product_id === product.product_id
      );

      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
        activeSaleEventsCount: saleEventsCount,
        activeFlashSales: productFlashSales.length,
      };
    });

    productsWithFlashSales.sort(
      (a, b) =>
        b.activeSaleEventsCount - a.activeSaleEventsCount &&
        b.activeFlashSales - a.activeFlashSales
    );

    res.status(200).json({
      success: true,
      data: productsWithFlashSales,
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
    const {
      user_id,
      pageNumbers = 1,
      limit = 2,
      excludeProductIds = [],
    } = req.query;

    const offset = (parseInt(pageNumbers, 10) - 1) * parseInt(limit, 10);
    const subCategoryIds = new Set();

    // Bước 1: Lấy danh mục phụ ngẫu nhiên cho sự đa dạng của sản phẩm
    const randomSubCategories = await SubCategory.findAll({
      include: {
        model: Product,
        required: true,
      },
      order: sequelize.random(),
      limit: 15,
    });
    randomSubCategories.forEach((sub) =>
      subCategoryIds.add(sub.sub_category_id)
    );

    // Bước 2: Nếu có user_id, thêm danh mục phụ từ lịch sử tìm kiếm
    if (user_id) {
      const historySearches = await HistorySearch.findAll({
        where: { user_id: user_id },
        include: {
          model: SubCategory,
        },
      });
      historySearches.forEach((search) =>
        subCategoryIds.add(search.SubCategory.sub_category_id)
      );
    }
    const { count, rows: suggestedProducts } = await Product.findAndCountAll({
      where: {
        sub_category_id: Array.from(subCategoryIds),
        stock: { [Sequelize.Op.gt]: 0 },
        product_status: 1,
        product_id: { [Sequelize.Op.notIn]: excludeProductIds },
      },
      include: [
        {
          model: Shop,

          attributes: {
            include: [
              "shop_name",
              "shop_id",
              "shop_status",
              [
                sequelize.literal(
                  "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
                ),
                "total_visited",
              ],
            ],
          },
          where: {
            shop_status: 1,
          },
        },
      ],
      order: [
        [sequelize.random()], // Chọn ngẫu nhiên để đa dạng
        ["sold", "DESC"], // Ưu tiên sản phẩm bán chạy
        ["avgRating", "DESC"], // Ưu tiên sản phẩm có đánh giá cao
        ["visited", "DESC"], // Ưu tiên sản phẩm có lượt xem cao
        [
          sequelize.literal(
            "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
          ),
          "DESC",
        ], // Ưu tiên shop có tổng lượt xem cao
      ],
      limit: parseInt(limit, 10), // Số lượng sản phẩm tối đa
      offset: offset, // Dùng để phân trang
    });

    // Bước 4: Lấy thông tin flash sale
    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: suggestedProducts.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
    });

    const saleEventsCount = await ShopRegisterEvents.count({
      where: {
        shop_id: suggestedProducts.map((product) => product.shop_id),
      },
      include: [
        {
          model: SaleEvents,
          required: true,
          where: {
            is_actived: true,
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
    });

    // Kết hợp sản phẩm với flash sales
    const productsWithFlashSales = suggestedProducts.map((product) => {
      const productFlashSales = flashSales.filter(
        (sale) =>
          sale.product_id === product.product_id &&
          sale.FlashSaleTimeFrame !== null
      );

      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
        activeSaleEventsCount: saleEventsCount,
        activeFlashSales: productFlashSales.length,
      };
    });

    productsWithFlashSales.sort(
      (a, b) =>
        b.activeSaleEventsCount - a.activeSaleEventsCount &&
        b.activeFlashSales - a.activeFlashSales
    );

    // Phản hồi dữ liệu với thông tin phân trang
    res.status(200).json({
      success: true,
      data: productsWithFlashSales,
      total: count,
      pageNumbers,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu sản phẩm gợi ý:", error);
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
    const offset = (parseInt(pageNumbers, 10) - 1) * parseInt(limit, 10);
    const { count, rows: products } = await Product.findAndCountAll({
      where: {
        shop_id,
        [Op.and]: [
          { avgRating: { [Op.gte]: 4 } },
          { sold: { [Op.gt]: 0 } },
          { stock: { [Op.gt]: 0 } },
          {
            product_status: 1,
          },
          {
            "$Shop.shop_status$": 1,
          },
        ],
      },
      include: [
        {
          model: Shop,
          attributes: {
            include: ["shop_name", "shop_id", "shop_status"],
          },
        },
      ],
      offset,
      limit: parseInt(limit, 10),
    });

    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const productsWithFlashSales = products.map((product) => {
      // Tìm flash sale tương ứng cho từng sản phẩm
      const productFlashSales = flashSales.filter(
        (sale) => sale.product_id === product.product_id
      );

      // Thêm flash sale vào sản phẩm
      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
      };
    });

    res.status(200).json({
      success: true,
      products: productsWithFlashSales,
      totalPage: Math.ceil(count / limit),
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
    const { user_id } = req.query;
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
        {
          model: ShopRegisterFlashSales,
          include: [
            {
              model: FlashSaleTimerFrame,
              where: {
                [Op.or]: [
                  {
                    status: "active", // Điều kiện cho flash sale đang diễn ra
                    started_at: { [Op.lte]: new Date() },
                    ended_at: { [Op.gt]: new Date() },
                  },
                  {
                    status: "waiting", // Điều kiện cho flash sale sắp diễn ra
                    started_at: { [Op.gt]: new Date() },
                  },
                ],
              },
            },
          ],
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
    if (user_id) {
      const history = await HistorySearch.findOne({
        where: {
          user_id: user_id,
          sub_category_id: product.SubCategory.sub_category_id,
        },
      });
      if (!history) {
        await HistorySearch.create({
          user_id: user_id,
          sub_category_id: product.SubCategory.sub_category_id,
        });
      }
    }
    //Kiểm tra người dùng đã có sub_category_id trong lịch sử tìm kiếm chưa


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
        product_status: 1,
        "$Shop.shop_status$": 1,
      },
      include: [
        {
          model: Shop,
          attributes: {
            include: ["shop_name", "shop_id", "shop_status"],
          },
        },
      ],
      limit: 10,
    });
    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const productsWithFlashSales = products.map((product) => {
      // Tìm flash sale tương ứng cho từng sản phẩm
      const productFlashSales = flashSales.filter(
        (sale) => sale.product_id === product.product_id
      );

      // Thêm flash sale vào sản phẩm
      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
      };
    });

    res.status(200).json({
      success: true,
      products: productsWithFlashSales,
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
      product_status: 1,
      "$Shop.shop_status$": 1,
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

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Shop,
          attributes: ["shop_id", "shop_name", "shop_status"],
        },
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
    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const productsWithFlashSales = products.map((product) => {
      // Tìm flash sale tương ứng cho từng sản phẩm
      const productFlashSales = flashSales.filter(
        (sale) => sale.product_id === product.product_id
      );

      // Thêm flash sale vào sản phẩm
      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
      };
    });

    res.status(200).json({
      success: true,
      products: productsWithFlashSales,
      currentPage: pageNumbers,
      totalPages: Math.ceil(count / limit),
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
    const { search, cat_id, shop_username } = req.query;
    if (search !== "") {
      let whereConditions = {
        stock: { [Sequelize.Op.gt]: 0 },
        product_status: 1,
        "$Shop.shop_status$": 1,
        product_name: {
          [Sequelize.Op.like]: `%${search}%`,
        },
        ...(cat_id && { "$SubCategory.category_id$": { [Op.eq]: cat_id } }),
        ...(shop_username && {
          "$Shop.UserAccount.username$": { [Op.eq]: shop_username },
        }),
      };
      const products = await Product.findAll({
        where: whereConditions,
        include: [
          {
            model: Shop,
            include: {
              model: UserAccount,
            },
          },
          {
            model: SubCategory,
            include: {
              model: Category,
            },
          },
        ],
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
      cat_id,
      shop_username,
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
          [Sequelize.Op.or]: [
            {
              "$SubCategory.sub_category_name$": {
                [Sequelize.Op.like]: `%${keyword}%`,
              },
            },
            {
              "$SubCategory.sub_category_name$": {
                [Sequelize.Op.like]: `%${translatedKeyword}%`,
              },
            },
          ],
        },
        {
          [Sequelize.Op.or]: [
            {
              "$SubCategory.Category.category_name$": {
                [Sequelize.Op.like]: `%${keyword}%`,
              },
            },
            {
              "$SubCategory.Category.category_name$": {
                [Sequelize.Op.like]: `%${translatedKeyword}%`,
              },
            },
          ],
        },
        {
          [Sequelize.Op.or]: [
            {
              description: { [Sequelize.Op.like]: `%${keyword}%` },
            },
            {
              description: { [Sequelize.Op.like]: `%${translatedKeyword}%` },
            },
          ],
        },
      ],
      "$Shop.shop_status$": 1,
      stock: { [Sequelize.Op.gt]: 0 },
      product_status: 1,
      ...(ratingFilter && { avgRating: { [Sequelize.Op.eq]: ratingFilter } }),
      ...(minPrice && {
        discounted_price: { [Sequelize.Op.gte]: minPrice },
      }),
      ...(maxPrice && {
        discounted_price: { [Sequelize.Op.lte]: maxPrice },
      }),
      ...(cat_id && { "$SubCategory.category_id$": { [Op.eq]: cat_id } }),
      ...(shop_username && {
        "$Shop.UserAccount.username$": { [Op.eq]: shop_username },
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

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Shop,
          include: {
            model: UserAccount,
            attributes: {
              exclude: ["role_id", "password"],
            },
            include: {
              model: Role,
            },
          },
        },
        {
          model: SubCategory,
          include: {
            model: Category,
          },
        },
      ],

      order: [
        ...filterConditions,
        ["sold", "DESC"], // Ưu tiên sản phẩm bán chạy
        ["avgRating", "DESC"], // Ưu tiên sản phẩm có đánh giá cao
        ["visited", "DESC"], // Ưu tiên sản phẩm có lượt xem cao
        [
          sequelize.literal(
            "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
          ),
          "DESC",
        ],
      ],
      limit,
      offset,
    });

    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const saleEventsCount = await ShopRegisterEvents.count({
      where: {
        shop_id: products.map((product) => product.shop_id),
      },
      include: [
        {
          model: SaleEvents,
          required: true,
          where: {
            is_actived: true,
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
    });

    const productsWithFlashSales = products.map((product) => {
      const productFlashSales = flashSales.filter(
        (sale) =>
          sale.product_id === product.product_id &&
          sale.FlashSaleTimeFrame !== null
      );

      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
        activeSaleEventsCount: saleEventsCount,
        activeFlashSales: productFlashSales.length,
      };
    });

    productsWithFlashSales.sort(
      (a, b) =>
        b.activeSaleEventsCount - a.activeSaleEventsCount &&
        b.activeFlashSales - a.activeFlashSales
    );

    const shop = await Shop.findAll({
      where: {
        shop_name: {
          [Sequelize.Op.like]: `%${keyword}%`,
        },
        shop_status: 1,
      },
      include: [
        {
          model: UserAccount,
          attributes: {
            exclude: ["role_id", "password"],
            include: [
              [
                sequelize.literal(
                  "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
                ),
                "total_visited",
              ],
            ],
          },
          include: {
            model: Role,
          },
        },
      ],
      limit: 1,
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
    });

    if (shop?.length > 0) {
      //Tổng sản phẩm của shop
      const totalProductOfShop = `SELECT COUNT(product_id) as total_product from product where shop_id = ${shop[0]?.shop_id}`;
      const totalProduct = await sequelize.query(totalProductOfShop, {
        type: Sequelize.QueryTypes.SELECT,
      });

      shop[0].dataValues.total_product = totalProduct
        ? totalProduct[0]?.total_product
        : 0;
    }

    res.status(200).json({
      success: true,
      shop,
      products: productsWithFlashSales,
      currentPage: pageNumbers,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm gợi ý theo tên: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getProductBySubCategory = async (req, res) => {
  try {
    const { sub_category_id } = req.params;
    const { shop_id, pageNumbers = 1, limit = 28, sortBy } = req.query;
    const offset = (pageNumbers - 1) * limit;

    let whereConditions = {
      shop_id,
      stock: { [Sequelize.Op.gt]: 0 },
      "$Shop.shop_status$": 1,
      product_status: 1,
    };
    if (sub_category_id != -1) {
      whereConditions.sub_category_id = sub_category_id;
    }

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

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereConditions,
      order: [
        ...filterConditions,
        ["sold", "DESC"], // Ưu tiên sản phẩm bán chạy
        ["avgRating", "DESC"], // Ưu tiên sản phẩm có đánh giá cao
        ["visited", "DESC"], // Ưu tiên sản phẩm có lượt xem cao
        [
          sequelize.literal(
            "(SELECT SUM(visited) FROM product WHERE shop_id = Shop.shop_id)"
          ),
          "DESC",
        ],
      ],
      include: [
        {
          model: Shop,
          attributes: ["shop_id", "shop_name", "shop_status"],
        },
      ],
      limit,
      offset,
    });

    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });
    const saleEventsCount = await ShopRegisterEvents.count({
      where: {
        shop_id: products.map((product) => product.shop_id),
      },
      include: [
        {
          model: SaleEvents,
          required: true,
          where: {
            is_actived: true,
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
    });

    const productsWithFlashSales = products.map((product) => {
      const productFlashSales = flashSales.filter(
        (sale) =>
          sale.product_id === product.product_id &&
          sale.FlashSaleTimeFrame !== null
      );

      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
        activeSaleEventsCount: saleEventsCount,
        activeFlashSales: productFlashSales.length,
      };
    });

    productsWithFlashSales.sort(
      (a, b) =>
        b.activeSaleEventsCount - a.activeSaleEventsCount &&
        b.activeFlashSales - a.activeFlashSales
    );

    res.status(200).json({
      success: true,
      products: productsWithFlashSales,
      currentPage: pageNumbers,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm theo subcategory: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const addProduct = async (req, res) => {
  const {
    shop_id,
    sub_category_id,
    product_name,
    thumbnail,
    brand,
    description,
    gender_object,
    base_price,
    sale_percents,
    origin,
    stock,
  } = req.body;
  try {
    const product = await Product.create({
      shop_id: shop_id,
      sub_category_id: sub_category_id,
      product_name: product_name,
      thumbnail: thumbnail,
      brand: brand,
      description: description,
      gender_object: gender_object,
      base_price: base_price,
      sale_percents: sale_percents,
      origin: origin,
      stock: stock,
      sold: 0,
    });
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const getShopProducts = async (req, res) => {
  const { shop_id, product_status, page = 1, limit = 5 } = req.query;
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const offset = (parsedPage - 1) * parsedLimit;

  if (!shop_id) {
    return res.status(400).json({
      success: false,
      message: "shop_id is required",
    });
  }
  // if product status is not provided, get all products
  const whereCondition = {
    shop_id: shop_id,
  };
  if (product_status) {
    whereCondition.product_status = product_status;
  }

  try {
    const count = await Product.count({
      where: whereCondition,
    });

    const products = await Product.findAll({
      where: whereCondition,
      attributes: {
        exclude: ["hasVarient"],
      },
      include: [
        {
          model: ProductImgs,
        },
        {
          model: SubCategory,
        },
        {
          model: ProductVarients,
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
      limit: parsedLimit,
      offset: offset,
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: products,
      totalPages: Math.ceil(count / parsedLimit),
      totalItems: count,
    });
  } catch (error) {
    console.log("Lỗi khi lấy dữ liệu sản phẩm của shop: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const searchShopProducts = async (req, res) => {
  const {
    shop_id,
    product_status,
    product_name,
    sub_category_id,
    page = 1,
    limit = 5,
  } = req.query;
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  if (!shop_id) {
    return res.status(400).json({
      success: false,
      message: "shop_id is required",
    });
  }

  // Build where condition
  const whereCondition = {
    shop_id: shop_id,
  };

  if (product_status) {
    whereCondition.product_status = product_status;
  }

  if (product_name) {
    // Use LIKE for partial matching of product_name
    whereCondition.product_name = {
      [Op.like]: `%${product_name}%`,
    };
  }

  if (sub_category_id) {
    whereCondition.sub_category_id = sub_category_id;
  }

  try {
    const products = await Product.findAll({
      where: whereCondition,
      attributes: {
        exclude: ["hasVarient"],
      },
      include: [
        {
          model: ProductImgs,
        },
        {
          model: ProductVarients,
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
      limit: parsedLimit,
      offset: offset,
      order: [["created_at", "DESC"]],
    });

    const totalProducts = await Product.count({
      where: whereCondition,
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found",
      });
    }
    res.status(200).json({
      success: true,
      data: products,
      totalPages: Math.ceil(totalProducts / parsedLimit),
      totalItems: totalProducts,
    });
  } catch (error) {
    console.log("Error getting products: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateProductStatus = async (req, res) => {
  const { product_id, product_status } = req.body;

  if (!product_id || product_status === undefined || product_status === null) {
    return res.status(400).json({
      success: false,
      message: "product_id and product_status are required",
    });
  }

  try {
    const product = await Product.findOne({
      where: {
        product_id: product_id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.product_status = product_status;
    await product.save();

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.log("Error updating product status: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getProductByID = async (req, res) => {
  try {
    const { product_id } = req.query;
    const product = await Product.findOne({
      where: { product_id },
      include: [
        {
          model: SubCategory,
        },
        {
          model: ProductImgs,
        },
        {
          model: ProductVarients,
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
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const resetProductStock = async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: "product_id is required",
    });
  }
  try {
    const product = await Product.findOne({
      where: {
        product_id: product_id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.stock = 0;
    await product.save();
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.log("Error updating product stock: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateBasicInfoProduct = async (req, res) => {
  const {
    product_id,
    thumbnail,
    sub_category_id,
    product_name,
    description,
    origin,
    gender_object,
    brand,
  } = req.body;

  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: "product_id is required",
    });
  }

  try {
    const product = await Product.findOne({
      where: {
        product_id: product_id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.sub_category_id = sub_category_id || product.sub_category_id;
    product.product_name = product_name || product.product_name;
    product.thumbnail = thumbnail || product.thumbnail;
    product.brand = brand || product.brand;
    product.description = description || product.description;
    product.gender_object = gender_object || product.gender_object;
    product.origin = origin || product.origin;

    await product.save();

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error updating product: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const deleteSomeProducts = async (req, res) => {
  const { product_ids } = req.body;

  if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "product_ids is required and must be a non-empty array",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const products = await Product.findAll({
      where: {
        product_id: product_ids,
      },
      transaction,
    });

    if (products.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "No products found for the provided IDs",
      });
    }

    await Product.destroy({
      where: {
        product_id: product_ids,
      },
      transaction,
    });

    await transaction.commit();
    res.status(200).json({
      success: true,
      message: "Deleted products successfully",
    });
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeForeignKeyConstraintError") {
      console.log("Foreign key constraint error: ", error);
      return res.status(409).json({
        success: false,
        message: "Cannot delete products due to foreign key constraints",
      });
    }

    console.log("Error deleting products: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getTopProductBySubCategoryID = async (req, res) => {
  try {
    const { sub_category_id } = req.query;
    const products = await Product.findAll({
      where: {
        sub_category_id,
        product_status: 1,
        stock: {
          [Sequelize.Op.gt]: 0,
        },
        stock: { [Sequelize.Op.gt]: 0 },
      },
      include: [
        {
          model: Shop,
        },
      ],
      limit: 30,
      order: [["sold", "DESC"]],
    });
    const totalReviews = await ProductReview.findAll({
      where: {
        "$ProductVarient.product_id$": products.map(
          (product) => product.product_id
        ),
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("review_id")), "total_reviews"],
      ],
      include: [
        {
          model: ProductVarients,
          attributes: ["product_id", "product_varients_id"],
        },
      ],
      group: ["review_id"],
    });

    const flashSales = await ShopRegisterFlashSales.findAll({
      where: {
        product_id: products.map((product) => product.product_id),
      },
      include: [
        {
          model: FlashSaleTimerFrame,
          required: false,
          where: {
            status: "active",
            started_at: { [Sequelize.Op.lte]: new Date() },
            ended_at: { [Sequelize.Op.gt]: new Date() },
          },
        },
      ],
      order: [[{ model: FlashSaleTimerFrame }, "ended_at", "DESC"]],
      limit: 1,
    });

    const productsWithFlashSales = products.map((product) => {
      const productFlashSales = flashSales.filter(
        (sale) =>
          sale.product_id === product.product_id &&
          sale.FlashSaleTimeFrame !== null
      );
      const totalReview = totalReviews.find(
        (review) => review.ProductVarient.product_id === product.product_id
      );

      return {
        ...product.toJSON(),
        flashSales: productFlashSales,
        total_reviews: totalReview ? totalReview.dataValues.total_reviews : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: productsWithFlashSales,
      totalReviews,
    });
  } catch (error) {
    console.log("Error getting top product by sub category id: ", error);
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
  getProductBySubCategory,
  addProduct,
  getShopProducts,
  searchShopProducts,
  updateProductStatus,
  getProductByID,
  resetProductStock,
  updateBasicInfoProduct,
  deleteSomeProducts,
  getTopProductBySubCategoryID,
};
