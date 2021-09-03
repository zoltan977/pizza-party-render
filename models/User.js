const mongoose = require("mongoose");

const ConfirmSchema = mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
});

const ResetSchema = mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
});

const CartItemSchema = mongoose.Schema({
  id: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const OrderSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  tel: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: new Date("2000-01-01"),
  },
  cart: {
    pizza: {
      type: [CartItemSchema],
    },
    topping: {
      type: [CartItemSchema],
    },
  },
});

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  photo: {
    type: String,
    default: "no-image.png",
  },
  confirmation: {
    type: ConfirmSchema,
  },
  reset: {
    type: ResetSchema,
  },
  orders: {
    type: [OrderSchema],
  },
});

module.exports = mongoose.model("user", UserSchema);
