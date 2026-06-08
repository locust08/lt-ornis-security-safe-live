import { formatRM } from "./catalog";
import { requireEnv, type RuntimeEnv } from "./env";
import type { CheckoutOrder, FiuuPaymentUpdate } from "./order";
import { summarizeItems } from "./order";

type EmailMessage = {
  to: string;
  cc?: string;
  subject: string;
  lines: string[];
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
  const rawMessage = [
    `From: ${from}`,
    `To: ${message.to}`,
    ...ccLine,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    message.lines.join("\r\n"),
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
  await sendEmailMessage(env, {
    to: order.customer.email,
    cc: env.SELLER_NOTIFICATION_CC ?? "ava@locus-t.com.my",
    subject: `Your Ornis order is confirmed - ${order.orderId}`,
    lines: [
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
      "Delivery details:",
      order.customer.address,
      `${order.customer.postcode}, ${order.customer.state}`,
      `Phone: ${order.customer.phone}`,
      "",
      `Fiuu Transaction ID: ${payment.tranId || "-"}`,
      `Paid At: ${payment.paydate || "-"}`,
      "",
      "We will contact you if we need any additional delivery details.",
      "",
      "Regards,",
      "Ornis Team",
    ],
  });
};
