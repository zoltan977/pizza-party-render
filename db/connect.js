const mongoose = require("mongoose");

const connectDb = async () => {
  const db = mongoose.connection;

  db.once("open", (_) => {
    console.log("Connected to the database");
  });

  db.on("error", (err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  });

  return db;
};

module.exports = connectDb;
