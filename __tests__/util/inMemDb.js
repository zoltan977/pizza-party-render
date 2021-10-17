const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const startServer = async (serverName) => {
  const mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    dbName: serverName,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  return mongoServer;
};

const stopServer = async (mongoServer) => {
  await mongoose.connection.close();
  await mongoose.disconnect();
  await mongoServer.stop();
};

const deleteAll = async (models) => {
  const deletions = models.map((model) => model.deleteMany());

  await Promise.all(deletions);
};

module.exports = {
  startServer,
  stopServer,
  deleteAll,
};
