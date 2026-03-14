const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Lex Advocate" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email send error:', error);
    throw error;
  }
}

function welcomeEmailTemplate(name, loginUrl) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center;">
        <h1 style="color: #c9a96e; margin: 0;">LEX ADVOCATE</h1>
        <p style="color: #fff; margin: 5px 0;">Powered by Helvino Technologies</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Welcome, ${name}!</h2>
        <p>Your account has been created successfully on Lex Advocate.</p>
        <a href="${loginUrl}" style="background: #c9a96e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Login to Your Account</a>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    </div>
  `;
}

function passwordResetTemplate(name, resetUrl) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center;">
        <h1 style="color: #c9a96e; margin: 0;">LEX ADVOCATE</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name}, click the button below to reset your password.</p>
        <a href="${resetUrl}" style="background: #c9a96e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    </div>
  `;
}

module.exports = { sendEmail, welcomeEmailTemplate, passwordResetTemplate };
