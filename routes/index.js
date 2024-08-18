const express = require("express");
const {
  registerUser,
  loginUser,
  logout,
  userDetails,
  searchUser,
} = require("../controllers/UserController");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user-details", userDetails);
router.get("/logout", logout);
router.post("/search-user", searchUser);
module.exports = router;
