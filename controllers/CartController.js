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
  UserAccount,
  SubCategory,
  Category,
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
                      model: SubCategory,
                      include: [
                        {
                          model: Category,
                        },
                      ],
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
              where: {
                stock: { [Op.gt]: 0 },
              },
            },
          ],
          order: [["updatedAt", "DESC"]],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });
    const invalidItems = await CartItems.findAll({
      where: {
        cart_shop_id: cartShop.map((item) => item.cart_shop_id),
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
              ],
            },
            {
              model: ProductClassify,
            },
            {
              model: ProductSize,
            },
          ],
          where: {
            stock: { [Op.lte]: 0 },
          },
        },
      ],
    });
    res.status(200).json({
      success: true,
      cartShop,
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
    });

    if (quantity > productVarient.stock) {
      return res.status(400).json({
        error: true,
        message: "Số lượng sản phẩm không đủ",
      });
    }

    cartItem.update({ quantity });

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
    });

    if (!productVarient) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy sản phẩm",
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
    await CartShop.update(
      {
        selected,
      },
      {
        where: {
          cart_id,
        },
      }
    );
    await CartItems.update(
      {
        selected,
      },
      {
        where: {
          cart_shop_id: cartShop.map((item) => item.cart_shop_id),
        },
      }
    );

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
    cartShop.update({
      selected,
    });

    const cartItems = await CartItems.update(
      {
        selected,
      },
      {
        where: {
          cart_shop_id,
        },
      }
    );
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
    });
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
    cartSection.destroy();
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
    cartItem.destroy();
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
