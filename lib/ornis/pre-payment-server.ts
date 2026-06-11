import type { APIContext } from "astro";
import { upsertPrePaymentInfo } from "./google";
import { getRuntimeEnv } from "./env";
import {
  hasPrePaymentContact,
  isPrePaymentFormComplete,
  type PrePaymentAttribution,
  type PrePaymentCustomer,
  type PrePaymentItem,
  type PrePaymentLead,
  type PrePaymentLeadStatus,
} from "./pre-payment";
import { getRequestGeo, getRequestIpAddress } from "./request-context";
import { upsertNotionCheckoutLead } from "./notion";

export type PrePaymentRequestBody = {
  draftId?: string;
  orderId?: string;
  status?: PrePaymentLeadStatus;
  firstSeenAt?: string;
  submittedAt?: string;
  customer?: Partial<PrePaymentCustomer>;
  items?: PrePaymentItem[];
  quantity?: number;
  promoCode?: string;
  checkoutValue?: number;
  attribution?: Partial<PrePaymentAttribution>;
  fullUrl?: string;
  referrer?: string;
  userAgent?: string;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asNumber = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const normalizeCustomer = (customer?: Partial<PrePaymentCustomer>): PrePaymentCustomer => ({
  name: asString(customer?.name),
  phone: asString(customer?.phone),
  email: asString(customer?.email).toLowerCase(),
  address: asString(customer?.address),
  postcode: asString(customer?.postcode),
  state: asString(customer?.state),
});

const normalizeAttribution = (attribution?: Partial<PrePaymentAttribution>): PrePaymentAttribution => ({
  clid: asString(attribution?.clid),
  fbclid: asString(attribution?.fbclid),
  ttclid: asString(attribution?.ttclid),
  gclid: asString(attribution?.gclid),
  utm_source: asString(attribution?.utm_source),
  utm_medium: asString(attribution?.utm_medium),
  utm_campaign: asString(attribution?.utm_campaign),
});

export const buildPrePaymentLead = (body: PrePaymentRequestBody, context: APIContext): PrePaymentLead => {
  const now = new Date().toISOString();
  const customer = normalizeCustomer(body.customer);
  const items = Array.isArray(body.items)
    ? body.items.map((item) => ({
        id: asString(item.id),
        name: asString(item.name),
        quantity: Math.max(Math.trunc(asNumber(item.quantity)) || 1, 1),
        price: asNumber(item.price),
      }))
    : [];
  const geo = getRequestGeo(context);
  const status =
    body.status === "Submitted to Fiuu"
      ? "Submitted to Fiuu"
      : isPrePaymentFormComplete({ customer })
        ? "Form Complete"
        : "Draft";

  return {
    draftId: asString(body.draftId),
    orderId: asString(body.orderId),
    status,
    firstSeenAt: asString(body.firstSeenAt) || now,
    lastUpdatedAt: now,
    submittedAt: status === "Submitted to Fiuu" ? asString(body.submittedAt) || now : asString(body.submittedAt),
    customer,
    items,
    quantity: Math.max(Math.trunc(asNumber(body.quantity)) || items.reduce((sum, item) => sum + item.quantity, 0), 0),
    promoCode: asString(body.promoCode),
    checkoutValue: asNumber(body.checkoutValue),
    attribution: normalizeAttribution(body.attribution),
    fullUrl: asString(body.fullUrl),
    referrer: asString(body.referrer),
    ipAddress: getRequestIpAddress(context.request),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    userAgent: asString(body.userAgent) || asString(context.request.headers.get("user-agent")),
  };
};

const upsertLeadDestinations = async (context: APIContext, lead: PrePaymentLead) => {
  const env = getRuntimeEnv(context);
  const results = await Promise.allSettled([upsertPrePaymentInfo(env, lead), upsertNotionCheckoutLead(env, lead)]);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Unable to upsert pre-payment lead.", result.reason);
    }
  });

  return {
    sheet: results[0].status === "fulfilled",
    notion: results[1].status === "fulfilled",
  };
};

export const savePrePaymentLead = async (context: APIContext, body: PrePaymentRequestBody) => {
  const lead = buildPrePaymentLead(body, context);

  if (!lead.draftId) {
    throw new Error("Missing draftId.");
  }

  if (!hasPrePaymentContact(lead)) {
    return { lead, saved: false, destinations: { sheet: false, notion: false } };
  }

  const destinations = await upsertLeadDestinations(context, lead);
  return { lead, saved: destinations.sheet || destinations.notion, destinations };
};
