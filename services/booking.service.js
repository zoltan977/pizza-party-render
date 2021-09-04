const Table = require("../models/Table");

let userBookingsArray = [];

//sends new booking data of the google-authenticated user to google calendar
//or
//pushes booking data of the user into the userBookingsArray
//depending on whether the calendar and email parameters are undefined or not
const sendBookingToGoogle = (start, end, tableNumber, calendar, email) => {
  // console.log("start end tableNumber: ", start, end, tableNumber);

  if (start < new Date()) return;

  if (!calendar && !email) userBookingsArray.push({ start, end, tableNumber });
  else {
    const eventBody = {
      calendarId: email,
      requestBody: {
        start: { dateTime: start },
        end: { dateTime: end },
        summary: "Asztalfoglalás",
        description: `Asztal száma: ${tableNumber}`,
      },
    };

    calendar.events.insert(eventBody);
  }
};

//converts the given interval number to actual hours and minutes
const countHourMinute = (interval) => {
  let hour = Math.floor(interval / 4);
  let minute = (interval % 4) * 15;

  if (hour < 10) hour = `0${hour}`;

  if (minute < 10) minute = `0${minute}`;

  return [hour, minute];
};

//Loops through the given bookingsOfTheUser data
//which contains the (new)bookings of the authenticated user
//and it is in the form: {tableNumber: {date : []}}
//where the array contains the interval numbers
//Defines a start and end time for the consecutive intervals
//then calls the sendBookingToGoogle function with this data
//which either sends it to google calendar
//or pushes it into the userBookingsArray
//depending on whether calendar and email parameters are null or not.
const parseBookingsOfTheUser = (bookingsOfTheUser, calendar, email) => {
  for (const tableNumber in bookingsOfTheUser) {
    for (const date in bookingsOfTheUser[tableNumber]) {
      const [sHour, sMinute] = countHourMinute(
        bookingsOfTheUser[tableNumber][date][0]
      );

      let start = new Date(`${date}T${sHour}:${sMinute}:00.000Z`);
      let end;
      let prevInterval = bookingsOfTheUser[tableNumber][date][0];
      for (const interval of bookingsOfTheUser[tableNumber][date]) {
        if (interval - prevInterval > 1) {
          const [endHour, endMinute] = countHourMinute(prevInterval + 1);
          end = new Date(`${date}T${endHour}:${endMinute}:00.000Z`);
          sendBookingToGoogle(start, end, tableNumber, calendar, email);
          const [startHour, startMinute] = countHourMinute(interval);
          start = new Date(`${date}T${startHour}:${startMinute}:00.000Z`);
        }

        prevInterval = interval;
      }
      const [eHour, eMinute] = countHourMinute(prevInterval + 1);
      end = new Date(`${date}T${eHour}:${eMinute}:00.000Z`);
      sendBookingToGoogle(start, end, tableNumber, calendar, email);
    }
  }
};

//automatically add properties to an object which were undefined
//and gives it a value
const addProps = (obj, arr, val) => {
  if (typeof arr == "string") arr = arr.split(".");

  obj[arr[0]] = obj[arr[0]] || {};

  const tmpObj = obj[arr[0]];

  if (arr.length > 1) {
    arr.shift();
    addProps(tmpObj, arr, val);
  } else obj[arr[0]] = val;

  return obj;
};

//gives back all the future bookings in the database without the email address
//if the booking not belongs to the authenticated user
//and with the email address if its belongs to the current user
const allBooking = async (email) => {
  let table;
  try {
    table = await Table.findOne();
    if (!table) table = { data: {} };
  } catch (error) {
    table = { data: {} };
  }

  if (table.data)
    for (const tableNumber in table["data"]) {
      for (const date in table["data"][tableNumber]) {
        for (const interval in table["data"][tableNumber][date]) {
          const [startHour, startMinute] = countHourMinute(interval);
          const start = new Date(`${date}T${startHour}:${startMinute}:00.000Z`);

          if (start < new Date()) {
            delete table["data"][tableNumber][date][interval];
            continue;
          }

          if (table["data"][tableNumber][date][interval] !== email)
            table["data"][tableNumber][date][interval] = true;
        }
        if (!Object.keys(table["data"][tableNumber][date]).length) {
          delete table["data"][tableNumber][date];
          continue;
        }
      }
    }

  if (!table.data) table.data = {};

  return table;
};

//Gives back all the bookings in the form: {tableNumber: {date : {interval: (<user email> || <true>)}}}
//interval value is user email if it belongs to the authenticated user
//otherwise it is true
exports.bookings = async (email) => {
  const table = await allBooking(email);

  return table;
};

//Fills the userBookingsArray with booking data of the authenticated user
//and returns it
//It is in the form: [{start, end, tableNumber}]
exports.userBookings = async (email) => {
  let table;
  try {
    table = await Table.findOne();
    if (!table) table = {};
  } catch (error) {
    table = {};
  }

  const bookingsOfTheUser = {};
  if (table.data)
    for (const tableNumber in table["data"]) {
      for (const date in table["data"][tableNumber]) {
        for (const interval in table["data"][tableNumber][date]) {
          if (table["data"][tableNumber][date][interval] == email) {
            if (bookingsOfTheUser?.[tableNumber]?.[date])
              bookingsOfTheUser[tableNumber][date].push(parseInt(interval));
            else
              addProps(
                bookingsOfTheUser,
                [tableNumber, date],
                [parseInt(interval)]
              );
          }
        }
      }
    }

  userBookingsArray = [];
  parseBookingsOfTheUser(bookingsOfTheUser);

  return userBookingsArray;
};

//Updates the booking data in the database based on the POSTed object(data)
//which is in the form: {tableNumber: {date : []}}
//where the array contains the new bookings of the authenticated user
//in the form of interval numbers
//If the user is authenticated with google then sends the new bookings to google calendar too
//Finally returns the updated saved database data
exports.createBooking = async (data, email, calendar) => {
  const bookingsOfTheUser = data;
  let newTableData = {};
  const table = await Table.findOne();
  if (!table) {
    for (const tableNumber in data) {
      for (const date in data[tableNumber]) {
        for (const interval of data[tableNumber][date]) {
          addProps(newTableData, [tableNumber, date, interval], email);
        }
      }
    }

    const newTable = new Table({ data: newTableData });
    savedTable = await newTable.save();
  } else {
    for (const tableNumber in data) {
      if (!table["data"][tableNumber]) table["data"][tableNumber] = {};
      for (const date in data[tableNumber]) {
        if (!table["data"][tableNumber][date])
          table["data"][tableNumber][date] = {};
        for (const interval of data[tableNumber][date]) {
          if (table["data"]?.[tableNumber]?.[date]?.[interval]) {
            const allBookingWithoutEmails = await allBooking(email);
            throw {
              status: 400,
              msg: "A foglalás nem sikerült valaki megelőzött!",
              data: allBookingWithoutEmails.data,
            };
          }

          table["data"][tableNumber][date][interval] = email;
        }
      }
    }
    table.markModified("data");
    savedTable = await table.save();
  }

  if (calendar) parseBookingsOfTheUser(bookingsOfTheUser, calendar, email);

  const allBookingWithoutEmails = await allBooking(email);

  return allBookingWithoutEmails;
};
