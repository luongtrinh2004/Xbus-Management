import "server-only";

import nodemailer from "nodemailer";

export const XBUS_OFFICE_URL = "https://xbus-office.xmobility.vn/";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function createNotificationContent({ name, title, message }) {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title || "Thông báo");
  const messageParagraphs = String(message)
    .split("\n")
    .filter(Boolean);
  const safeMessage = messageParagraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  return {
    text: `Xbus Office - ${title || "Thông báo"}\n\nXin chào ${name},\n\n${message}\n\nTruy cập Xbus Office: ${XBUS_OFFICE_URL}\n\nTrân trọng,\nXbus Office`,
    html: `
      <div style="margin:0;background:#f4f7fb;padding:32px 12px;font-family:Arial,sans-serif;color:#273142">
        <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden">
          <div style="background:#1769e0;padding:20px 28px;color:#fff">
            <div style="font-size:20px;font-weight:700">Xbus Office</div>
            <div style="margin-top:5px;font-size:14px;font-weight:500;opacity:.9">${safeTitle}</div>
          </div>
          <div style="padding:28px;line-height:1.65;font-size:15px">
            <p style="margin:0 0 16px">Xin chào <strong>${safeName}</strong>,</p>
            <div style="margin:0 0 8px">${safeMessage}</div>
            <p style="margin:0 0 26px;text-align:center">
              <a href="${XBUS_OFFICE_URL}" target="_blank" style="display:inline-block;background:#1769e0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700">Truy cập Xbus Office</a>
            </p>
            <p style="margin:0">Trân trọng cảm ơn,<br><strong>Đội ngũ Xbus Office</strong></p>
          </div>
          <div style="border-top:1px solid #e5e9f0;padding:14px 28px;color:#7a8494;font-size:12px">Đây là email thông báo tự động, vui lòng không trả lời email này.</div>
        </div>
      </div>`,
  };
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

export function createEmailTransport() {
  if (!emailConfigured())
    throw new Error("Email chưa được cấu hình SMTP_USER và SMTP_APP_PASSWORD");
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
}

export async function sendNotificationEmail({ to, subject, text, html }) {
  if (!to) throw new Error("Người nhận chưa có email");
  return createEmailTransport().sendMail({
    from: `Xbus Office <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
