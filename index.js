const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const syncModels = require("./models/index");
const router = require("./routes/index");
const { app, server } = require("./socket/index");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "Server running at " + port,
  });
});

app.use("/api", router);

syncModels().then(() => {
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
