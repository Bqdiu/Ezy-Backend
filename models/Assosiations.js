const UserAccount = require("./UserAccount");
const UserAddress = require("./UserAddress");
const Role = require("./Role");
const Category = require("./Category");
const SubCategory = require("./SubCategory");
const Product = require("./Product");
const Shop = require("./Shop");
const BusinessStyle = require("./BusinessStyle");
const UserOrder = require("./UserOrder");
const UserOrderDetails = require("./UserOrderDetails");
const OrderStatus = require("./OrderStatus");
const HistorySearch = require("./HistorySearch");
const ProductReview = require("./ProductReview");
const CustomizeShop = require("./CustomizeShop");
const ProductImgs = require("./ProductImgs");
const ProductVarients = require("./ProductVarients");
const ProductClassify = require("./ProductClassify");
const ProductSize = require("./ProductSize");
const SaleEvents = require("./SaleEvents");
const DiscountVoucher = require("./DiscountVoucher");
const SaleEventsUser = require("./SaleEventsUser");
const SaleEventsOnCategories = require("./SaleEventsOnCategories");
const UserWallet = require("./UserWallet");
const WalletTransaction = require("./WalletTransaction");
const ShippingProvider = require("./ShippingProvider");
const ShippingOrder = require("./ShippingOrder");
const ImgCustomizeShop = require("./ImgCustomizeShop");
const CartSections = require("./CartSections");
const CartShop = require("./CartShop");
const CartItems = require("./CartItems");
const PaymentMethod = require("./PaymentMethod");
const OrderStatusHistory = require("./OrderStatusHistory");
// Thiết lập mối quan hệ
UserAccount.hasMany(UserAddress, { foreignKey: "user_id" });
UserAddress.belongsTo(UserAccount, { foreignKey: "user_id" });

UserAccount.belongsTo(Role, { foreignKey: "role_id" });
UserAccount.hasOne(Shop, { foreignKey: "user_id" });
Shop.belongsTo(UserAccount, { foreignKey: "user_id" });
Role.hasMany(UserAccount, { foreignKey: "role_id" });

Category.hasMany(SubCategory, { foreignKey: "category_id" });
SubCategory.belongsTo(Category, { foreignKey: "category_id" });

SubCategory.hasMany(Product, { foreignKey: "sub_category_id" });
Product.belongsTo(SubCategory, { foreignKey: "sub_category_id" });

Shop.hasMany(Product, { foreignKey: "shop_id" });
Product.belongsTo(Shop, { foreignKey: "shop_id" });

Shop.belongsTo(BusinessStyle, { foreignKey: "business_style_id" });
BusinessStyle.hasMany(Shop, { foreignKey: "business_style_id" });

UserOrder.hasMany(UserOrderDetails, { foreignKey: "user_order_id" });
UserOrderDetails.belongsTo(UserOrder, { foreignKey: "user_order_id" });

UserOrder.hasMany(OrderStatusHistory, { foreignKey: "user_order_id" });
OrderStatusHistory.belongsTo(UserOrder, { foreignKey: "user_order_id" });

OrderStatus.hasMany(OrderStatusHistory, { foreignKey: "order_status_id" });
OrderStatusHistory.belongsTo(OrderStatus, { foreignKey: "order_status_id" });

UserAccount.hasMany(HistorySearch, { foreignKey: "user_id" });
HistorySearch.belongsTo(UserAccount, { foreignKey: "user_id" });

SubCategory.hasMany(HistorySearch, { foreignKey: "sub_category_id" });
HistorySearch.belongsTo(SubCategory, { foreignKey: "sub_category_id" });

UserAccount.hasMany(ProductReview, { foreignKey: "user_id" });
ProductReview.belongsTo(UserAccount, { foreignKey: "user_id" });

Shop.hasMany(CustomizeShop, { foreignKey: "shop_id" });
CustomizeShop.belongsTo(Shop, { foreignKey: "shop_id" });

CustomizeShop.hasMany(ImgCustomizeShop, { foreignKey: "customize_shop_id" });
ImgCustomizeShop.belongsTo(CustomizeShop, { foreignKey: "customize_shop_id" });

Product.hasMany(ProductImgs, { foreignKey: "product_id" });
ProductImgs.belongsTo(Product, { foreignKey: "product_id" });

Product.hasMany(ProductVarients, { foreignKey: "product_id" });
ProductVarients.belongsTo(Product, { foreignKey: "product_id" });

ProductVarients.hasMany(UserOrderDetails, {
  foreignKey: "product_varients_id",
});
UserOrderDetails.belongsTo(ProductVarients, {
  foreignKey: "product_varients_id",
});

Product.hasMany(ProductClassify, { foreignKey: "product_id" });
ProductClassify.belongsTo(Product, { foreignKey: "product_id" });

Product.hasMany(ProductSize, { foreignKey: "product_id" });
ProductSize.belongsTo(Product, { foreignKey: "product_id" });

ProductSize.hasMany(ProductVarients, { foreignKey: "product_size_id" });
ProductVarients.belongsTo(ProductSize, { foreignKey: "product_size_id" });

ProductClassify.hasMany(ProductVarients, { foreignKey: "product_classify_id" });
ProductVarients.belongsTo(ProductClassify, {
  foreignKey: "product_classify_id",
});

ProductVarients.hasMany(ProductReview, { foreignKey: "product_varients_id" });
ProductReview.belongsTo(ProductVarients, { foreignKey: "product_varients_id" });

SaleEvents.hasMany(DiscountVoucher, { foreignKey: "sale_events_id" });
DiscountVoucher.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

UserAccount.hasMany(SaleEventsUser, { foreignKey: "user_id" });
SaleEventsUser.belongsTo(UserAccount, { foreignKey: "user_id" });

SaleEvents.hasMany(SaleEventsUser, { foreignKey: "sale_events_id" });
SaleEventsUser.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

SaleEvents.hasMany(SaleEventsOnCategories, { foreignKey: "sale_events_id" });
SaleEventsOnCategories.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

Category.hasMany(SaleEventsOnCategories, { foreignKey: "category_id" });
SaleEventsOnCategories.belongsTo(Category, { foreignKey: "category_id" });

UserAccount.hasMany(UserWallet, { foreignKey: "user_id" });
UserWallet.belongsTo(UserAccount, { foreignKey: "user_id" });

UserWallet.hasMany(WalletTransaction, { foreignKey: "user_wallet_id" });
WalletTransaction.belongsTo(UserWallet, { foreignKey: "user_wallet_id" });

ShippingProvider.hasMany(ShippingOrder, { foreignKey: "provider_id" });
ShippingOrder.belongsTo(ShippingProvider, { foreignKey: "provider_id" });

UserOrder.hasMany(ShippingOrder, { foreignKey: "user_order_id" });
ShippingOrder.belongsTo(UserOrder, { foreignKey: "user_order_id" });
Shop.hasMany(ShippingOrder, { foreignKey: "shop_id" });
ShippingOrder.belongsTo(Shop, { foreignKey: "shop_id" });

UserAccount.hasOne(CartSections, { foreignKey: "user_id" });
CartSections.belongsTo(UserAccount, { foreignKey: "user_id" });
CartSections.hasMany(CartShop, { foreignKey: "cart_id" });
CartShop.belongsTo(CartSections, { foreignKey: "cart_id" });
CartShop.belongsTo(Shop, { foreignKey: "shop_id" });

CartShop.hasMany(CartItems, { foreignKey: "cart_shop_id" });
CartItems.belongsTo(CartShop, { foreignKey: "cart_shop_id" });
CartItems.belongsTo(ProductVarients, { foreignKey: "product_varients_id" });

PaymentMethod.hasMany(UserOrder, { foreignKey: "payment_method_id" });
UserOrder.belongsTo(PaymentMethod, { foreignKey: "payment_method_id" });

module.exports = {
  UserAccount,
  UserAddress,
  Role,
  Category,
  SubCategory,
  Product,
  Shop,
  BusinessStyle,
  UserOrder,
  UserOrderDetails,
  OrderStatusHistory,
  OrderStatus,
  HistorySearch,
  ProductReview,
  CustomizeShop,
  ProductImgs,
  ProductVarients,
  ProductClassify,
  ProductSize,
  SaleEvents,
  DiscountVoucher,
  SaleEventsUser,
  SaleEventsOnCategories,
  UserWallet,
  WalletTransaction,
  ShippingProvider,
  ShippingOrder,
  CartItems,
  ImgCustomizeShop,
  CartSections,
  CartShop,
  PaymentMethod,
};
