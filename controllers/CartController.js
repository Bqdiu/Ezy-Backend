const { model } = require("mongoose");
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
      },
      include: [
        {
          model: Shop,
        },
        {
          model: CartItems,
          include: [
            {
              model: ProductVarients,
              include: [
                {
                  model: Product,
                },
                {
                  model: ProductClassify,
                },
                {
                  model: ProductSize,
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({
      success: true,
      cartShop,
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
    const cartItems = await CartItems.findAll({
      include: [
        {
          model: ProductVarients,
          include: [
            {
              model: Product,
            },
            {
              model: ProductClassify,
            },
          ],
          where: {
            stock: {
              [Op.gt]: 0,
            },
          },
        },
        {
          model: CartShop,
          where: {
            cart_id: cartSection.cart_id,
          },
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const totalItems = await CartItems.count({
      include: [
        {
          model: ProductVarients,
          where: {
            stock: {
              [Op.gt]: 0,
            },
          },
        },
        {
          model: CartShop,
          where: {
            cart_id: cartSection.cart_id,
          },
        },
      ],
    });

    if (cartItems) {
      return res.status(200).json({
        success: true,
        cartItems,
        totalItems,
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
    });
    if (!productVarient) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm",
      });
    }
    if (quantity > productVarient.stock) {
      return res.status(400).json({
        error: true,
        message: "Số lượng sản phẩm không đủ",
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
    console.log("cart_shop_id: ", cartShop.cart_shop_id);
    console.log("product_varients_id: ", product_varients_id);
    const cartItem = await CartItems.findOne({
      where: {
        cart_shop_id: cartShop.cart_shop_id,
        product_varients_id: product_varients_id,
      },
    });
    const discount_price =
      parseFloat(productVarient.price) *
      (1 - parseFloat(productVarient.sale_percents) / 100);
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
const increaseQuantity = async (req, res) => {};
module.exports = { addToCart, getLimitCartItems, getCart };
