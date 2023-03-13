const { google } = require('googleapis');
const { authorize } = require('./GoogleAuth');
const moment = require("moment")

const TIME_ZONE = 'Asia/Jakarta'; // sesuaikan dengan time zone yang digunakan

// Fungsi untuk menghitung jumlah hari kerja antara dua tanggal
async function getWorkingDays(startDate, endDate) {
  try {
    const auth = await authorize()
    // Mendapatkan instance calendar API
    const calendar = google.calendar({ version: 'v3', auth });

    // Mengambil daftar event pada kalender pada rentang tanggal yang ditentukan
    const response = await calendar.events.list({
      calendarId: 'id.indonesian#holiday@group.v.calendar.google.com', // Sesuaikan dengan id kalender yang digunakan
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: TIME_ZONE,
      singleEvents: true
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
    const auth = await authorize();
    // Mendapatkan instance calendar API
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Mengambil daftar event pada kalender pada rentang tanggal yang ditentukan
    const response = await calendar.events.list({
      calendarId: 'id.indonesian#holiday@group.v.calendar.google.com', // Sesuaikan dengan id kalender yang digunakan
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: TIME_ZONE,
      singleEvents: true
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

function getWeekendDays(startDate, endDate) {
  const dateRange = getDateRange(startDate, endDate);
  const weekendDays = dateRange.filter((date) => date.getDay() === 0 || date.getDay() === 6);
  return weekendDays;
}

module.exports = { getWorkingDays, getDateRange,  getCalendarHolidays, getWeekendDays }
