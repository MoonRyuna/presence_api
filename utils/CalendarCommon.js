const { google } = require('googleapis');
const axios = require('axios');
const moment = require("moment")

const TIME_ZONE = 'Asia/Jakarta'; // sesuaikan dengan time zone yang digunakan
const API_KEY = 'AIzaSyDcnW6WejpTOCffshGDDb4neIrXVUA1EAE';

// Fungsi untuk menghitung jumlah hari kerja antara dua tanggal
async function getWorkingDays(startDate, endDate) {
  try {
    // Mendapatkan instance calendar API
    const calendar = google.calendar({ version: 'v3' });

    // Mengambil daftar event pada kalender pada rentang tanggal yang ditentukan
    const response = await calendar.events.list({
      calendarId: 'id.indonesian#holiday@group.v.calendar.google.com', // Sesuaikan dengan id kalender yang digunakan
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: TIME_ZONE,
      singleEvents: true,
      key: API_KEY
    });

    // Mendapatkan daftar tanggal dalam rentang tanggal yang ditentukan
    const dateRange = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log("dateRange", dateRange)

    // Menghapus hari Sabtu dan Minggu dari daftar tanggal
    const filteredDates = dateRange.filter((date) => date.getDay() !== 0 && date.getDay() !== 6);
    console.log("sabtu-minggu", filteredDates)
    // Menghapus tanggal pada daftar event
    const events = response.data.items || [];

    console.log("events", events)
    events.forEach((event) => {
      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);
      const eventDates = [];
      let currentDate = new Date(start);
      while (currentDate <= end) {
        eventDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      filteredDates.forEach((date, index) => {
        if (eventDates.some((d) => d.toISOString() === date.toISOString())) {
          filteredDates.splice(index, 1);
        }
      });
    });

    // Mengembalikan jumlah hari kerja yang tersisa
    return filteredDates;
  } catch (error) {
    throw error
  }
}

function getDateRange(startDate, endDate) {
  const dateRange = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateRange;
}

async function getCalendarHolidays(startDate, endDate) {
  try {
    // Mendapatkan instance calendar API
    const calendar = google.calendar({ version: 'v3' });

    // Mengambil daftar event pada kalender pada rentang tanggal yang ditentukan
    const response = await calendar.events.list({
      calendarId: 'id.indonesian#holiday@group.v.calendar.google.com', // Sesuaikan dengan id kalender yang digunakan
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: TIME_ZONE,
      singleEvents: true,
      key: API_KEY
    });

    console.log(response)
    const events = response.data.items || [];

    // Menghapus tanggal pada daftar event
    const eventDates = [];
    events.forEach((event) => {
      const start = moment(event.start.dateTime || event.start.date).startOf('day');
      const end = moment(event.end.dateTime || event.end.date).startOf('day');
      let currentDate = moment(start);
      while (currentDate <= end) {
        const date = currentDate.toDate();
        if (!eventDates.some((d) => moment(d).isSame(currentDate, 'day'))) {
          eventDates.push(date);
        }
        currentDate.add(1, 'day');
      }
    });

    return eventDates;
  } catch (error) {
    throw error;
  }
}

async function getCalendarHoliday(startDate, endDate) {
  console.log('masukStart', startDate)
  console.log('masukEnd', endDate)

  // return;
  try {
    // Mendapatkan instance calendar API
    const calendar = google.calendar({ version: 'v3' });
    // Mengambil daftar event pada kalender pada rentang tanggal yang ditentukan
    const response = await calendar.events.list({
      calendarId: 'id.indonesian#holiday@group.v.calendar.google.com', // Sesuaikan dengan id kalender yang digunakan
      time: startDate,
      timeMax: endDate,
      timeZone: TIME_ZONE,
      singleEvents: true,
      key: API_KEY
    });

    console.log(response)
    const events = response.data.items || [];

    return events;
  } catch (error) {
    throw error;
  }
}

async function getHoliday(start = '', end = '') {
  /*
    Parameter Example:
    start = 2020-01-01
    end = 2021-01-01
  */

  const id_calendar = encodeURIComponent('id.indonesian#holiday@group.v.calendar.google.com');
  const start_date = encodeURIComponent(`${start}T00:00:00-00:00`);
  const end_date = encodeURIComponent(`${end}T00:00:00-00:00`);
  const key = API_KEY;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${id_calendar}/events?timeMax=${end_date}&timeMin=${start_date}&key=${key}&timeZone=${TIME_ZONE}`;

  try {
    const response = await axios.get(url);
    // console.log(response)
    const items = response.data.items;

    // re-index array
    const new_items = {};
    items.forEach(item => {
      /* Check if Excluded */
      const excluded_day = {}; // replace with your excluded day logic

      if (!excluded_day.date) {
        const start_date = item.start.date;
        if (new_items[start_date]) {
          new_items[start_date].push({
            'summary': item.summary,
            'start_date': item.start.date,
            'end_date': item.end.date
          });
        } else {
          new_items[start_date] = [{
            'summary': item.summary,
            'start_date': item.start.date,
            'end_date': item.end.date
          }];
        }
      }
    });

    // const list_holiday = [];
    // let count_holiday = 0;

    // Object.keys(new_items).forEach(key => {
    //   const timestamp = new Date(key).getTime();
    //   const day = new Date(timestamp).getDay();

    //   console.log(key, day)
    //   // klo sabtu dan minggu ga dimasukin ke array, soalnya udh ada hitungan sabtu minggu
    //   if (day !== 6 || day !== 0) {
    //     count_holiday++;
    //     list_holiday.push(key);
    //     /* Debug tanggal berapa aja yg libur */
    //     // console.log(new_items[key][0].start_date);
    //   }
    // });

    // console.log(new_items)
    return new_items[start] != undefined ? new_items[start] : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function getWeekendDays(startDate, endDate) {
  const dateRange = getDateRange(startDate, endDate);
  const weekendDays = dateRange.filter((date) => date.getDay() === 0 || date.getDay() === 6);
  return weekendDays;
}

module.exports = { getWorkingDays, getDateRange, getCalendarHolidays, getHoliday, getCalendarHoliday, getWeekendDays }
