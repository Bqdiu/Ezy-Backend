const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

const getUserDetailsFromToken = async (token) => {
  if (!token) {
    return {
      message: "Session out",
      logout: true,
    };
  }
  try {
    const decode = await jwt.verify(token, process.env.JWT_SECRECT_KEY);
    const user = await UserModel.findById(decode.id).select("--password");
    return user;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return {
        message: "Token expired",
        logout: true,
      };
    }

    return {
      message: "Invalid token",
      logout: true,
    };
  }
};

module.exports = getUserDetailsFromToken;
