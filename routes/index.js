const express = require("express");
// const {
//   registerUser,
//   loginUser,
//   logout,
//   userDetails,
//   searchUser,
// } = require("../controllers/UserController");
const {
  getAllCategories,
  getAllCategoriesWithSubCategories,
  getSubCategories,
} = require("../controllers/CategoryController");
const {
  getAllProducts,
  getProductDetailsByID,
  getSuggestProducts,
  getLimitSuggestProducts,
  getProductVarients,
  getAllProductsOfShop,
} = require("../controllers/ProductController");
const { getProductReview } = require("../controllers/ProductReviewController");
const {
  getAllUser,
  sellerRegister,
  checkEmailExists,
} = require("../controllers/UserController");
const { getAllRole } = require("../controllers/RoleController");
const router = express.Router();

//------------------Categories-----------------------
router.get("/categories", getAllCategories);
router.get("/categories-sub", getAllCategoriesWithSubCategories);
router.get("/sub-categories/:category_id", getSubCategories);
//------------------Shop--------------------------------
router.get("/shop-products", getAllProductsOfShop);
//------------------Products-----------------------
router.get("/products", getAllProducts);
router.get("/product-details/:id", getProductDetailsByID);
router.get("/product-varients", getProductVarients);
//-----------------ProductsReview-------------------
router.get("/product-reviews/:product_id", getProductReview);

//-----------------Suggest Products-----------------
router.get("/suggest-products-limit", getLimitSuggestProducts);
router.get("/suggest-products", getSuggestProducts);
// router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.get("/user-details", userDetails);
// router.get("/logout", logout);
// router.post("/search-user", searchUser);

//-----------------UserAccount-----------------
router.get("/all-user", getAllUser);
router.get("/check-email", checkEmailExists);
router.post("/seller-register", sellerRegister);

//-----------------Role-----------------
router.get("/all-role", getAllRole);

module.exports = router;
