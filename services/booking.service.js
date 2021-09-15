const Table = require("../models/Table");
const countHourMinute = require("../utils/countHourMinute");

//sends new booking data of the google-authenticated user to google calendar
const sendBookingToGoogle = (start, end, tableNumber, calendar, email) => {
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
};

//Loops through the given bookingsOfTheUser data
//which contains the (new)bookings of the authenticated user
//and it is in the form: {tableNumber: {date : []}}
//where the array contains the interval numbers
//Defines a start and end time for the consecutive intervals
//then calls the callBackFn function with this data
//which either sends it to google calendar
//or pushes it into an array
//depending on what does the given callback function
const parseBookingsOfTheUser = (bookingsOfTheUser, callBackFn) => {
  for (const tableNumber in bookingsOfTheUser) {
    const datesArrayOfTable = Object.keys(bookingsOfTheUser[tableNumber]);
    const sortedDatesArrayOfTable = datesArrayOfTable.sort();

    let end;

    const [sHour, sMinute] = countHourMinute(
      bookingsOfTheUser[tableNumber][sortedDatesArrayOfTable[0]][0]
    );

    let start = new Date(
      `${sortedDatesArrayOfTable[0]}T${sHour}:${sMinute}:00.000Z`
    );

    let prevInterval =
      bookingsOfTheUser[tableNumber][sortedDatesArrayOfTable[0]][0];

    let prevDate = sortedDatesArrayOfTable[0];

    for (const date of sortedDatesArrayOfTable) {
      for (const interval of bookingsOfTheUser[tableNumber][date]) {
        const [intervalStartHour, intervalStartMinute] =
          countHourMinute(interval);
        const intervalStart = new Date(
          `${date}T${intervalStartHour}:${intervalStartMinute}:00.000Z`
        );
        const [prevIntervalStartHour, prevIntervalStartMinute] =
          countHourMinute(prevInterval);
        const prevIntervalStart = new Date(
          `${prevDate}T${prevIntervalStartHour}:${prevIntervalStartMinute}:00.000Z`
        );

        if (
          intervalStart.getTime() - prevIntervalStart.getTime() >
          15 * 60 * 1000
        ) {
          const [endHour, endMinute] = countHourMinute(prevInterval + 1);
          end = new Date(`${prevDate}T${endHour}:${endMinute}:00.000Z`);

          callBackFn(start, end, tableNumber);

          const [startHour, startMinute] = countHourMinute(interval);
          start = new Date(`${date}T${startHour}:${startMinute}:00.000Z`);
        }

        prevInterval = interval;
        prevDate = date;
      }
    }
    const [eHour, eMinute] = countHourMinute(prevInterval + 1);
    end = new Date(`${prevDate}T${eHour}:${eMinute}:00.000Z`);

    callBackFn(start, end, tableNumber);
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

//Gives back all the future bookings in the database
//it is in the form: {tableNumber: {date : {interval: (<user email> || <true>)}}}
//interval value is user email if it belongs to the authenticated user
//otherwise it is true
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

exports.bookings = async (email) => {
  const table = await allBooking(email);

  return table;
};

//Fills an array with bookings of the authenticated user
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

  const userBookingsToReturn = [];

  parseBookingsOfTheUser(bookingsOfTheUser, (start, end, tableNumber) => {
    userBookingsToReturn.push({ start, end, tableNumber });
  });

  return userBookingsToReturn;
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
          if (
            table["data"]?.[tableNumber]?.[date]?.[interval] &&
            table["data"]?.[tableNumber]?.[date]?.[interval] !== email
          ) {
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

  if (calendar)
    parseBookingsOfTheUser(bookingsOfTheUser, (start, end, tableNumber) => {
      sendBookingToGoogle(start, end, tableNumber, calendar, email);
    });

  const allBookingWithoutEmails = await allBooking(email);

  return allBookingWithoutEmails;
};
