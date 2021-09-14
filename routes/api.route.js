const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller");
const OrderController = require("../controllers/order.controller");
const DataController = require("../controllers/data.controller");
const BookingController = require("../controllers/booking.controller");
const auth = require("../middleware/auth");
const countHourMinute = require("../utils/countHourMinute");
const { check, body } = require("express-validator");

const newBookingsValidator = (value) => {
  let ok = true;
  if (Object.keys(value).length < 1) ok = false;
  for (const tableNumber in value) {
    if (parseInt(tableNumber) < 1 || parseInt(tableNumber) > 10) ok = false;
    if (Object.keys(value[tableNumber]).length < 1) ok = false;
    for (const date in value[tableNumber]) {
      if (new Date(date).toString() === "Invalid Date") ok = false;
      if (Object.keys(value[tableNumber][date]).length < 1) ok = false;
      for (const interval of value[tableNumber][date]) {
        if (parseInt(interval) < 0 || parseInt(interval) > 95) ok = false;

        const [startHour, startMinute] = countHourMinute(interval);
        const start = new Date(`${date}T${startHour}:${startMinute}:00.000Z`);
        if (start < new Date()) ok = false;
      }
    }
  }

  if (!ok) {
    throw new Error("A küldött adat formátuma nem megfelelő");
  }

  // Indicates the success of this synchronous custom validator
  return true;
};

router.post(
  "/login",
  [
    check("email", "Valós email-t adj meg!").isEmail(),
    check("password", "Meg kell adni a jelszót!").exists(),
  ],
  UserController.userAccount("login")
);

router.post(
  "/register",
  [
    check("name", "Meg kell adni egy nevet!").not().isEmpty(),
    check("email", "Valós email-t adj meg!").isEmail(),
    check("password", "Legalább 6 karakter hosszú jelszó kell!").isLength({
      min: 6,
    }),
  ],
  UserController.userAccount("register")
);

router.post(
  "/password",
  [
    check("code", "Hiányzik a generált kód").not().isEmpty(),
    check("email", "Valós email címet adj meg!").isEmail(),
    check("password", "Legalább 6 karkterből álló jelszó kell!").isLength({
      min: 6,
    }),
  ],
  UserController.userAccount("password")
);

router.post(
  "/reset",
  [check("email", "Valós email címet adj meg!").isEmail()],
  UserController.userAccount("reset")
);

router.post(
  "/google",
  [check("code", "Hiányzik a kód").not().isEmpty()],
  UserController.userAccount("google")
);

router.post(
  "/confirm",
  [
    check("code", "Hiányzik az ellenőrző kód").not().isEmpty(),
    check("email", "Valós email címet kell megadni!").isEmail(),
  ],
  UserController.userAccount("confirm")
);

router.post("/name_change", [auth], UserController.nameChange);

router.get("/loaduser", [auth], UserController.loadUser);

router.post(
  "/order",
  [
    auth,
    check("email", "Valós email-t adj meg!").isEmail(),
    check("name", "Meg kell adni egy nevet!").exists(),
    check("tel", "Meg kell adni egy telefonszámot!").exists(),
    check("address", "Meg kell adni egy címet!").exists(),
  ],
  OrderController.order
);

router.get("/orders", [auth], OrderController.orders);

router.get("/data", DataController.data);

router.get("/get_auth_info", UserController.getAuthInfo);

router.get("/bookings", [auth], BookingController.bookings);

router.post(
  "/bookings",
  [auth, body("data").custom(newBookingsValidator)],
  BookingController.createBooking
);

router.get("/user_bookings", [auth], BookingController.userBookings);

module.exports = router;
