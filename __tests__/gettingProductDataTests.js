const app = require("../app");
const supertest = require("supertest");
const request = supertest(app);
const { startServer, stopServer, deleteAll } = require("./util/inMemDb");
const Pizza = require("../models/Pizza");
const Topping = require("../models/Topping");

describe("Order handling tests", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await startServer("orderTestDatabase");
  });

  afterAll(async () => {
    await stopServer(mongoServer);
  });

  afterEach(async () => {
    await deleteAll([Pizza, Topping]);
  });

  test("/api/data should give back the data of all the pizzas and toppings when a GET request is sent", async () => {
    //given a pizza and a topping in the database
    const newPizza = new Pizza({
      name: "pizza001",
      price: 1000,
      description: "tasty",
      stock: 1000,
    });
    const savedPizza = await newPizza.save();
    const newTopping = new Topping({
      name: "topping001",
      price: 1000,
      description: "tasty",
      stock: 1000,
    });
    const savedTopping = await newTopping.save();

    //when we send a GET request to the endpoint
    const resp = await request.get("/api/data");

    //then we should get back the data of the pizza and topping
    expect(resp.status).toBe(200);
    expect(resp.body.pizza).toBeTruthy();
    expect(resp.body.pizza.length).toBe(1);
    expect(resp.body.pizza[0].name).toBe(savedPizza.name);
    expect(resp.body.topping).toBeTruthy();
    expect(resp.body.topping.length).toBe(1);
    expect(resp.body.topping[0].name).toBe(savedTopping.name);
  });
});
