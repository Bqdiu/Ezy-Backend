const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "provide name"],
    },
    phoneNumber: {
      type: String,
      required: [true, "provide Number Phone"],
      minlength: [10, "Phone number must be exactly 10 digits"],
      maxlength: [10, "Phone number must be exactly 10 digits"],
    },
    password: {
      type: String,
      required: [true, "provide password"],
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
