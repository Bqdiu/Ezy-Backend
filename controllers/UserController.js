const { UserAccount, Role } = require("../models/Assosiations");
const { Op } = require("sequelize");
const admin = require("../firebase/firebaseAdmin");
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
        message: "User exists",
        user: user,
        email: email,
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
        message: "User exists",
        user: user,
        username: username,
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
};
