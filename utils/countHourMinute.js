//converts the given interval number to actual hours and minutes
const countHourMinute = (interval) => {
  let hour = Math.floor(interval / 4);
  let minute = (interval % 4) * 15;

  if (hour < 10) hour = `0${hour}`;

  if (minute < 10) minute = `0${minute}`;

  return [hour, minute];
};

module.exports = countHourMinute;
