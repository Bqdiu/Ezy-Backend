const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const generateRefreshToken = require("../helpers/generateRefreshToken");
const registerUser = async (req, res) => {
  try {
    const { name, username, email, phoneNumber, password, profile_pic } =
      req.body;
    const checkPhoneNumber = await UserModel.findOne({ phoneNumber });
    if (checkPhoneNumber) {
      return res.status(400).json({
        message: "Tài khoản đã tồn tại",
        error: false,
      });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const payload = await UserModel({
      name,
      phoneNumber,
      username,
      email,
      password: hashPassword,
      profile_pic,
    });

    const user = new UserModel(payload);
    const userSave = await user.save();

    return res.status(200).json({
      message: "Đăng ký thành công",
      data: userSave,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    //Check phoneNumber
    const user = await UserModel.findOne({
      $or: [
        { phoneNumber: phoneNumber },
        { username: phoneNumber },
        { email: phoneNumber },
      ],
    });
    if (!user) {
      return res.status(400).json({
        message: "Tài khoản không tồn tại",
        error: true,
      });
    }
    const hashPassword = await bcryptjs.compare(password, user.password);

    if (!hashPassword || !user) {
      return res.status(400).json({
        message: "Mật khẩu không đúng, vui lòng thử lại",
        error: true,
      });
    }
    const tokenData = {
      id: user._id,
      phoneNumber: user.phoneNumber,
    };

    const token = await jwt.sign(tokenData, process.env.JWT_SECRECT_KEY, {
      expiresIn: "1d",
    });

    const cookieOptions = {
      http: true,
      secure: true,
    };

    return res.cookie("token", token, cookieOptions).status(200).json({
      message: "Đăng nhập thành công",
      data: user,
      token: token,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};
const logout = (req, res) => {
  try {
    const cookieOptions = {
      http: true,
      secure: true,
    };
    return res.cookie("token", "", cookieOptions).status(200).json({
      message: "Đăng xuất thành công",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};
const userDetails = async (req, res) => {
  try {
    const token = req.cookies.token || "";
    const user = await getUserDetailsFromToken(token);
    return res.status(200).json({
      message: "user details",
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

const searchUser = async (req, res) => {
  try {
    const { search, currentUser } = req.body;
    const query = new RegExp(search, "i"); //i: bo qua chu hoa chu thuong

    const user = await UserModel.find({
      $and: [{ username: query }, { username: { $ne: currentUser } }],
    }).select("-password");
    return res.json({
      message: "All User",
      data: user,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

module.exports = { registerUser, loginUser, userDetails, logout, searchUser };
