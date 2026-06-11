import { formatRM } from "./catalog";
import { requireEnv, type RuntimeEnv } from "./env";
import type { CheckoutOrder, FiuuPaymentUpdate } from "./order";
import { summarizeItems } from "./order";

type EmailMessage = {
  to: string;
  cc?: string;
  subject: string;
  lines: string[];
  html?: string;
};

const normalizeEmailList = (value: string | undefined) =>
  String(value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

const mergeEmailLists = (...values: (string | undefined)[]) => {
  const merged = values.flatMap(normalizeEmailList);
  const unique = merged.filter((email, index) => merged.indexOf(email) === index);

  return unique.join(", ");
};

const base64UrlEncode = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    output += alphabet[(triplet >>> 18) & 63];
    output += alphabet[(triplet >>> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triplet >>> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[triplet & 63] : "=";
  }

  return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const escapeHtml = (value: string | number | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReceiptRow = (label: string, value: string | number) => `
  <tr>
    <td style="padding:8px 0;color:#5f6b7a;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#101828;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value || "-")}</td>
  </tr>`;

const buildCustomerReceiptHtml = (order: CheckoutOrder, payment: FiuuPaymentUpdate) => {
  const items = summarizeItems(order.items);
  const amount = formatRM(order.totalPaid);
  const address = [
    order.customer.address,
    [order.customer.postcode, order.customer.state].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f2f5f9;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f9;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d9e1ea;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0b459f;padding:22px 28px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Ornis by Falcon Safe</div>
                <div style="margin-top:14px;font-size:28px;line-height:1.2;font-weight:700;">Payment Successful</div>
                <div style="margin-top:8px;font-size:14px;color:#dbeafe;">Thank you. Your Ornis order has been confirmed.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 18px;text-align:center;">
                <div style="font-size:12px;color:#5f6b7a;text-transform:uppercase;letter-spacing:.08em;">Amount paid</div>
                <div style="margin-top:8px;font-size:38px;line-height:1;font-weight:700;color:#101828;">${escapeHtml(amount)}</div>
                <div style="margin:24px auto 0;width:72px;height:4px;background:#22c55e;border-radius:999px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e3e8ef;border-radius:8px;padding:14px 18px;">
                  <tr>
                    <td colspan="2" style="padding:4px 0 10px;color:#101828;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #d9e1ea;">Payment details</td>
                  </tr>
                  ${buildReceiptRow("Order ID", order.orderId)}
                  ${buildReceiptRow("Items", items)}
                  ${buildReceiptRow("Payment method", payment.channel || "-")}
                  ${buildReceiptRow("Fiuu transaction ID", payment.tranId || "-")}
                  ${buildReceiptRow("Paid at", payment.paydate || "-")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e3e8ef;border-radius:8px;padding:14px 18px;">
                  <tr>
                    <td colspan="2" style="padding:4px 0 10px;color:#101828;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #d9e1ea;">Customer and delivery</td>
                  </tr>
                  ${buildReceiptRow("Name", order.customer.name)}
                  ${buildReceiptRow("Email", order.customer.email)}
                  ${buildReceiptRow("Phone", order.customer.phone)}
                  <tr>
                    <td style="padding:8px 0;color:#5f6b7a;font-size:13px;vertical-align:top;">Delivery address</td>
                    <td style="padding:8px 0;color:#101828;font-size:13px;font-weight:600;text-align:right;vertical-align:top;">${address || "-"}</td>
                  </tr>
                  ${buildReceiptRow("Shipping", "Free")}
                  ${buildReceiptRow("Discount code", order.promoCode || "-")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;color:#475467;font-size:14px;line-height:1.6;">We will contact you if we need any additional delivery details.</p>
                <p style="margin:18px 0 0;color:#475467;font-size:14px;line-height:1.6;">Regards,<br /><strong style="color:#101828;">Ornis Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#101828;padding:16px 28px;color:#d0d5dd;font-size:12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color:#d0d5dd;">Falcon Safe Marketing Sdn Bhd</td>
                    <td align="right"><a href="mailto:falcon@falconsafe.com" style="color:#86efac;text-decoration:none;">falcon@falconsafe.com</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const getGoogleAccessToken = async (env: RuntimeEnv) => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv(env, "GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: requireEnv(env, "GOOGLE_WORKSPACE_OAUTH_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth refresh failed with ${response.status}.`);
  }

  return ((await response.json()) as { access_token: string }).access_token;
};

const sendGmailMessage = async (
  env: RuntimeEnv,
  message: EmailMessage,
) => {
  const accessToken = await getGoogleAccessToken(env);
  const from = env.GMAIL_FROM_EMAIL ?? "eason@locus-t.com.my";
  const ccLine = message.cc ? [`Cc: ${message.cc}`] : [];
  const textBody = message.lines.join("\r\n");
  const rawMessage = message.html ? [
    `From: ${from}`,
    `To: ${message.to}`,
    ...ccLine,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: multipart/alternative; boundary=\"ornis-payment-receipt\"",
    "",
    "--ornis-payment-receipt",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    "--ornis-payment-receipt",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.html,
    "--ornis-payment-receipt--",
  ].join("\r\n") : [
    `From: ${from}`,
    `To: ${message.to}`,
    ...ccLine,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    textBody,
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(rawMessage) }),
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed with ${response.status}.`);
  }
};

const sendResendMessage = async (env: RuntimeEnv, message: EmailMessage) => {
  const from = env.RESEND_FROM_EMAIL ?? env.GMAIL_FROM_EMAIL ?? "Ornis <noreply@locus-t.com.my>";
  const cc = normalizeEmailList(message.cc);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv(env, "RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: normalizeEmailList(message.to),
      cc: cc.length > 0 ? cc : undefined,
      subject: message.subject,
      text: message.lines.join("\n"),
      html: message.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend send failed with ${response.status}: ${errorText}`);
  }
};

const sendEmailMessage = async (env: RuntimeEnv, message: EmailMessage) => {
  if (env.RESEND_API_KEY) {
    await sendResendMessage(env, message);
    return;
  }

  await sendGmailMessage(env, message);
};

export const sendSellerPaymentEmail = async (
  env: RuntimeEnv,
  order: CheckoutOrder,
  payment: FiuuPaymentUpdate,
) => {
  const subject = `New Paid Ornis Order - ${summarizeItems(order.items)} - ${formatRM(order.totalPaid)}`;
  const lines = [
    "A new Ornis order has been paid.",
    "",
    `Order ID: ${order.orderId}`,
    `Payment Status: ${payment.status}`,
    `Amount: ${formatRM(order.totalPaid)}`,
    `Items: ${summarizeItems(order.items)}`,
    `Discount Code: ${order.promoCode || "-"}`,
    "Shipping: Free",
    "",
    "Customer:",
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Address: ${order.customer.address}`,
    `Postcode: ${order.customer.postcode}`,
    `State: ${order.customer.state}`,
    "",
    `Fiuu Transaction ID: ${payment.tranId || "-"}`,
    `Payment Method: ${payment.channel || "-"}`,
    `Paid At: ${payment.paydate || "-"}`,
  ];

  await sendEmailMessage(env, {
    to: env.SELLER_NOTIFICATION_EMAIL ?? "mandy@falconsafe.com",
    cc: mergeEmailLists(env.SELLER_NOTIFICATION_CC ?? "ava@locus-t.com.my", env.SALES_NOTIFICATION_CC),
    subject,
    lines,
  });
};

export const sendCustomerPaymentEmail = async (
  env: RuntimeEnv,
  order: CheckoutOrder,
  payment: FiuuPaymentUpdate,
) => {
  const lines = [
    `Hi ${order.customer.name},`,
    "",
    "Thank you for your Ornis order. Your payment has been received successfully.",
    "",
    `Order ID: ${order.orderId}`,
    `Items: ${summarizeItems(order.items)}`,
    `Amount paid: ${formatRM(order.totalPaid)}`,
    `Discount Code: ${order.promoCode || "-"}`,
    "Shipping: Free",
    "",
    "Customer details:",
    `Name: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    "",
    "Delivery details:",
    order.customer.address,
    `${order.customer.postcode}, ${order.customer.state}`,
    "",
    `Payment Method: ${payment.channel || "-"}`,
    `Fiuu Transaction ID: ${payment.tranId || "-"}`,
    `Paid At: ${payment.paydate || "-"}`,
    "",
    "We will contact you if we need any additional delivery details.",
    "",
    "Regards,",
    "Ornis Team",
  ];

  await sendEmailMessage(env, {
    to: order.customer.email,
    cc: env.SELLER_NOTIFICATION_CC ?? "ava@locus-t.com.my",
    subject: `Your Ornis order is confirmed - ${order.orderId}`,
    lines,
    html: buildCustomerReceiptHtml(order, payment),
  });
};
