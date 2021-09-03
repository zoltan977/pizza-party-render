const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");
const BookingService = require("../services/booking.service");

exports.bookings = asyncHandler(async (req, res) => {
  table = await BookingService.bookings(res.locals.user.email);

  return res.json(table);
});

exports.userBookings = asyncHandler(async (req, res) => {
  const userBookingsArray = await BookingService.userBookings(
    res.locals.user.email
  );

  return res.json({ userBookingsArray });
});

exports.createBooking = asyncHandler(async (req, res) => {
  // console.log(req.body.data);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const allBookingWithoutEmails = await BookingService.createBooking(
    req.body.data,
    res.locals.user.email,
    res?.locals?.user?.calendar
  );

  return res.json(allBookingWithoutEmails);
});
