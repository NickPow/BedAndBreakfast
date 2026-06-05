import "server-only";

import nodemailer from "nodemailer";

const DEFAULT_BOOKING_TO_EMAIL = "sandraw0064@gmail.com";

export type BookingRequest = {
  fullName: string;
  email: string;
  phone: string;
  guests: number;
  rooms: number;
  arrivalDate: string;
  departureDate: string;
  message: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendBookingRequestEmail(request: BookingRequest) {
  const toEmail = process.env.BOOKING_TO_EMAIL?.trim() || DEFAULT_BOOKING_TO_EMAIL;
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail =
    process.env.BOOKING_FROM_EMAIL?.trim() || smtpUser || "bookings@localhost";
  const fromName = process.env.BOOKING_FROM_NAME?.trim() || "Shylow SKI Bookings";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and BOOKING_FROM_EMAIL before accepting bookings.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const subject = `Booking request from ${request.fullName} for ${request.guests} guest${
    request.guests === 1 ? "" : "s"
  }`;

  const plainText = [
    "Shylow SKI booking request",
    `Name: ${request.fullName}`,
    `Email: ${request.email}`,
    `Phone: ${request.phone}`,
    `Guests: ${request.guests}`,
    `Rooms: ${request.rooms}`,
    `Arrival: ${request.arrivalDate}`,
    `Departure: ${request.departureDate}`,
    `Notes: ${request.message || "None"}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24180f">
      <h1 style="margin:0 0 16px;font-size:24px">Shylow SKI booking request</h1>
      <p><strong>Name:</strong> ${escapeHtml(request.fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(request.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(request.phone)}</p>
      <p><strong>Guests:</strong> ${request.guests}</p>
      <p><strong>Rooms:</strong> ${request.rooms}</p>
      <p><strong>Arrival:</strong> ${escapeHtml(request.arrivalDate)}</p>
      <p><strong>Departure:</strong> ${escapeHtml(request.departureDate)}</p>
      <p><strong>Notes:</strong><br />${escapeHtml(request.message || "None")}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: toEmail,
    replyTo: request.email,
    subject,
    text: plainText,
    html,
  });
}