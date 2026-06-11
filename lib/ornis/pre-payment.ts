export type PrePaymentLeadStatus = "Draft" | "Form Complete" | "Submitted to Fiuu" | "Paid" | "Failed" | "Cancelled";

export type PrePaymentItem = {
  id: string;
  name?: string;
  quantity: number;
  price: number;
};

export type PrePaymentCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  state: string;
};

export type PrePaymentAttribution = {
  clid: string;
  fbclid: string;
  ttclid: string;
  gclid: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export type PrePaymentLead = {
  draftId: string;
  orderId: string;
  status: PrePaymentLeadStatus;
  firstSeenAt: string;
  lastUpdatedAt: string;
  submittedAt: string;
  customer: PrePaymentCustomer;
  items: PrePaymentItem[];
  quantity: number;
  promoCode: string;
  checkoutValue: number;
  attribution: PrePaymentAttribution;
  fullUrl: string;
  referrer: string;
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  userAgent: string;
};

export const PRE_PAYMENT_INFO_COLUMNS = [
  "Draft ID",
  "Order ID",
  "Status",
  "First Seen At",
  "Last Updated At",
  "Submitted At",
  "Name",
  "Phone",
  "Email",
  "Address",
  "Postcode",
  "State",
  "Items",
  "Quantity",
  "Promo Code",
  "Checkout Value",
  "CLID",
  "fbclid",
  "ttclid",
  "gclid",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Full URL",
  "Referrer",
  "IP Address",
  "Country",
  "Region",
  "City",
  "User Agent",
] as const;

export const hasPrePaymentContact = (lead: Pick<PrePaymentLead, "customer">) =>
  Boolean(lead.customer.name || lead.customer.phone || lead.customer.email);

export const isPrePaymentFormComplete = (lead: Pick<PrePaymentLead, "customer">) =>
  Boolean(
    lead.customer.name &&
      lead.customer.phone &&
      lead.customer.email &&
      lead.customer.address &&
      lead.customer.postcode &&
      lead.customer.state,
  );

export const summarizePrePaymentItems = (items: PrePaymentItem[]) =>
  items.map((item) => `${item.name || item.id} x ${item.quantity}`).join(", ");

export const prePaymentLeadToSheetRow = (lead: PrePaymentLead) => [
  lead.draftId,
  lead.orderId,
  lead.status,
  lead.firstSeenAt,
  lead.lastUpdatedAt,
  lead.submittedAt,
  lead.customer.name,
  lead.customer.phone,
  lead.customer.email,
  lead.customer.address,
  lead.customer.postcode,
  lead.customer.state,
  summarizePrePaymentItems(lead.items),
  lead.quantity,
  lead.promoCode,
  lead.checkoutValue,
  lead.attribution.clid,
  lead.attribution.fbclid,
  lead.attribution.ttclid,
  lead.attribution.gclid,
  lead.attribution.utm_source,
  lead.attribution.utm_medium,
  lead.attribution.utm_campaign,
  lead.fullUrl,
  lead.referrer,
  lead.ipAddress,
  lead.country,
  lead.region,
  lead.city,
  lead.userAgent,
];
