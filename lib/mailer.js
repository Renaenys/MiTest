import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

export async function sendActivationEmail(to, code) {
	const mailOptions = {
		from: `"MTrading" <${process.env.EMAIL_USER}>`,
		to,
		subject: 'Activate Your Account',
		html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9; border: 1px solid #e5e5e5;">
        <h2 style="color: #333;">👋 Welcome to <span style="color:#2563eb;">MTrading</span></h2>
        <p style="font-size: 16px;">Thanks for signing up. Use the code below to activate your account:</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #2563eb; margin: 20px 0;">${code}</div>
        <p style="font-size: 14px; color: #777;">If you didn’t request this, please ignore this email.</p>
        <p style="font-size: 14px; color: #999;">- MTrading Team</p>
      </div>
    `,
	};
}

export async function sendResetPasswordEmail(to, code) {
	const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?code=${code}`;
	const mailOptions = {
		from: `"MTrading" <${process.env.EMAIL_USER}>`,
		to,
		subject: 'MTrading Password Reset',
		html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9; border: 1px solid #e5e5e5;">
        <h2 style="color: #333;">🔑 Reset Your Password</h2>
        <p style="font-size: 16px;">You requested a password reset. Click the link below to choose a new password:</p>
        <a href="${resetLink}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #2563eb; color: #fff; border-radius: 6px; text-decoration: none;">Reset Password</a>
        <p style="font-size: 14px; color: #777;">If you didn’t request this, ignore this email.</p>
        <p style="font-size: 14px; color: #999;">- MTrading Team</p>
      </div>
    `,
	};

	return transporter.sendMail(mailOptions);
}
