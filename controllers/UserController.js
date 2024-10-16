const { UserAccount, Role } = require("../models/Assosiations");
const { Op } = require("sequelize");
const admin = require("../firebase/firebaseAdmin");
const bcryptjs = require("bcryptjs");
const getAllUser = async (req, res) => {
  try {
    const users = await UserAccount.findAll({
      attributes: {
        exclude: ["password"],
      },
      include: [
        {
          model: Role,
        },
      ],
    });
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const checkEmailExists = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }
  try {
    const user = await UserAccount.findOne({
      where: {
        email: email,
      },
      attributes: {
        exclude: ["password"],
      },
    });
    console.log("User:", user);
    if (user) {
      return res.status(200).json({
        success: true,
        message: "User exists",
        user: user,
        email: email,
      });
    } else {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message || "An unexpected error occurred",
    });
  }
};
const checkUsernameExists = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res
      .status(400)
      .json({ error: true, message: "Username is required" });
  }
  try {
    const user = await UserAccount.findOne({
      where: {
        username: username,
      },
      attributes: {
        exclude: ["password"],
      },
    });
    console.log("User:", user);
    if (user) {
      return res.status(200).json({
        success: true,
        message: "User exists",
        user: user,
        username: username,
      });
    } else {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message || "An unexpected error occurred",
    });
  }
};

const checkUser = async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res
      .status(400)
      .json({ error: true, message: "user_id is required" });
  }
  try {
    const user = await UserAccount.findOne({
      where: {
        user_id: user_id,
      },
      attributes: {
        exclude: ["password"],
      },
    });
    console.log("User:", user);
    if (user) {
      return res.status(200).json({
        message: "User exists",
        user: user,
        user_id: user_id,
      });
    } else {
      return res.status(404).json({
        message: "User not found",
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message || "An unexpected error occurred",
    });
  }
};

const sellerRegister = async (req, res) => {
  const {
    user_id,
    username,
    fullname,
    email,
    phoneNumber = null,
    gender = null,
    dob = null,
    isVerified = 0,
    avtUrl = null,
  } = req.body;

  console.log("Request body:", req.body);

  if (!email || !username || !fullname) {
    return res.status(400).json({
      error: true,
      message: "All fields are required.",
    });
  }

  try {
    const userExists = await UserAccount.findOne({
      where: {
        [Op.or]: [{ email: email }, { username: username }],
      },
    });

    if (userExists) {
      return res.status(400).json({
        error: true,
        message: "User already exists",
      });
    }

    const role_id = 2; // seller role

    const newUser = await UserAccount.create({
      user_id,
      username,
      full_name: fullname,
      email,
      phone_number: phoneNumber,
      gender,
      dob,
      role_id,
      avt_url: avtUrl,
      isVerified,
    });

    res.status(201).json({
      success: true,
      user: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const buyerRegister = async (req, res) => {
  const {
    user_id,
    username,
    fullname,
    email,
    phoneNumber = null,
    gender = null,
    dob = null,
    isVerified = 0,
    avtUrl = null,
  } = req.body;

  console.log("Request body:", req.body);

  if (!email || !username || !fullname) {
    return res.status(400).json({
      error: true,
      message: "All fields are required.",
    });
  }

  try {
    const userExists = await UserAccount.findOne({
      where: {
        [Op.or]: [{ email: email }, { username: username }],
      },
    });

    if (userExists) {
      return res.status(400).json({
        error: true,
        message: "User already exists",
      });
    }

    const role_id = 1; // buyer role

    const newUser = await UserAccount.create({
      user_id,
      username,
      full_name: fullname,
      email,
      phone_number: phoneNumber,
      gender,
      dob,
      role_id,
      avt_url: avtUrl,
      isVerified,
    });

    res.status(201).json({
      success: true,
      user: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const findUserByEmailOrUsername = async (req, res) => {
  const { identifier } = req.body;

  try {
    const isEmail = identifier.includes("@");
    let user;
    if (isEmail) {
      user = await UserAccount.findOne({
        attributes: {
          exclude: ["password"],
        },
        where: {
          email: identifier,
        },
      });
    } else {
      user = await UserAccount.findOne({
        attributes: {
          exclude: ["password"],
        },
        where: {
          username: identifier,
        },
      });
    }
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "Username or email not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error finding user by email or username:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getUserData = async (req, res) => {
  try {
    const uid = req.user.user_id;
    console.log("UID:", uid);
    const user = await UserAccount.findOne({
      attributes: {
        exclude: ["password"],
      },
      where: {
        user_id: uid,
      },
    });
    if (user) {
      res.status(200).json({
        success: true,
        user: user,
      });
    } else {
      res.status(404).json({
        error: true,
        message: "User not found",
      });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const logOut = async (req, res) => {
  try {
    const uid = req.user.user_id;
    await admin.auth().revokeRefreshTokens(uid);
    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateSetupStatus = async (req, res) => {
  const { user_id } = req.body;
  try {
    const user = await UserAccount.findOne({
      attributes: {
        exclude: ["password"],
      },
      where: {
        user_id: user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    user.setup = 1;
    await user.save();
    res.status(200).json({
      success: true,
      message: "User setup status updated successfully",
    });
  } catch (error) {
    console.error("Error updating user setup status:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { user_id, full_name, phone_number, gender, dob, avt_url } = req.body;

    const user = await UserAccount.findOne({
      where: {
        user_id: user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const result = await user.update({
      full_name,
      phone_number,
      gender,
      dob,
      avt_url,
    });

    if (result) {
      return res.status(200).json({
        success: true,
        data: user,
        message: "Cập nhật thông tin thành công",
      });
    }
  } catch (error) {
    console.log("Error updating profile:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const registerOTP = async (req, res) => {
  try {
    const { user_id, otp } = req.body;
    const user = await UserAccount.findOne({
      where: {
        user_id: user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const hashedPassword = await bcryptjs.hash(otp, 10);

    const result = await user.update({
      security_password: hashedPassword,
    });

    if (result) {
      return res.status(200).json({
        success: true,
        data: user,
        message: "Đăng ký Mật Khẩu Cấp 2 thành công",
      });
    }
  } catch (error) {
    console.log("Lỗi khi đăng ký OTP: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const checkOTP = async (req, res) => {
  try {
    const { user_id, otp } = req.body;
    const user = await UserAccount.findOne({
      where: {
        user_id: user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }
    const isMatch = await bcryptjs.compare(otp, user.security_password);
    if (isMatch) {
      return res.status(200).json({
        success: true,
        data: user,
        message: "Xác thực Mật Khẩu Cấp 2 Thành Công",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu Cấp 2 không chính xác",
      });
    }
  } catch (error) {
    console.log("Lỗi khi kiểm tra OTP: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateEmail = async (req, res) => {
  const { user_id, email } = req.body;
  try {
    const user = await UserAccount.findOne({
      where: {
        user_id: user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }
    await user.update({
      email,
    });
    return res.status(200).json({
      success: true,
      data: user,
      message: "Cập nhật email thành công",
    });
  } catch (error) {
    console.log("Lỗi update email:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

module.exports = {
  getAllUser,
  checkEmailExists,
  checkUsernameExists,
  sellerRegister,
  buyerRegister,
  checkUser,
  getUserData,
  logOut,
  findUserByEmailOrUsername,
  updateSetupStatus,
  updateProfile,
  registerOTP,
  checkOTP,
  updateEmail,
};
