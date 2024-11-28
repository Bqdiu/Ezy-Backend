const {
  UserAccount,
  Role,
  UserAddress,
  UserWallet,
  Shop,
  SaleEventsUser,
  SaleEvents,
} = require("../models/Assosiations");
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
    await UserWallet.create({
      user_id: newUser.user_id,
      created_at: new Date(),
      updated_at: new Date(),
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
    await UserWallet.create({
      user_id: newUser.user_id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const activeEvents = await SaleEvents.findAll({
      where: {
        is_actived: true,
        started_at: {
          [Op.lte]: new Date(), // Thời gian bắt đầu <= ngày hiện tại
        },
        ended_at: {
          [Op.gt]: new Date(), // Thời gian kết thúc > ngày hiện tại
        },
      },
    });
    console.log("Active events:", activeEvents);

    if (activeEvents.length > 0) {
      const eventUserPairs = activeEvents.map((event) => ({
        user_id: newUser.user_id,
        sale_events_id: event.sale_events_id,
      }));
      console.log("Event user pairs:", eventUserPairs);

      await SaleEventsUser.bulkCreate(eventUserPairs);
    }

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

    // const firebaseUser = await admin.auth().getUserByEmail(user.email);

    // // Lấy danh sách các provider đã liên kết
    // const providerData = firebaseUser.providerData;

    // if (providerData.length === 0) {
    //   console.log("Không có provider nào liên kết với tài khoản này.");
    // } else {
    //   console.log("Các provider liên kết với tài khoản:", providerData);
    // }

    // // Kiểm tra email hiện tại
    // console.log("Email hiện tại của người dùng:", firebaseUser.email);

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

const getUserDataByUserId = async (req, res) => {
  try {
    const { user_id } = req.query;
    const user = await UserAccount.findOne({
      where: { user_id: user_id },
      include: [
        {
          model: Shop,
        },
      ],
    });
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "Không tìm thấy người dùng",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
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
    const emailHistory = user.email_history
      ? user.email_history.split(",")
      : [];
    emailHistory.push(user.email);

    await user.update({
      email_history: emailHistory.join(","),
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

const getAddresses = async (req, res) => {
  try {
    const { user_id } = req.query;
    const addresses = await UserAddress.findAll({
      where: {
        user_id,
      },
      order: [["isDefault", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.log("Lỗi khi lấy địa chỉ: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const addAddress = async (req, res) => {
  let {
    user_id,
    full_name,
    phone_number,
    province_id,
    district_id,
    ward_code,
    address,
    isDefault,
  } = req.body;
  try {
    const user = await UserAccount.findOne({
      where: {
        user_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }
    const userAddress = await UserAddress.count({
      where: {
        user_id,
        isDefault: 1,
      },
    });
    console.log("User Address:", userAddress);
    if (userAddress === 0) {
      isDefault = 1;
    } else {
      if (isDefault === 1) {
        if (userAddress === 1) {
          await UserAddress.update(
            {
              isDefault: 0,
            },
            {
              where: {
                user_id,
              },
            }
          );
        }
      }
    }

    console.log("Is Default:", isDefault);
    const result = await UserAddress.create({
      user_id,
      full_name,
      phone_number,
      province_id,
      district_id,
      ward_code,
      address,
      isDefault,
    });
    if (result) {
      return res.status(200).json({
        success: true,
        data: result,
        message: "Thêm địa chỉ thành công",
      });
    }
  } catch (error) {
    console.log("Lỗi khi thêm địa chỉ: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const {
      user_address_id,
      full_name,
      phone_number,
      province_id,
      district_id,
      ward_code,
      address,
      isDefault,
    } = req.body;
    const userAddress = await UserAddress.findOne({
      where: {
        user_address_id,
      },
    });
    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ",
      });
    }
    if (isDefault === 1) {
      await UserAddress.update(
        {
          isDefault: 0,
        },
        {
          where: {
            user_id: userAddress.user_id,
            user_address_id: {
              [Op.ne]: user_address_id,
            },
          },
        }
      );
    }
    const result = await userAddress.update({
      full_name,
      phone_number,
      province_id,
      district_id,
      ward_code,
      address,
      isDefault,
    });
    if (result) {
      return res.status(200).json({
        success: true,
        data: result,
        message: "Cập nhật địa chỉ thành công",
      });
    }
  } catch (error) {
    console.log("Lỗi khi cập nhật địa chỉ: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const { user_address_id, user_id } = req.body;
    const userAddress = await UserAddress.findOne({
      where: {
        user_address_id,
      },
    });
    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ",
      });
    }
    await UserAddress.update(
      {
        isDefault: 0,
      },
      {
        where: {
          user_id,
          user_address_id: {
            [Op.ne]: user_address_id,
          },
        },
      }
    );
    const result = await userAddress.update({
      isDefault: 1,
    });
    if (result) {
      return res.status(200).json({
        success: true,
        data: result,
        message: "Cập nhật địa chỉ mặc định thành công",
      });
    }
  } catch (error) {
    console.log("Lỗi khi cập nhật địa chỉ mặc định: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
const removeAddress = async (req, res) => {
  try {
    const { user_address_id } = req.body;
    const address = await UserAddress.findOne({
      where: {
        user_address_id,
      },
    });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ",
      });
    }
    await address.destroy();
    return res.status(200).json({
      success: true,
      message: "Xóa địa chỉ thành công",
    });
  } catch (error) {
    console.log("Lỗi khi xóa địa chỉ: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const getDefaultAddress = async (req, res) => {
  try {
    const { user_id } = req.query;
    const address = await UserAddress.findOne({
      where: {
        user_id: user_id,
        isDefault: 1,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ mặc định",
      });
    }
    return res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    console.log("Lỗi khi lấy địa chỉ mặc định: ", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};

const createUser = async (req, res) => {
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
    role_id,
  } = req.body;

  console.log("Request body:", req.body);

  // Kiểm tra các trường bắt buộc
  if (!email || !username || !fullname || !role_id) {
    return res.status(400).json({
      error: true,
      message: "Email, username, fullname và role_id là bắt buộc.",
    });
  }

  try {
    // Kiểm tra xem user đã tồn tại chưa
    const userExists = await UserAccount.findOne({
      where: {
        [Op.or]: [{ email: email }, { username: username }],
      },
    });

    if (userExists) {
      return res.status(400).json({
        error: true,
        message: "User đã tồn tại.",
      });
    }

    // Tạo user mới
    const newUser = await UserAccount.create({
      user_id,
      username,
      full_name: fullname,
      email,
      phone_number: phoneNumber,
      gender,
      dob,
      role_id, // Vai trò được truyền từ request
      avt_url: avtUrl,
      isVerified,
    });

    // Tạo ví cho user
    await UserWallet.create({
      user_id: newUser.user_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json({
      success: true,
      user: newUser,
      message: "User được tạo thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi tạo user:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Đã xảy ra lỗi.",
    });
  }
};

const lockAccount = async (req, res) => {
  const { user_id } = req.body;

  try {
      // Fetch user information
      const user = await UserAccount.findOne({ where: { user_id } });
      if (!user) {
          return res.status(404).json({ success: false, message: "User not found." });
      }

      // Update user's status to banned
      user.is_banned = 1;
      await user.save();

      if (user.role_id === 2) {
          const shop = await Shop.findOne({ where: { user_id: user_id } });
          if (shop) {
              shop.shop_status = 0; // Assuming `is_active` denotes shop status
              await shop.save();
              console.log(`Shop status for owner ${user_id} updated successfully.`);
          } else {
              console.warn(`No shop found for owner ID: ${user_id}`);
          }
      }

      // Disable the user in Firebase
      try {
          await admin.auth().updateUser(user.user_id, { disabled: true });
          console.log(`Firebase user ${user.user_id} has been disabled.`);
      } catch (firebaseError) {
          console.error("Error disabling Firebase user:", firebaseError.message);
          return res.status(500).json({ success: false, message: "Error disabling user on Firebase." });
      }

      res.status(200).json({
          success: true,
          message: "User account locked successfully.",
      });
  } catch (error) {
      console.error("Error locking account:", error);
      res.status(500).json({
          success: false,
          message: "An error occurred while locking the account.",
      });
  }
};

const unlockAccount = async (req, res) => {
  const { user_id } = req.body;

  try {
    // Fetch user information
    const user = await UserAccount.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Update user's status to active
    user.is_banned = 0;
    await user.save();

    // If the user is a shop owner, update their shop status
    if (user.role_id === 2) {
      const shop = await Shop.findOne({ where: { user_id: user_id } });
      if (shop) {
        shop.shop_status = 1; // Assuming `is_active` denotes shop status
        await shop.save();
        console.log(`Shop status for owner ${user_id} updated successfully.`);
      } else {
        console.warn(`No shop found for owner ID: ${user_id}`);
      }
    }

    // Enable the user in Firebase
    try {
      await admin.auth().updateUser(user.user_id, { disabled: false });
      console.log(`Firebase user ${user.user_id} has been enabled.`);
    } catch (firebaseError) {
      console.error("Error enabling Firebase user:", firebaseError.message);
      return res.status(500).json({ success: false, message: "Error enabling user on Firebase." });
    }

    res.status(200).json({
      success: true,
      message: "User account unlocked successfully.",
    });
  } catch (error) {
    console.error("Error unlocking account:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while unlocking the account.",
    });
  }
};

const adminUpdateProfile = async (req, res) => {
  try {
    const { user_id, full_name, phone_number, gender, dob, avt_url, role_id } = req.body;

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
      role_id,
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
  getAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
  getDefaultAddress,
  getUserDataByUserId,
  createUser,
  lockAccount,
  unlockAccount,
  adminUpdateProfile
};
