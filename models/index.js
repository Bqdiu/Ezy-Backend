const sequelize = require("../config/database");
const {
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
} = require("./Assosiations");
const syncModels = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    await sequelize.sync({ alter: true }); // Hoặc { force: true } để xóa và tạo lại bảng
    // await Role.sync();
    // await UserAccount.sync();
    // await UserAddress.sync();
    // await Category.sync();
    // await SubCategory.sync();
    // await Product.sync();
    // await Shop.sync();
    // await BusinessStyle.sync();
    // await UserOrder.sync();
    // await UserOrderDetails.sync();
    // await OrderStatus.sync();
    // await HistorySearch.sync();
    // await ProductReview.sync();
    // await CustomizeShop.sync();
    // await ProductImgs.sync();
    // await ProductVarients.sync();
    // await ProductClassify.sync();
    // await ProductSize.sync();
    // await SaleEvents.sync();
    // await DiscountVoucher.sync();
    // await SaleEventsUser.sync();
    // await SaleEventsOnCategories.sync();
    // await UserWallet.sync();
    // await WalletTransaction.sync();
    // await ShippingProvider.sync();
    // await ShippingOrder.sync();
    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = syncModels;
