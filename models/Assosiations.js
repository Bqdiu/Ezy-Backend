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
const ImgCustomizeShop = require("./ImgCustomizeShop");
const CartSections = require("./CartSections");
const CartShop = require("./CartShop");
const CartItems = require("./CartItems");
const PaymentMethod = require("./PaymentMethod");
const OrderStatusHistory = require("./OrderStatusHistory");
const DiscountVoucherType = require("./DiscountVoucherType");
const ShopRegisterEvents = require("./ShopRegisterEvents");
const FlashSales = require("./FlashSales");
const ShopRegisterFlashSales = require("./ShopRegisterFlashSales");
const Notifications = require("./Notifications");
const RequestSupports = require("./RequestSupports");
const ReturnRequest = require("./ReturnRequest");
const Violations = require("./Violations");

const ViolationHistory = require("./ViolationHistory");
const ViolationTypes = require("./ViolationTypes");
const ViolationImgs = require("./ViolationImgs");
const ReturnReason = require("./ReturnReason");
const ReturnType = require("./ReturnType");
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

SaleEvents.hasMany(ShopRegisterEvents, { foreignKey: "sale_events_id" });
ShopRegisterEvents.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

Shop.hasMany(ShopRegisterEvents, { foreignKey: "shop_id" });
ShopRegisterEvents.belongsTo(Shop, { foreignKey: "shop_id" });

DiscountVoucherType.hasMany(DiscountVoucher, {
  foreignKey: "discount_voucher_type_id",
});
DiscountVoucher.belongsTo(DiscountVoucherType, {
  foreignKey: "discount_voucher_type_id",
});

UserAccount.hasMany(SaleEventsUser, { foreignKey: "user_id" });
SaleEventsUser.belongsTo(UserAccount, { foreignKey: "user_id" });

SaleEvents.hasMany(SaleEventsUser, { foreignKey: "sale_events_id" });
SaleEventsUser.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

SaleEvents.hasMany(SaleEventsOnCategories, { foreignKey: "sale_events_id" });
SaleEventsOnCategories.belongsTo(SaleEvents, { foreignKey: "sale_events_id" });

Category.hasMany(SaleEventsOnCategories, { foreignKey: "category_id" });
SaleEventsOnCategories.belongsTo(Category, { foreignKey: "category_id" });

UserAccount.hasOne(UserWallet, { foreignKey: "user_id" });
UserWallet.belongsTo(UserAccount, { foreignKey: "user_id" });

UserWallet.hasMany(WalletTransaction, { foreignKey: "user_wallet_id" });
WalletTransaction.belongsTo(UserWallet, { foreignKey: "user_wallet_id" });

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

FlashSales.hasMany(ShopRegisterFlashSales, { foreignKey: "flash_sales_id" });
ShopRegisterFlashSales.belongsTo(FlashSales, { foreignKey: "flash_sales_id" });

Shop.hasMany(ShopRegisterFlashSales, { foreignKey: "shop_id" });
ShopRegisterFlashSales.belongsTo(Shop, { foreignKey: "shop_id" });

Product.hasMany(ShopRegisterFlashSales, { foreignKey: "product_id" });
ShopRegisterFlashSales.belongsTo(Product, { foreignKey: "product_id" });

UserAccount.hasMany(Notifications, { foreignKey: "user_id" });
Notifications.belongsTo(UserAccount, { foreignKey: "user_id" });

UserAccount.hasMany(RequestSupports, { foreignKey: "requestor_id" });
RequestSupports.belongsTo(UserAccount, { foreignKey: "requestor_id" });

UserAccount.hasMany(ReturnRequest, { foreignKey: "user_id" });
ReturnRequest.belongsTo(UserAccount, { foreignKey: "user_id" });

ReturnReason.hasMany(ReturnRequest, { foreignKey: "return_reason_id" });
ReturnRequest.belongsTo(ReturnReason, { foreignKey: "return_reason_id" });

Shop.hasMany(ReturnRequest, { foreignKey: "shop_id" });
ReturnRequest.belongsTo(Shop, { foreignKey: "shop_id" });

UserOrder.hasOne(ReturnRequest, { foreignKey: "user_order_id" });
ReturnRequest.belongsTo(UserOrder, { foreignKey: "user_order_id" });

UserAccount.hasMany(Violations, { foreignKey: "user_id" });
Violations.belongsTo(UserAccount, { foreignKey: "user_id" });

ViolationTypes.hasMany(Violations, { foreignKey: "violation_type_id" });
Violations.belongsTo(ViolationTypes, { foreignKey: "violation_type_id" });

Violations.hasMany(ViolationImgs, { foreignKey: "violation_id" });
ViolationImgs.belongsTo(Violations, { foreignKey: "violation_id" });

UserAccount.hasMany(ViolationHistory, { foreignKey: "violator_id" });
ViolationHistory.belongsTo(UserAccount, { foreignKey: "violator_id" });

UserOrder.belongsTo(OrderStatus, { foreignKey: "order_status_id" });
UserOrder.belongsTo(Shop, { foreignKey: "shop_id" });

UserAccount.hasMany(UserOrder, { foreignKey: "user_id" });
UserOrder.belongsTo(UserAccount, { foreignKey: "user_id" });
ReturnType.hasMany(ReturnRequest, { foreignKey: "return_type_id" });
ReturnRequest.belongsTo(ReturnType, { foreignKey: "return_type_id" });

UserOrder.hasMany(ProductReview, { foreignKey: "user_order_id" });
ProductReview.belongsTo(UserOrder, { foreignKey: "user_order_id" });

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
  ShopRegisterEvents,
  DiscountVoucher,
  DiscountVoucherType,
  SaleEventsUser,
  SaleEventsOnCategories,
  UserWallet,
  WalletTransaction,
  CartItems,
  ImgCustomizeShop,
  CartSections,
  CartShop,
  PaymentMethod,
  FlashSales,
  ShopRegisterFlashSales,
  Notifications,
  RequestSupports,
  ReturnRequest,
  Violations,

  ViolationHistory,
  ViolationImgs,
  ViolationTypes,
  ReturnReason,
};
