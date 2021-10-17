const app = require("../app");
const supertest = require("supertest");
const request = supertest(app);
const { startServer, stopServer, deleteAll } = require("./util/inMemDb");
const Table = require("../models/Table");
const User = require("../models/User");
const createToken = require("../utils/createToken");

describe("Booking handling tests", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await startServer("bookingsTestDatabase");
  });

  afterAll(async () => {
    await stopServer(mongoServer);
  });

  afterEach(async () => {
    await deleteAll([Table, User]);
  });

  test("/api/user_bookings should give back the data of all the future bookings of the user when a GET request is sent", async () => {
    //Given this bookings data in the database
    const aDayInTheFuture = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const aDayInThePast = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const bookingsDataInDatabase = {
      1: {
        [aDayInThePast]: {
          21: "email@email.hu",
          22: "email@email.hu",
          66: "mzoltan778@gmail.com",
        },
        [aDayInTheFuture]: {
          55: "mzoltan778@gmail.com",
          80: "email@email.hu",
          81: "email@email.hu",
        },
      },
    };

    const newTable = new Table({ data: bookingsDataInDatabase });
    await newTable.save();

    //Given this user is in the database
    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
    });
    await newUser.save();

    //Given his/her generated authentication token is in the header of the request
    const token = createToken(newUser);

    //when we send a GET request to the endpoint
    const resp = await request
      .get("/api/user_bookings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back the data of future bookings of the user in the database
    expect(resp.status).toBe(200);
    expect(Array.isArray(resp.body.userBookingsArray)).toBe(true);
    expect(resp.body.userBookingsArray.length).toBe(1);
    expect(resp.body.userBookingsArray[0].tableNumber).toBe("1");
  });

  test("/api/user_bookings GET should give back an error message when user is not authenticated", async () => {
    //Given no authentication token in the request header
    //when we send a GET request to the endpoint
    const resp = await request.get("/api/user_bookings");

    //then we should get back an error message with status 401
    expect(resp.status).toBe(401);
    expect(resp.body.msg).toBe(
      "Authentication error: No authorization header. Authorization denied"
    );
  });

  test("/api/booking should give back the data of all the future bookings when a GET request is sent", async () => {
    //Given this bookings data in the database
    const aDayInTheFuture = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const bookingsDataInDatabase = {
      1: {
        "2021-08-26": {
          5: "mzoltan778@gmail.com",
          6: "email@email.hu",
        },
        [aDayInTheFuture]: {
          5: "mzoltan778@gmail.com",
          6: "email@email.hu",
        },
      },
    };

    const newTable = new Table({ data: bookingsDataInDatabase });
    await newTable.save();

    //Given this user is in the database
    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
    });
    await newUser.save();

    //Given his/her generated authentication token is in the header of the request
    const token = createToken(newUser);

    //when we send a GET request to the endpoint
    const resp = await request
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/);

    //then we should get back the data of future bookings in the database
    expect(resp.status).toBe(200);
    expect(resp.body.data).toBeTruthy();
    expect(Object.keys(resp.body.data).length).toBe(1);
    expect(resp.body["data"]["1"][aDayInTheFuture]["5"]).toBe(true);
    expect(resp.body["data"]["1"][aDayInTheFuture]["6"]).toBe("email@email.hu");
  });

  test("/api/booking GET should give back an error message when user is not authenticated", async () => {
    //Given no authentication token in the request header
    //when we send a GET request to the endpoint
    const resp = await request.get("/api/bookings");

    //then we should get back an error message with status 401
    expect(resp.status).toBe(401);
    expect(resp.body.msg).toBe(
      "Authentication error: No authorization header. Authorization denied"
    );
  });

  test("/api/booking should update the booking data when a properly fomatted object is POSTed to it and it does not collide with existing data", async () => {
    //Given a properly formatted object
    const aDayInTheFuture = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const objectToPOST = {
      data: {
        2: {
          [aDayInTheFuture]: [33],
        },
      },
    };

    //Given this bookings data in the database
    const bookingsDataInDatabase = {
      1: {
        [aDayInTheFuture]: {
          5: "mzoltan778@gmail.com",
          6: "email@email.hu",
        },
      },
    };

    const newTable = new Table({ data: bookingsDataInDatabase });
    await newTable.save();

    //Given this user is in the database
    const email = "email@email.hu";
    const newUser = new User({
      name: "my name",
      email,
    });
    await newUser.save();

    //Given his/her generated authentication token is in the header of the request
    const token = createToken(newUser);

    //when we POST the properly formatted object
    const resp = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST);

    //then we should get back the updated data of future bookings in the database
    expect(resp.status).toBe(200);
    expect(resp.body.data).toBeTruthy();
    expect(Object.keys(resp.body.data).length).toBe(2);
    expect(resp.body["data"]["1"][aDayInTheFuture]["5"]).toBe(true);
    expect(resp.body["data"]["1"][aDayInTheFuture]["6"]).toBe("email@email.hu");
    expect(resp.body["data"]["2"][aDayInTheFuture]["33"]).toBe(
      "email@email.hu"
    );

    //Given the same conditions
    //When we POST the same data again
    const resp2 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST);

    //then we should get back an error msg with status 400
    expect(resp2.status).toBe(400);
    expect(resp2.body.msg).toBe("A foglalás nem sikerült valaki megelőzött!");

    //Given a malformed object (there is no table: 0)
    const objectToPOST_2 = {
      data: {
        0: {
          [aDayInTheFuture]: [33],
        },
      },
    };

    //When we POST it
    const resp3 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST_2);

    //then we get back an error message with status 400
    expect(resp3.status).toBe(400);
    expect(Array.isArray(resp3.body.errors)).toBe(true);
    expect(resp3.body.errors.length).toBe(1);
    expect(resp3.body.errors[0].msg).toBe(
      "A küldött adat formátuma nem megfelelő"
    );

    //Given a malformed object (malformed date)
    const objectToPOST_3 = {
      data: {
        0: {
          20001111: [33],
        },
      },
    };

    //When we POST it
    const resp4 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST_3);

    //then we get back an error message with status 400
    expect(resp4.status).toBe(400);
    expect(Array.isArray(resp4.body.errors)).toBe(true);
    expect(resp4.body.errors.length).toBe(1);
    expect(resp4.body.errors[0].msg).toBe(
      "A küldött adat formátuma nem megfelelő"
    );

    //Given a malformed object (max interval index is 95)
    const objectToPOST_4 = {
      data: {
        5: {
          [aDayInTheFuture]: [98],
        },
      },
    };

    //When we POST it
    const resp5 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST_4);

    //then we get back an error message with status 400
    expect(resp5.status).toBe(400);
    expect(Array.isArray(resp5.body.errors)).toBe(true);
    expect(resp5.body.errors.length).toBe(1);
    expect(resp5.body.errors[0].msg).toBe(
      "A küldött adat formátuma nem megfelelő"
    );

    //Given a malformed object
    const objectToPOST_5 = {
      data: {
        666: 666,
      },
    };

    //When we POST it
    const resp6 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST_5);

    //then we get back an error message with status 400
    expect(resp6.status).toBe(400);
    expect(Array.isArray(resp6.body.errors)).toBe(true);
    expect(resp6.body.errors.length).toBe(1);
    expect(resp6.body.errors[0].msg).toBe(
      "A küldött adat formátuma nem megfelelő"
    );

    //given a malformed data where the date is in the past
    const aDayInThePast = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const objectToPOST_6 = {
      data: {
        2: {
          [aDayInThePast]: [33],
        },
      },
    };

    //When we POST it
    const resp7 = await request
      .post(`/api/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .send(objectToPOST_6);

    //then we get back an error message with status 400
    expect(resp7.status).toBe(400);
    expect(Array.isArray(resp7.body.errors)).toBe(true);
    expect(resp7.body.errors.length).toBe(1);
    expect(resp7.body.errors[0].msg).toBe(
      "A küldött adat formátuma nem megfelelő"
    );
  });
});

test("/api/booking POST should give back an error message when user is not authenticated", async () => {
  //Given a properly formatted object
  const aDayInTheFuture = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const objectToPOST = {
    2: {
      [aDayInTheFuture]: [33],
    },
  };

  //Given no authentication token in the request header
  //when we POST the object
  const resp = await request.post(`/api/bookings`).send(objectToPOST);

  //then we should get back an error message with status 401
  expect(resp.status).toBe(401);
  expect(resp.body.msg).toBe(
    "Authentication error: No authorization header. Authorization denied"
  );
});
