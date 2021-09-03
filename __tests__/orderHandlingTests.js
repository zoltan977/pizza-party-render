const app = require("../app");
const supertest = require("supertest");
const request = supertest(app);
const { startServer, stopServer, deleteAll } = require("./util/inMemDb");
const User = require("../models/User");
const Pizza = require("../models/Pizza");
const Topping = require("../models/Topping");
const createToken = require("../utils/createToken");

describe("Order handling tests", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await startServer("orderTestDatabase");
  });

  afterAll(async () => {
    await stopServer(mongoServer);
  });

  afterEach(async () => {
    await deleteAll([User, Pizza, Topping]);
  });

  test("/api/order POST should add order data to the authenticated user or give back an error message if the user has been deleted", async () => {
    //given a user in the database without orders
    //and a generated valid authentication token to that user
    //in the request header
    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
    });
    await newUser.save();
    const token = createToken(newUser);
    //and a pizza and a topping in the database
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

    //when we send a valid order data with the user token in the header
    const order = {
      name: "én",
      email: "em@il.hu",
      tel: "123456",
      address: "address",
      cart: {
        pizza: { [savedPizza._id]: 3 },
        topping: { [savedTopping._id]: 2 },
      },
    };
    const res = await request
      .post(`/api/order`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order);

    //then the order should be in the database(in the orders property of the user)
    const user = await User.findOne();
    expect(res.status).toBe(200);
    expect(user.orders).toBeTruthy();
    expect(user.orders.length).toBe(1);
    expect(user.orders[0].name).toBe("én");
    expect(user.orders[0].cart.pizza[0].name).toBe("pizza001");

    //given the user has been deleted
    await deleteAll([User]);

    //when we send the order again
    const res2 = await request
      .post(`/api/order`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order);

    //then we should get back an error message with 401 status
    expect(res2.status).toBe(401);
    expect(res2.body.msg).toBe(
      "Authentication error: This user has been deleted"
    );
  });

  test("/api/order POST should give back an error message with 400 status if the request data is invalid", async () => {
    //given a user in the database without orders
    //and a generated valid authentication token to that user
    //in the request header
    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
    });
    await newUser.save();
    const token = createToken(newUser);

    //when we send order data without name property
    const order = {
      email: "em@il.hu",
      tel: "123456",
      address: "address",
    };
    const res = await request
      .post(`/api/order`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order);

    //then we should get back an error message with 400 status
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeTruthy();
    expect(res.body.errors.length).toBe(1);
    expect(res.body.errors[0].msg).toBe("Meg kell adni egy nevet!");
    expect(newUser.orders.length).toBe(0);

    //when we send order data with invalid email
    const order2 = {
      name: "nevem",
      email: "em@il",
      tel: "123456",
      address: "address",
    };
    const res2 = await request
      .post(`/api/order`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order2);

    //then we should get back an error message with 400 status
    expect(res2.status).toBe(400);
    expect(res2.body.errors).toBeTruthy();
    expect(res2.body.errors.length).toBe(1);
    expect(res2.body.errors[0].msg).toBe("Valós email-t adj meg!");
    expect(newUser.orders.length).toBe(0);

    //when we send order data with invalid email and missing name
    const order3 = {
      email: "em@il",
      tel: "123456",
      address: "address",
    };
    const res3 = await request
      .post(`/api/order`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order3);

    //then we should get back 2 error messages with 400 status
    expect(res3.status).toBe(400);
    expect(res3.body.errors).toBeTruthy();
    expect(res3.body.errors.length).toBe(2);
    expect(res3.body.errors[0].msg).toBe("Valós email-t adj meg!");
    expect(res3.body.errors[1].msg).toBe("Meg kell adni egy nevet!");
    expect(newUser.orders.length).toBe(0);
  });

  test("/api/order POST should give back an error message when it is called without an access token", async () => {
    //when we send a POST request without an access token
    const order = {
      name: "én",
      email: "em@il.hu",
      tel: "123456",
      address: "address",
    };

    const res = await request
      .post("/api/order")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order);

    //then an error message should return with status 401
    expect(res.status).toBe(401);
    expect(res.body.msg).toBe(
      "Authentication error: No authorization header. Authorization denied"
    );
  });

  test("/api/order POST should give back an error message when it is called with an invalid access token", async () => {
    //when we send a POST request with an invalid access token
    const order = {
      name: "én",
      email: "em@il.hu",
      tel: "123456",
      address: "address",
    };
    const res = await request
      .post("/api/name_change")
      .set("Authorization", "Bearer xyz123")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(order);

    //then an error message should return with status 401
    expect(res.status).toBe(401);
    expect(res.body.msg).toBe("Authentication error: Token is not valid");
  });

  test("/api/orders GET should give back orders of the authenticated user or give back an error message if the user has been deleted", async () => {
    //given a user in the database with an order in the orders property of that user
    //and a generated valid authentication token for that user
    //in the request header
    const orderCart = {
      pizza: [
        {
          name: "Sajtos Pizza",
          quantity: 3,
          price: 1000,
        },
      ],
      topping: [
        {
          name: "Paradicsomos feltét",
          quantity: 1,
          price: 500,
        },
      ],
    };
    const order = {
      name: "a nevem",
      email: "em@il.hu",
      tel: "123456",
      address: "address",
      cart: orderCart,
    };

    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
      orders: [order],
    });
    await newUser.save();
    const token = createToken(newUser);

    //when we send a request with the user token in the header
    const res = await request
      .get(`/api/orders`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back the orders of that user
    const user = await User.findOne();
    expect(res.status).toBe(200);
    expect(user.orders).toBeTruthy();
    expect(user.orders.length).toBe(1);
    expect(user.orders[0].name).toBe("a nevem");
    expect(user.orders[0].cart.pizza[0].name).toBe("Sajtos Pizza");

    //given the user has been deleted
    await deleteAll([User]);

    //when we send a request again with the user token in the header
    const res2 = await request
      .get(`/api/orders`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back an error message with 401 status
    expect(res2.status).toBe(401);
    expect(res2.body.msg).toBe(
      "Authentication error: This user has been deleted"
    );
  });

  test("/api/orders GET should give back an error message with 401 status if we send a request without the user token", async () => {
    //when we send a GET request to the endpoint without the user token
    const res = await request
      .get(`/api/orders`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back an error message with 401 status
    expect(res.status).toBe(401);
    expect(res.body.msg).toBe(
      "Authentication error: No authorization header. Authorization denied"
    );
  });

  test("/api/orders GET should give back an error message with 401 status if we send a request with invalid user token", async () => {
    //when we send a GET request to the endpoint with invalid user token
    const res = await request
      .get(`/api/orders`)
      .set("Authorization", "Bearer xyz123")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back an error message with 401 status
    expect(res.status).toBe(401);
    expect(res.body.msg).toBe("Authentication error: Token is not valid");
  });
});
