const asyncHandler = require("express-async-handler");
const UserService = require("../services/user.service");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const oauth2Client = require("../utils/oauth2Client")();

exports.userAccount = (service) =>
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userFile = req?.files?.userfile;

    const result = await UserService[service](
      req.body,
      res.locals.user,
      userFile
    );

    return res.json(result);
  });

exports.loadUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: res.locals.user.email });
  if (!user) return res.status(400).json({ msg: "Nincs ilyen felhasználó" });
  else
    return res.json({ name: user.name, photo: user.photo, email: user.email });
});

exports.getAuthInfo = asyncHandler(async (req, res) => {
  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    scope: scopes,
    prompt: "select_account",
  });

  res.json({ authUrl });
});
