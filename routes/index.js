const express = require("express");
// const {
//   registerUser,
//   loginUser,
//   logout,
//   userDetails,
//   searchUser,
// } = require("../controllers/UserController");
const { getAllCategories } = require("../controllers/CategoryController");
const {
  getAllProducts,
  getProductDetailsByID,
  getSuggestProducts,
  getLimitSuggestProducts,
} = require("../controllers/ProductController");
const router = express.Router();

//Categories
router.get("/categories", getAllCategories);

//Products
router.get("/products", getAllProducts);
router.get("/product-details/:id", getProductDetailsByID);
//-----------------Suggest Products-----------------
router.get("/suggest-products-limit", getLimitSuggestProducts);
router.get("/suggest-products", getSuggestProducts);
// router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.get("/user-details", userDetails);
// router.get("/logout", logout);
// router.post("/search-user", searchUser);
module.exports = router;
