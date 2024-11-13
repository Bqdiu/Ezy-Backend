const sequelize = require("../config/database");
const { Op } = require("sequelize");
const {
  ProductVarients,
  CartShop,
  CartSections,
  CartItems,
  Product,
  ProductClassify,
  Shop,
  ProductSize,
  UserAccount,
  SubCategory,
  Category,
  ShopRegisterFlashSales,
  FlashSaleTimerFrame,
} = require("../models/Assosiations");

const getCart = async (req, res) => {
  try {
    const { user_id } = req.query;

    const cartSection = await CartSections.findOne({
      where: {
        user_id: user_id,
      },
    });

    if (!cartSection) {
      return res.status(200).json({
        success: true,
        cartItems: [],
        totalItems: 0,
      });
    }
    const cartShop = await CartShop.findAll({
      where: {
        cart_id: cartSection.cart_id,
        "$Shop.shop_status$": 1,
        "$CartItems.ProductVarient.Product.product_status$": 1,
        "$CartItems.ProductVarient.stock$": {
          [Op.gt]: 0,
        },
      },

      include: [
        {
          model: Shop,
          include: [
            {
              model: UserAccount,
            },
          ],
        },
        {
          model: CartItems,
          include: [
            {
              model: ProductVarients,
              include: [
                {
                  model: Product,

                  include: [
                    {
                      model: ProductClassify,
                    },

                    {
                      model: ShopRegisterFlashSales,
                      include: [
                        {
                          model: FlashSaleTimerFrame,
                          where: {
                            started_at: {
                              [Op.lte]: new Date(),
                            },
                            ended_at: {
                              [Op.gt]: new Date(),
                            },
                          },
                        },
                      ],
                    },
                  ],
                  attributes: [
                    "product_id",
                    "product_name",
                    "product_status",
                    "thumbnail",
                  ],
                  // where: {
                  //   product_status: 1,
                  // },
                },
                {
                  model: ProductClassify,
                },
                {
                  model: ProductSize,
                },
              ],
              // where: {
              //   stock: {
              //     [Op.gt]: 0,
              //   },
              // },
            },
          ],
        },
        {
          model: CartSections,
        },
      ],

      order: [["updatedAt", "DESC"]],
    });

    for (const shop of cartShop) {
      for (const item of shop.CartItems) {
        let calculatedPrice;

        if (item.ProductVarient.Product.ShopRegisterFlashSales.length > 0) {
          const flashSale =
            item.ProductVarient.Product.ShopRegisterFlashSales[0];

          if (
            flashSale &&
            flashSale.sold + item.quantity <= flashSale.quantity
          ) {
            calculatedPrice = item.quantity * flashSale.flash_sale_price;
          }
        } else {
          calculatedPrice =
            item.quantity * item.ProductVarient.discounted_price;
        }

        if (calculatedPrice !== undefined && item.price !== calculatedPrice) {
          await item.update({
            price: calculatedPrice,
          });
        }
      }
    }

    const invalidItems = await CartItems.findAll({
      where: {
        [Op.and]: [
          {
            "$CartShop.CartSection.cart_id$": cartSection.cart_id,
          },
          {
            [Op.or]: [
              {
                "$ProductVarient.stock$": {
                  [Op.lte]: 0,
                },
              },
              {
                "$ProductVarient.Product.product_status$": {
                  [Op.eq]: 0,
                },
              },
              {
                "$ProductVarient.Product.Shop.shop_status$": {
                  [Op.eq]: 0,
                },
              },
            ],
          },
        ],
      },
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
              include: [
                {
                  model: ProductClassify,
                },
                {
                  model: Shop,
                  attributes: ["shop_id", "shop_name", "shop_status"],
                },
              ],
            },
            {
              model: ProductClassify,
            },
            {
              model: ProductSize,
            },
          ],
        },
        {
          model: CartShop,
          include: [
            {
              model: CartSections,
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      cartShop: cartShop,
      invalidItems,
    });
  } catch (error) {
    console.log("Lỗi khi lấy giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getLimitCartItems = async (req, res) => {
  try {
    const { user_id } = req.query;
    const cartSection = await CartSections.findOne({
      where: {
        user_id: user_id,
      },
    });
    if (!cartSection) {
      return res.status(200).json({
        success: true,
        cartItems: [],
        totalItems: 0,
      });
    }
    const { count, rows: cartItems } = await CartItems.findAndCountAll({
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
              // where: {
              //   product_status: 1,
              // },
            },

            {
              model: ProductClassify,
            },
          ],
          // where: {
          //   stock: {
          //     [Op.gt]: 0,
          //   },
          // },
        },
        {
          model: CartShop,
          // where: {
          //   cart_id: cartSection.cart_id,
          // },
          include: [
            {
              model: Shop,
              attributes: ["shop_id", "shop_name", "shop_status"],
            },
          ],
        },
      ],
      where: {
        "$CartShop.cart_id$": cartSection.cart_id,
        "$CartShop.Shop.shop_status$": 1,
        "$ProductVarient.Product.product_status$": 1,
        "$ProductVarient.stock$": {
          [Op.gt]: 0,
        },
      },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    if (cartItems) {
      return res.status(200).json({
        success: true,
        cartItems,
        totalItems: count,
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const { user_id, shop_id, product_varients_id, quantity } = req.query;
    const productVarient = await ProductVarients.findOne({
      where: {
        product_varients_id: product_varients_id,
      },
      include: [
        {
          model: Product,
          include: [
            {
              model: Shop,
              attributes: ["shop_id", "shop_name", "shop_status"],
            },
            {
              model: ShopRegisterFlashSales,
              include: [
                {
                  model: FlashSaleTimerFrame,
                  where: {
                    status: "active",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!productVarient) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm",
      });
    }
    if (productVarient.Product.Shop.shop_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Cửa hàng đã bị khóa không thể thêm sản phẩm vào giỏ hàng",
      });
    }
    if (productVarient.Product.product_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm đã bị khóa không thể thêm sản phẩm vào giỏ hàng",
      });
    }
    if (quantity > productVarient.stock) {
      return res.status(400).json({
        error: true,
        message: "Số lượng sản phẩm thêm vào giỏ hàng hiện không đủ",
      });
    }

    const [cartSections, createdSection] = await CartSections.findOrCreate({
      where: {
        user_id,
      },
      defaults: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const [cartShop, createdShop] = await CartShop.findOrCreate({
      where: {
        cart_id: cartSections.cart_id,
        shop_id,
      },
      defaults: {
        total_price: 0,
        total_quantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const cartItem = await CartItems.findOne({
      where: {
        cart_shop_id: cartShop.cart_shop_id,
        product_varients_id: product_varients_id,
      },
    });

    const discount_price =
      productVarient?.Product?.ShopRegisterFlashSales?.length > 0 &&
      productVarient?.Product?.ShopRegisterFlashSales[0].sold + quantity <=
        productVarient?.Product?.ShopRegisterFlashSales[0].sold.quantity
        ? productVarient?.Product?.ShopRegisterFlashSales[0].flash_sale_price
        : productVarient.discounted_price;
    if (cartItem) {
      const newQuantity = cartItem.quantity + parseInt(quantity);
      if (newQuantity > productVarient.stock) {
        return res.status(400).json({
          error: true,
          message: "Số lượng sản phẩm không đủ",
        });
      }
      const updatedCartItem = await CartItems.update(
        {
          quantity: newQuantity,
          price: parseFloat(newQuantity) * discount_price,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          where: {
            cart_item_id: cartItem.cart_item_id,
          },
        }
      );
      if (updatedCartItem) {
        return res.status(200).json({
          success: true,
          message: "Cập nhật giỏ hàng thành công",
        });
      } else {
        return res.status(500).json({
          error: true,
          message: "Cập nhật giỏ hàng thất bại",
        });
      }
    } else {
      const newCartItem = await CartItems.create({
        cart_shop_id: cartShop.cart_shop_id,
        product_varients_id,
        quantity: quantity,
        price: parseFloat(quantity) * discount_price,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (newCartItem) {
        return res.status(200).json({
          success: true,
          message: "Thêm sản phẩm vào giỏ hàng thành công",
        });
      } else {
        return res.status(500).json({
          error: true,
          message: "Thêm sản phẩm vào giỏ hàng thất bại",
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi thêm hoặc update sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const updateQuantity = async (req, res) => {
  try {
    const { cart_item_id, quantity } = req.query;
    const cartItem = await CartItems.findOne({
      where: {
        cart_item_id,
      },
    });
    if (!cartItem) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm trong giỏ hàng",
      });
    }

    const productVarient = await ProductVarients.findOne({
      where: {
        product_varients_id: cartItem.product_varients_id,
      },
      include: [
        {
          model: Product,
          include: [
            {
              model: Shop,
              attributes: ["shop_id", "shop_name", "shop_status"],
            },
          ],
        },
      ],
    });
    if (productVarient.Product.Shop.shop_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Cửa hàng đã bị khóa không thể câp nhật số lượng sản phẩm",
      });
    }
    if (productVarient.Product.product_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm đã bị khóa không thể cập nhật số lượng sản phẩm",
      });
    }

    if (quantity > productVarient.stock) {
      return res.status(400).json({
        error: true,
        message: "Số lượng sản phẩm không đủ",
      });
    }

    await cartItem.update({ quantity });

    res.status(200).json({
      success: true,
      message: "Cập nhật số lượng sản phẩm thành công",
    });
  } catch (error) {
    console.log("Lỗi khi cập nhật số lượng sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateVarients = async (req, res) => {
  try {
    const { cart_item_id, product_varients_id } = req.query;

    const cartItem = await CartItems.findOne({
      where: {
        cart_item_id,
      },
    });

    const productVarient = await ProductVarients.findOne({
      where: {
        product_varients_id,
      },
      include: [
        {
          model: Product,
          include: [
            {
              model: Shop,
              attributes: ["shop_id", "shop_name", "shop_status"],
            },
          ],
        },
      ],
    });

    if (!productVarient) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm",
      });
    }

    if (productVarient.Product.Shop.shop_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Cửa hàng đã bị khóa không thể cập nhật sản phẩm",
      });
    }
    if (productVarient.Product.product_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm đã bị khóa không thể cập nhật sản phẩm",
      });
    }

    const existingCartItem = await CartItems.findOne({
      where: {
        cart_shop_id: cartItem?.cart_shop_id,
        product_varients_id: product_varients_id,
      },
    });
    if (existingCartItem) {
      if (
        existingCartItem.quantity + cartItem?.quantity >
        productVarient.stock
      ) {
        return res.status(400).json({
          error: true,
          message: "Số lượng sản phẩm không đủ",
        });
      }
      existingCartItem.quantity += cartItem?.quantity;

      existingCartItem.updatedAt = new Date();
      await existingCartItem.save();
      await cartItem.destroy();
    } else {
      if (cartItem.quantity > productVarient.stock) {
        return res.status(400).json({
          error: true,
          message: "Số lượng sản phẩm không đủ",
        });
      }
      cartItem.update({
        product_varients_id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateSelectedAll = async (req, res) => {
  try {
    const { cart_id, selected } = req.query;
    const cartShop = await CartShop.findAll({
      where: {
        cart_id,
      },
    });
    const cartItems = await CartItems.findAll({
      where: {
        cart_shop_id: cartShop.map((item) => item.cart_shop_id),
        isOutOfStock: 0,
        "$ProductVarient.Product.product_status$": 1,
        "$ProductVarient.Product.Shop.shop_status$": 1,
      },
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
              include: [
                {
                  model: Shop,
                  attributes: ["shop_id", "shop_name", "shop_status"],
                },
              ],
            },
          ],
        },
      ],
    });
    const [affectedRows] = await CartItems.update(
      { selected },
      {
        where: {
          cart_item_id: cartItems.map((item) => item.cart_item_id),
        },
      }
    );

    if (affectedRows > 0) {
      await CartShop.update(
        { selected },
        {
          where: {
            cart_id,
          },
        }
      );
    } else if (affectedRows === 0) {
      await CartShop.update(
        { selected: 0 },
        {
          where: {
            cart_id,
            selected: 1,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật lựa chọn tất cả sản phẩm trong giỏ hàng thành công",
    });
  } catch (error) {
    console.log(
      "Lỗi khi cập nhật lựa chọn tất cả sản phẩm trong giỏ hàng: ",
      error
    );
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateAllItemsOfShop = async (req, res) => {
  try {
    const { cart_shop_id, selected } = req.query;
    const cartShop = await CartShop.findOne({
      where: {
        cart_shop_id,
      },
    });
    const cartItems = await CartItems.findAll({
      where: {
        cart_shop_id,
        isOutOfStock: 0,
        "$ProductVarient.Product.product_status$": 1,
        "$ProductVarient.Product.Shop.shop_status$": 1,
      },
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
              include: [
                {
                  model: Shop,
                  attributes: ["shop_id", "shop_name", "shop_status"],
                },
              ],
            },
          ],
        },
      ],
    });

    const [affectedRows] = await CartItems.update(
      { selected },
      {
        where: {
          cart_item_id: cartItems.map((item) => item.cart_item_id),
        },
      }
    );

    if (affectedRows > 0) {
      await cartShop.update({
        selected,
      });
    } else if (affectedRows === 0) {
      {
        await cartShop.update(
          {
            selected: 0,
          },
          {
            where: {
              selected: 1,
            },
          }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật lựa chọn tất cả sản phẩm trong giỏ hàng thành công",
    });
  } catch (error) {
    console.log(
      "Lỗi khi cập nhật lựa chọn tất cả sản phẩm trong giỏ hàng: ",
      error
    );
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const updateSelectedItem = async (req, res) => {
  try {
    const { cart_item_id, selected } = req.query;

    const cartItem = await CartItems.findOne({
      where: {
        cart_item_id,
      },
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
              include: [
                {
                  model: Shop,
                  attributes: ["shop_id", "shop_name", "shop_status"],
                },
              ],
            },
          ],
        },
      ],
    });
    if (!cartItem) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm trong giỏ hàng",
      });
    }
    if (cartItem.ProductVarient.Product.Shop.shop_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Cửa hàng đã bị khóa không thể cập nhật sản phẩm",
      });
    }
    if (cartItem.ProductVarient.Product.product_status === 0) {
      return res.status(400).json({
        error: true,
        message: "Sản phẩm đã bị khóa không thể cập nhật sản phẩm",
      });
    }
    await cartItem.update({
      selected,
    });

    const countItems = await CartItems.count({
      where: {
        cart_shop_id: cartItem.cart_shop_id,
        selected: 1,
      },
    });

    if (countItems === 0) {
      const cartShop = await CartShop.findOne({
        where: {
          cart_shop_id: cartItem.cart_shop_id,
        },
      });
      await cartShop.update({
        selected: 0,
      });
    } else {
      const cartShop = await CartShop.findOne({
        where: {
          cart_shop_id: cartItem.cart_shop_id,
        },
      });
      await cartShop.update({
        selected: 1,
      });
    }
    res.status(200).json({
      success: true,
      message: "Cập nhật lựa chọn sản phẩm thành công",
    });
  } catch (error) {
    console.log("Lỗi khi cập nhật trạng thái sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const removeAllItems = async (req, res) => {
  try {
    const { cart_id } = req.query;
    const cartSection = await CartSections.findOne({
      cart_id,
    });
    await cartSection.destroy();
    res.status(200).json({
      success: true,
      message: "Xóa tất cả sản phẩm trong giỏ hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi xóa tất cả sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const removeItem = async (req, res) => {
  try {
    const { cart_item_id } = req.query;
    const cartItem = await CartItems.findOne({
      where: {
        cart_item_id,
      },
    });
    await cartItem.destroy();
    res.status(200).json({
      success: true,
      message: "Xóa sản phẩm trong giỏ hàng thành công",
    });
  } catch (error) {
    console.log("Lỗi khi xóa sản phẩm trong giỏ hàng: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
module.exports = {
  addToCart,
  getLimitCartItems,
  getCart,
  updateVarients,
  updateQuantity,
  updateSelectedAll,
  updateAllItemsOfShop,
  updateSelectedItem,
  removeAllItems,
  removeItem,
};
