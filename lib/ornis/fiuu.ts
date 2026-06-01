import { requireEnv, type RuntimeEnv } from "./env";
import { md5 } from "./md5";
import type { CheckoutOrder } from "./order";
import { formatAmount, summarizeItems } from "./order";

const FIUU_CURRENCY = "MYR";

export type FiuuResponse = {
  amount: string;
  orderid: string;
  tranID: string;
  domain: string;
  status: string;
  appcode: string;
  currency: string;
  paydate: string;
  skey: string;
  channel: string;
  error_code: string;
  error_desc: string;
};

export const buildFiuuPaymentRequest = (env: RuntimeEnv, order: CheckoutOrder, origin: string) => {
  const merchantId = requireEnv(env, "FIUU_MERCHANT_ID");
  const verifyKey = requireEnv(env, "FIUU_VERIFY_KEY");
  const amount = formatAmount(order.totalPaid);
  const useExtendedVcode = env.FIUU_EXTENDED_VCODE === "true";
  const baseUrl =
    env.FIUU_PAYMENT_BASE_URL ??
    (env.FIUU_MODE === "production"
      ? "https://pay.fiuu.com/RMS/pay"
      : "https://sandbox-payment.fiuu.com/RMS/pay");
  const action = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(merchantId)}/`;
  const vcode = md5(`${amount}${merchantId}${order.orderId}${verifyKey}${useExtendedVcode ? FIUU_CURRENCY : ""}`);
  const returnUrl = new URL("/api/fiuu/return", origin).toString();
  const notifyUrl = new URL("/api/fiuu/notify", origin).toString();
  const cancelUrl = new URL(`/payment?cancelled=1&order=${encodeURIComponent(order.orderId)}`, origin).toString();

  return {
    action,
    fields: {
      amount,
      orderid: order.orderId,
      bill_name: order.customer.name,
      bill_email: order.customer.email,
      bill_mobile: order.customer.phone,
      bill_desc: `Ornis safe order: ${summarizeItems(order.items)}`,
      country: "MY",
      currency: FIUU_CURRENCY,
      vcode,
      returnurl: returnUrl,
      callbackurl: notifyUrl,
      cancelurl: cancelUrl,
      s_addr: order.customer.address,
      s_zipcode: order.customer.postcode,
      s_state: order.customer.state,
    },
  };
};

export const parseFiuuResponse = (formData: FormData): FiuuResponse => {
  const get = (name: keyof FiuuResponse) => String(formData.get(name) ?? "").trim();

  return {
    amount: get("amount"),
    orderid: get("orderid"),
    tranID: get("tranID"),
    domain: get("domain"),
    status: get("status"),
    appcode: get("appcode"),
    currency: get("currency"),
    paydate: get("paydate"),
    skey: get("skey"),
    channel: get("channel"),
    error_code: get("error_code"),
    error_desc: get("error_desc"),
  };
};

export const verifyFiuuResponse = (env: RuntimeEnv, response: FiuuResponse) => {
  const merchantId = requireEnv(env, "FIUU_MERCHANT_ID");
  const secretKey = requireEnv(env, "FIUU_SECRET_KEY");
  const key0 = md5(`${response.tranID}${response.orderid}${response.status}${response.domain}${response.amount}${response.currency}`);
  const key1 = md5(`${response.paydate}${response.domain}${key0}${response.appcode}${secretKey}`);

  return response.domain === merchantId && response.skey.toLowerCase() === key1.toLowerCase();
};

export const acknowledgeFiuuIpn = async (env: RuntimeEnv, formData: FormData) => {
  const ackUrl = env.FIUU_IPN_ACK_URL;

  if (!ackUrl) return;

  const payload = new URLSearchParams();
  formData.forEach((value, key) => payload.append(key, String(value)));
  payload.set("treq", "1");

  await fetch(ackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  }).catch(() => undefined);
};
