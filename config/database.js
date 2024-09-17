const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ezy_ecommerce",
});

connection.connect((error) => {
  if (error) {
    console.error("Lỗi kết nối đến cơ sở dữ liệu");
    return;
  }
  console.log("Kết nối tới cơ sở dữ liệu thành công");
});

module.exports = connection;
