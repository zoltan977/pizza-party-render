const asyncHandler = require("express-async-handler");
const OrderService = require("../services/order.service ");
const { validationResult } = require("express-validator");
const User = require("../models/User");

exports.order = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const response = await OrderService.order(req.body, res.locals.user);
  return res.json(response);
});

exports.orders = asyncHandler(async (req, res) => {
  const currentUser = await User.findOne({ email: res.locals.user.email });
  return res.json(currentUser.orders);
});
