const app = require("../app");
const supertest = require("supertest");
const request = supertest(app);
const mongoose = require("mongoose");

const { startServer, stopServer, deleteAll } = require("./util/inMemDb");

describe("Smoke tests", () => {
  test("Jest works", () => {
    expect(1).toBe(1);
  });

  test("Database works", async () => {
    const Cat = mongoose.model("Cat", { name: String });

    const mongoServer = await startServer("serverName");

    const kitty = new Cat({
      name: "Kitty",
    });

    await kitty.save();
    const doc = await Cat.findOne();

    expect(doc.name).toBe("Kitty");
    await deleteAll([Cat]);

    const result = await Cat.countDocuments();

    expect(result).toBe(0);
    await stopServer(mongoServer);
  });

  test("Supertest works", async () => {
    const res = await request.get("/api/test");
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("testing");
  });
});
