const User = require("../models/User");
const Pizza = require("../models/Pizza");
const Topping = require("../models/Topping");
const mongoose = require("mongoose");

const checkingAndConvertingData = async (cart) => {
  const categories = ["pizza", "topping"];
  const cartForDatabase = {
    pizza: [],
    topping: [],
  };
  const errorsArray = [];
  let counter = 0;

  for (const category of categories) {
    if (!cart[category]) continue;
    //Loops through pizzas/toppings in the cart
    for (const key in cart[category]) {
      if (!mongoose.Types.ObjectId.isValid(key))
        throw { status: 400, msg: "Hiba a kosár adataiban" };

      counter++;

      const itemToModify =
        category === "pizza"
          ? await Pizza.findOne({ _id: key.toString() })
          : await Topping.findOne({ _id: key.toString() });

      if (!itemToModify) throw { status: 400, msg: "Hiba a kosár adataiban" };

      const parsedQuantitiy = parseInt(cart[category][key]);
      if (isNaN(parsedQuantitiy))
        throw { status: 400, msg: "Hiba a kosár adataiban" };
      if (parsedQuantitiy < 1)
        throw { status: 400, msg: "Hiba a kosár adataiban" };

      //converts the datastructure of the cart
      cartForDatabase[category].push({
        id: key,
        name: itemToModify.name,
        price: itemToModify.price,
        quantity: parsedQuantitiy,
      });

      //If stock minus ordered quantity is less than zero
      const newStock = itemToModify.stock - parseInt(cart[category][key]);
      if (newStock < 0) {
        //then put a message in the errorsArray
        errorsArray.push({
          msg: `${itemToModify.name} készlet: ${itemToModify.stock} db !`,
        });
      } else {
        //else modify the stock of the pizza
        itemToModify.stock = newStock;
        await itemToModify.save();
      }
    }
  }

  if (!counter) throw { status: 400, msg: "Üres a kosár!" };

  return { errorsArray, cartForDatabase };
};

exports.order = async (orderData, user) => {
  const { cart } = orderData;
  if (!cart) {
    throw { status: 400, msg: "Üres a kosár!" };
  }

  if (!cart.pizza && !cart.topping)
    throw { status: 400, msg: "Hiba a kosár adataiban" };

  const currentUser = await User.findOne({ email: user.email });
  if (!currentUser)
    throw { status: 400, msg: "Ezzel az emaillel nincs felhasználó" };

  const { errorsArray, cartForDatabase } = await checkingAndConvertingData(
    cart
  );

  //If there is any stock shortage then sends a message
  if (errorsArray.length) throw { status: 400, errors: errorsArray };

  //else saves the order of the user
  orderData.cart = cartForDatabase;
  orderData.date = new Date();
  currentUser.orders.push(orderData);
  await currentUser.save();
  return { success: true };
};
