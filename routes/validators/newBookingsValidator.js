const countHourMinute = require("../../utils/countHourMinute");

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

  return true;
};

module.exports = newBookingsValidator;
