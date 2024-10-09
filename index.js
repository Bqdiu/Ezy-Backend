const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// const connectDB = require("./config/connectDB");
require("dotenv").config();
const syncModels = require("./models/index");
const router = require("./routes/index");
// const { app, server } = require("./socket/index");
const app = express();
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "Server running at " + port,
  });
});

app.use("/api", router);

syncModels().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
