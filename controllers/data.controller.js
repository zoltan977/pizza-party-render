const asyncHandler = require("express-async-handler");
const Pizza = require("../models/Pizza");
const Topping = require("../models/Topping");

exports.data = asyncHandler(async (req, res) => {
  const pizza = await Pizza.find();
  const topping = await Topping.find();

  return res.json({ pizza, topping });
});
