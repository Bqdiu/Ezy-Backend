const admin = require("../firebase/firebaseAdmin");

const authenticate = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: true,
        message: "Authorization header is missing",
      });
    }
    const token = req.headers.authorization.split(" ")[1];

    //Check token is missing
    if (!token) {
      return res.status(401).json({
        error: true,
        message: "Token is missing",
      });
    }

    //Verifiy token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: true,
      message: error.message || error,
    });
  }
};
module.exports = authenticate;
