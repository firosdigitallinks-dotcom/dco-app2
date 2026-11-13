import "server-only";

import nodemailer from "nodemailer";

export type EnquiryEmailData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  market: string;
  message: string;
  productName: string;
  sku: string;
  pageUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlLines(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function emailSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);
}

function smtpPort() {
  const value = Number(process.env.SMTP_PORT || "465");
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : 465;
}

function smtpSecure(port: number) {
  const configured = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return port === 465;
}

function mailTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required.");
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const port = smtpPort();
  return nodemailer.createTransport({
    host,
    port,
    secure: smtpSecure(port),
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

export async function sendEnquiryEmails(data: EnquiryEmailData) {
  const recipient =
    process.env.ENQUIRY_TO_EMAIL?.trim() || "enquiries@hygienelinks.com";
  const fromEmail =
    process.env.ENQUIRY_FROM_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    recipient;
  const fromName = process.env.ENQUIRY_FROM_NAME?.trim() || "Hygiene Links";
  const from = { name: fromName, address: fromEmail };
  const subjectProduct = emailSubject(data.productName) || "General enquiry";
  const submittedAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date());
  const transporter = mailTransport();

  const rows = [
    ["Name", data.name],
    ["Company", data.company || "Not provided"],
    ["Email", data.email],
    ["Phone / WhatsApp", data.phone || "Not provided"],
    ["Market", data.market],
    ["Product", subjectProduct],
    ["SKU", data.sku || "Not provided"],
    ["Submitted", `${submittedAt} (UAE)`],
    ["Page", data.pageUrl || "Not provided"],
  ];
  const adminHtml = `
    <div style="font-family:Arial,sans-serif;color:#102a43;line-height:1.55;max-width:680px">
      <h1 style="font-size:24px;margin:0 0 18px">New website enquiry</h1>
      <table style="border-collapse:collapse;width:100%;margin-bottom:22px">
        ${rows
          .map(
            ([label, value]) => `<tr>
              <th style="text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #d9e2ec;width:170px">${escapeHtml(label)}</th>
              <td style="padding:8px;border-bottom:1px solid #d9e2ec">${escapeHtml(value)}</td>
            </tr>`,
          )
          .join("")}
      </table>
      <h2 style="font-size:17px;margin:0 0 8px">Message</h2>
      <p style="padding:14px;background:#f2f7fb;border-radius:8px">${htmlLines(data.message)}</p>
      <p style="font-size:13px;color:#627d98">Reply to this email to contact ${escapeHtml(data.name)} directly.</p>
    </div>`;
  const adminText = [
    "New website enquiry",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Message:",
    data.message,
  ].join("\n");

  const confirmationHtml = `
    <div style="font-family:Arial,sans-serif;color:#1c0a18;line-height:1.65;max-width:620px">
      <h1 style="font-size:25px;margin:0 0 14px;color:#923969">Thank you for your enquiry</h1>
      <p>Hello ${escapeHtml(data.name)},</p>
      <p>We have received your enquiry${
        data.productName ? ` about <strong>${escapeHtml(data.productName)}</strong>` : ""
      }. Our Diamond Capital Oasis team will review it and reply as soon as possible.</p>
      <div style="padding:16px;background:#fdf8fa;border-left:4px solid #923969;border-radius:6px;margin:20px 0">
        ${htmlLines(data.message)}
      </div>
      <p>If you need to add any details, reply to this email.</p>
      <p>Regards,<br /><strong>Diamond Capital Oasis</strong></p>
    </div>`;
  const confirmationText = [
    `Hello ${data.name},`,
    "",
    `Thank you for your enquiry${data.productName ? ` about ${data.productName}` : ""}.`,
    "Our Diamond Capital Oasis team will review it and reply as soon as possible.",
    "",
    "Your message:",
    data.message,
    "",
    "Regards,",
    "Diamond Capital Oasis",
  ].join("\n");

  await Promise.all([
    transporter.sendMail({
      from,
      to: recipient,
      replyTo: { name: data.name, address: data.email },
      subject: `Website enquiry: ${subjectProduct}`,
      text: adminText,
      html: adminHtml,
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
    transporter.sendMail({
      from,
      to: data.email,
      replyTo: recipient,
      subject: "We received your Diamond Capital Oasis enquiry",
      text: confirmationText,
      html: confirmationHtml,
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  ]);
}
