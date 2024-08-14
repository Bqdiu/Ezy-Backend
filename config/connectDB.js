const mongoose = require("mongoose");
async function connectDB() {
  try {
    //connect to MONGODB URL
    await mongoose.connect(process.env.MONGODB_URL);
    //get connection
    const connection = mongoose.connection;

    //if connected
    connection.on("connected", () => console.log("Connect to DB"));
    //else
    connection.on("error", () => console.log("Something is wrong in MongoDB"));
  } catch (error) {
    console.log("Something is wrong", error);
  }
}

module.exports = connectDB;
