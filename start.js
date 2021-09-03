require("dotenv").config();
require("./db/connect")();

const app = require("./app");

const PORT = process.env.PORT || 8000;

app.listen(PORT, function () {
  console.log("Express server listening on port ", PORT);
});
