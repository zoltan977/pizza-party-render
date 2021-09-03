const mongoose = require("mongoose");

const TableSchema = mongoose.Schema({
  data: {},
});

module.exports = mongoose.model("table", TableSchema);
