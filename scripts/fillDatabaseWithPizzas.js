const fs = require("fs");
const Pizza = require("../models/Pizza");
const Topping = require("../models/Topping");
const mongoose = require("mongoose");

const deleteAll = async (models) => {
  const deletions = models.map((model) => model.deleteMany());

  await Promise.all(deletions);
};

const connectDb = async () => {
  const db = mongoose.connection;

  db.once("open", (_) => {
    console.log("Connected to the database");
  });

  db.on("error", (err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

  await mongoose.connect(
    "mongodb+srv://mzoltan778:mezo1977@cluster0.66kqt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    }
  );

  return db;
};

const jsonFilePath = "./data.json";

let jsonData;
try {
  let data = fs.readFileSync(jsonFilePath);
  jsonData = JSON.parse(data);
} catch (err) {
  console.error(err);
}

const pizzaArray = jsonData.pizza;
const toppingArray = jsonData.topping;

const fill = async () => {
  await connectDb();

  await deleteAll([Pizza, Topping]);

  for (const p of pizzaArray) {
    delete p.id;
    const newPizza = new Pizza({ ...p });
    await newPizza.save();
  }

  for (const t of toppingArray) {
    delete t.id;
    const newTopping = new Topping({ ...t });
    await newTopping.save();
  }

  process.exit(0);
};

fill();
