const express = require("express");
// const {
//   registerUser,
//   loginUser,
//   logout,
//   userDetails,
//   searchUser,
// } = require("../controllers/UserController");
const { getAllCategories } = require("../controllers/CategoryController");
const router = express.Router();

router.get("/categories", getAllCategories);
// router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.get("/user-details", userDetails);
// router.get("/logout", logout);
// router.post("/search-user", searchUser);
module.exports = router;
