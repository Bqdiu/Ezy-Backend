const sequelize = require("../config/database");

const syncModels = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    await sequelize.sync({ alter: true }); // Hoặc { force: true } để xóa và tạo lại bảng
    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = syncModels;
