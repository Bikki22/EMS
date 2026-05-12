import { transporter } from "../libs/nodemailer";

const FROM = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`;

export const sendVerificationEmail = async (
  to: string,
  token: string,
): Promise<void> => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
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

export const sendPasswordResetEmail = async (
  to: string,
  token: string,
): Promise<void> => {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
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
