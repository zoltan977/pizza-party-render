const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { google } = require("googleapis");
const oauth2Client = require("../utils/oauth2Client")();

module.exports = async function (req, res, next) {
  const authorizationHeader = req.header("Authorization");

  if (!authorizationHeader) {
    return res.status(401).json({
      msg: "Authentication error: No authorization header. Authorization denied",
    });
  }

  const token = authorizationHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ msg: "Authentication error: No token. Authorization denied" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res
      .status(401)
      .json({ msg: "Authentication error: Token is not valid" });
  }

  try {
    const userExists = await User.findOne({ email: decoded.user.email });
    if (!userExists)
      return res
        .status(401)
        .json({ msg: "Authentication error: This user has been deleted" });

    res.locals.user = decoded.user;

    if (res.locals.user.access_token) {
      oauth2Client.setCredentials({
        access_token: res.locals.user.access_token,
      });
      res.locals.user.calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ msg: "Authentication error" });
  }
};
