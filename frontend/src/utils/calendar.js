/** Build Google Calendar "Add event" URL for a booking */
export function googleCalendarUrl(booking) {
  if (!booking) return '#';

  const title = encodeURIComponent(`Dinner at ${booking.restaurantName}`);
  const details = encodeURIComponent(
    `Reservation for ${booking.guests} guest(s)` +
    (booking.seatingArea ? ` · ${booking.seatingArea}` : '') +
    (booking.specialRequests ? `\nNotes: ${booking.specialRequests}` : '') +
    `\nBooking ID: ${booking._id}`
  );
  const location = encodeURIComponent(booking.restaurantName || '');

  // Parse date + time like "7:00 PM" into Google Calendar dates
  const start = parseBookingDateTime(booking.date, booking.time);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
}

function parseBookingDateTime(dateStr, timeStr = '7:00 PM') {
  const base = dateStr || new Date().toISOString().split('T')[0];
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hours = 19;
  let minutes = 0;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const mer = (match[3] || '').toUpperCase();
    if (mer === 'PM' && hours < 12) hours += 12;
    if (mer === 'AM' && hours === 12) hours = 0;
  }
  const d = new Date(`${base}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Download a simple .ics calendar file */
export function downloadIcs(booking) {
  const start = parseBookingDateTime(booking.date, booking.time);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const stamp = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LEtoile Reserve//EN',
    'BEGIN:VEVENT',
    `UID:${booking._id}@etoile.reserve`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Dinner at ${booking.restaurantName}`,
    `DESCRIPTION:Guests: ${booking.guests}. Booking ${booking._id}`,
    `LOCATION:${booking.restaurantName}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etoile-${booking._id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
