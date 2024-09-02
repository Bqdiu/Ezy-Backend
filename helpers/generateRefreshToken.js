const crypto = require("crypto");

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex"); // Tạo refresh token ngẫu nhiên
};

module.exports = generateRefreshToken;
