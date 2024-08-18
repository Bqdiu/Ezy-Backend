const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập vào họ tên"],
    },
    username: {
      type: String,
      required: [true, "Vui lòng nhập vào username"],
      unique: [true, "username đã tồn tại. Vui lòng thử lại"],
    },
    email: {
      type: String,
      required: [true, "Vui lòng nhập vào email"],
      unique: [true, "Email đã tồn tại. Vui lòng thử lại"],
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Vui lòng nhập một địa chỉ email hợp lệ",
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, "Vui lòng nhập vào số điện thoại"],
      minlength: [10, "Số điện thoại phải đủ 10 chữ số"],
      maxlength: [10, "Số điện thoại phải đủ 10 chữ số"],
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập vào mật khẩu"],
    },
    profile_pic: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);
const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
