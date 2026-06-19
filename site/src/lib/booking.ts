import "server-only";

import nodemailer from "nodemailer";

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

type BookingSummaryEmail = {
  fullName: string;
  email: string;
  arrivalDate: string;
  departureDate: string;
  guests: number;
  rooms: number;
};

type BookingDeclineEmail = {
  fullName: string;
  email: string;
  arrivalDate: string;
  departureDate: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMailConfig() {
  const toEmail = process.env.BOOKING_TO_EMAIL?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail =
    process.env.BOOKING_FROM_EMAIL?.trim() || smtpUser || "bookings@localhost";
  const fromName = process.env.BOOKING_FROM_NAME?.trim() || "Shylow SKI Bookings";

  if (!toEmail || !smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "Configure BOOKING_TO_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and BOOKING_FROM_EMAIL before accepting bookings.",
    );
  }

  return {
    toEmail,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
  };
}

function createBookingTransporter() {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = getMailConfig();

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function shouldSendGuestEmails() {
  const value = process.env.BOOKING_DISABLE_GUEST_EMAILS?.trim().toLowerCase();
  return value !== "1" && value !== "true" && value !== "yes";
}

export async function sendBookingRequestEmail(request: BookingRequest) {
  const { toEmail, fromEmail, fromName } = getMailConfig();
  const transporter = createBookingTransporter();

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

export async function sendBookingConfirmedEmailToGuest(request: BookingSummaryEmail) {
  if (!shouldSendGuestEmails()) {
    return;
  }

  const { fromEmail, fromName } = getMailConfig();
  const transporter = createBookingTransporter();

  const subject = "Your booking has been confirmed";
  const plainText = [
    `Hi ${request.fullName},`,
    "",
    "Great news - your booking has been confirmed.",
    `Arrival: ${request.arrivalDate}`,
    `Departure: ${request.departureDate}`,
    `Guests: ${request.guests}`,
    `Rooms: ${request.rooms}`,
    "",
    "Thank you for choosing Shylow SKI Bed & Breakfast.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24180f">
      <h1 style="margin:0 0 16px;font-size:24px">Your booking is confirmed</h1>
      <p>Hi ${escapeHtml(request.fullName)},</p>
      <p>Great news - your booking has been confirmed.</p>
      <p><strong>Arrival:</strong> ${escapeHtml(request.arrivalDate)}</p>
      <p><strong>Departure:</strong> ${escapeHtml(request.departureDate)}</p>
      <p><strong>Guests:</strong> ${request.guests}</p>
      <p><strong>Rooms:</strong> ${request.rooms}</p>
      <p>Thank you for choosing Shylow SKI Bed & Breakfast.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: request.email,
    subject,
    text: plainText,
    html,
  });
}

export async function sendBookingDeclinedEmailToGuest(request: BookingDeclineEmail) {
  if (!shouldSendGuestEmails()) {
    return;
  }

  const { fromEmail, fromName } = getMailConfig();
  const transporter = createBookingTransporter();

  const subject = "Booking update";
  const plainText = [
    `Hi ${request.fullName},`,
    "",
    "Thank you for your booking request.",
    "Unfortunately we are unable to confirm those dates at this time.",
    `Requested arrival: ${request.arrivalDate}`,
    `Requested departure: ${request.departureDate}`,
    "",
    "Please reply if you would like help choosing alternate dates.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24180f">
      <h1 style="margin:0 0 16px;font-size:24px">Booking update</h1>
      <p>Hi ${escapeHtml(request.fullName)},</p>
      <p>Thank you for your booking request.</p>
      <p>Unfortunately we are unable to confirm those dates at this time.</p>
      <p><strong>Requested arrival:</strong> ${escapeHtml(request.arrivalDate)}</p>
      <p><strong>Requested departure:</strong> ${escapeHtml(request.departureDate)}</p>
      <p>Please reply if you would like help choosing alternate dates.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: request.email,
    subject,
    text: plainText,
    html,
  });
}