"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTicketTransferEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = require("../libs/nodemailer");
const FROM = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`;
const sendVerificationEmail = async (to, token) => {
    const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    await nodemailer_1.transporter.sendMail({
        from: FROM,
        to,
        subject: "Verify your email",
        html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email. This link expires in 24 hours.</p>
      <a href="${link}">${link}</a>
    `,
    });
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (to, token) => {
    const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await nodemailer_1.transporter.sendMail({
        from: FROM,
        to,
        subject: "Reset your password",
        html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${link}">${link}</a>
      <p>If you didn't request this, ignore this email.</p>
    `,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendTicketTransferEmail = async (to, ticket) => {
    const link = `${process.env.CLIENT_URL}/tickets`;
    await nodemailer_1.transporter.sendMail({
        from: FROM,
        to,
        subject: `You've received a ticket for ${ticket.eventTitle}`,
        html: `
      <h2>A ticket is waiting for you</h2>
      <p>Someone transferred you a <strong>${ticket.ticketName}</strong> ticket for
      <strong>${ticket.eventTitle}</strong>, starting ${ticket.startsAt.toLocaleString()}.</p>
      <p>Open your tickets to see the QR code you'll need at the door.</p>
      <a href="${link}">${link}</a>
    `,
    });
};
exports.sendTicketTransferEmail = sendTicketTransferEmail;
//# sourceMappingURL=email.js.map