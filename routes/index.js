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
const router = express.Router();

//------------------Categories-----------------------
router.get("/categories", getAllCategories);
router.get("/categories-sub", getAllCategoriesWithSubCategories);
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
module.exports = router;
