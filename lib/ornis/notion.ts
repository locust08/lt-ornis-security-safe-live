import { type RuntimeEnv } from "./env";
import { type PrePaymentLead } from "./pre-payment";

const NOTION_VERSION = "2022-06-28";

const truncate = (value: unknown, max = 1900) => {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 15)}...[truncated]` : text;
};

const richText = (content: unknown) => ({
  rich_text: truncate(content) ? [{ text: { content: truncate(content) } }] : [],
});

const title = (content: string) => ({
  title: [{ text: { content: truncate(content, 200) || "draft" } }],
});

const select = (name: string) => ({
  select: { name },
});

const status = (name: string) => ({
  status: { name },
});

const date = (start: string) => (start ? { date: { start } } : { date: null });

const email = (value: string) => ({
  email: value || null,
});

const phoneNumber = (value: string) => ({
  phone_number: value || null,
});

const number = (value: number) => ({
  number: Number.isFinite(value) ? value : 0,
});

const notionRequest = async (env: RuntimeEnv, path: string, init: RequestInit) => {
  const token = env.NOTION_TOKEN?.trim();

  if (!token) {
    throw new Error("Missing required environment variable: NOTION_TOKEN");
  }

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Notion request failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
};

type NotionDatabase = {
  properties?: Record<string, { type?: string }>;
};

type NotionPropertyTypes = Record<string, string | undefined>;

const getDatabasePropertyTypes = async (env: RuntimeEnv, databaseId: string): Promise<NotionPropertyTypes> => {
  const database = (await notionRequest(env, `/databases/${databaseId}`, {
    method: "GET",
  })) as NotionDatabase;

  return Object.fromEntries(
    Object.entries(database.properties ?? {}).map(([name, property]) => [name, property.type]),
  );
};

const selectProperty = (name: string, propertyType: string | undefined) =>
  propertyType === "status" ? status(name) : select(name);

const leadProperties = (lead: PrePaymentLead, propertyTypes: NotionPropertyTypes = {}) => ({
  "Draft ID": title(lead.draftId),
  "Order ID": richText(lead.orderId),
  Status: selectProperty(lead.status, propertyTypes.Status),
  "First Seen At": date(lead.firstSeenAt),
  "Last Updated At": date(lead.lastUpdatedAt),
  "Submitted At": date(lead.submittedAt),
  Name: richText(lead.customer.name),
  Phone: phoneNumber(lead.customer.phone),
  Email: email(lead.customer.email),
  Address: richText(lead.customer.address),
  Postcode: richText(lead.customer.postcode),
  State: richText(lead.customer.state),
  Items: richText(lead.items.map((item) => `${item.name || item.id} x ${item.quantity}`).join(", ")),
  Quantity: number(lead.quantity),
  "Promo Code": richText(lead.promoCode),
  "Checkout Value": number(lead.checkoutValue),
  CLID: richText(lead.attribution.clid),
  fbclid: richText(lead.attribution.fbclid),
  ttclid: richText(lead.attribution.ttclid),
  gclid: richText(lead.attribution.gclid),
  "UTM Source": richText(lead.attribution.utm_source),
  "UTM Medium": richText(lead.attribution.utm_medium),
  "UTM Campaign": richText(lead.attribution.utm_campaign),
  "Full URL": richText(lead.fullUrl),
  Referrer: richText(lead.referrer),
  "IP Address": richText(lead.ipAddress),
  Country: richText(lead.country),
  Region: richText(lead.region),
  City: richText(lead.city),
  "User Agent": richText(lead.userAgent),
});

const findCheckoutLeadPageId = async (env: RuntimeEnv, databaseId: string, draftId: string) => {
  const result = (await notionRequest(env, `/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: "Draft ID",
        title: {
          equals: draftId,
        },
      },
      page_size: 1,
    }),
  })) as { results?: { id?: string }[] };

  return result.results?.[0]?.id ?? null;
};

export const upsertNotionCheckoutLead = async (env: RuntimeEnv, lead: PrePaymentLead) => {
  const databaseId = env.NOTION_CHECKOUT_LEADS_DATABASE_ID?.trim();

  if (!databaseId) {
    throw new Error("Missing required environment variable: NOTION_CHECKOUT_LEADS_DATABASE_ID");
  }

  const existingPageId = await findCheckoutLeadPageId(env, databaseId, lead.draftId);
  const propertyTypes = await getDatabasePropertyTypes(env, databaseId);
  const properties = leadProperties(lead, propertyTypes);

  if (existingPageId) {
    await notionRequest(env, `/pages/${existingPageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    return;
  }

  await notionRequest(env, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
};
