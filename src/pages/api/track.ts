import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/ornis/env";
import { appendVisitorEvents, type VisitorTrackingEvent } from "@/lib/ornis/visitor-events-sheet";

export const prerender = false;

const NOTION_VERSION = "2022-06-28";
const DEFAULT_NOTION_VISITOR_EVENTS_DATABASE_ID = "2bddfa78b664460ab518e6112626ed2b";
const EVENT_NAMES = new Set([
  "page_view",
  "view_content",
  "promo_view",
  "promo_dismiss",
  "cta_click",
  "contact_click",
  "section_view",
  "whatsapp_click",
  "whatsapp_redirect",
  "footer_link_click",
  "product_customize",
  "add_to_cart",
  "cart_quantity_update",
  "voucher_apply",
  "begin_checkout",
  "add_payment_info",
  "purchase",
  "policy_tab_view",
]);
const PLATFORMS = new Set(["Meta", "TikTok", "Google", "Unknown"]);

type TrackingEvent = {
  event_id?: string;
  event_time?: string;
  event_name?: string;
  visitor_id?: string;
  session_id?: string;
  full_url?: string;
  page_path?: string;
  query?: string;
  referrer?: string;
  user_agent?: string;
  language?: string;
  screen?: string;
  timezone?: string;
  clid?: string;
  platform_click_id?: string;
  platform?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  payload?: unknown;
};

type TrackingRequestBody = TrackingEvent | TrackingEvent[] | { events?: TrackingEvent[] };

type CloudflareRequest = Request & {
  cf?: Record<string, unknown>;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const truncate = (value: unknown, max = 1900) => {
  const text = asString(value);
  return text.length > max ? `${text.slice(0, max - 15)}...[truncated]` : text;
};

const richText = (content: unknown) => ({
  rich_text: truncate(content) ? [{ text: { content: truncate(content) } }] : [],
});

const title = (content: string) => ({
  title: [{ text: { content: truncate(content, 200) || "event" } }],
});

const select = (name: string) => ({
  select: { name },
});

const date = (start: string) => ({
  date: { start },
});

const getIpAddress = (request: Request) => {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    forwardedFor.split(",")[0]?.trim() ??
    ""
  );
};

const getCloudflareGeo = (context: Parameters<APIRoute>[0]) => {
  const requestCf = (context.request as CloudflareRequest).cf;
  const runtimeCf = (context.locals as { runtime?: { cf?: Record<string, unknown> } } | undefined)?.runtime?.cf;
  const cf = requestCf ?? runtimeCf ?? {};

  return {
    country: asString(cf.country) || asString(context.request.headers.get("cf-ipcountry")),
    region: asString(cf.region),
    city: asString(cf.city),
    timezone: asString(cf.timezone),
    latitude: asString(cf.latitude),
    longitude: asString(cf.longitude),
    colo: asString(cf.colo),
  };
};

const jsonPayload = (event: TrackingEvent, ipAddress: string, geo: ReturnType<typeof getCloudflareGeo>) => {
  const body = {
    client: {
      language: event.language ?? "",
      screen: event.screen ?? "",
      timezone: event.timezone ?? "",
      query: event.query ?? "",
    },
    geo,
    request: {
      ip_address: ipAddress,
      received_at: new Date().toISOString(),
    },
    payload: event.payload ?? {},
  };
  const text = JSON.stringify(body);
  return text.length > 1900 ? `${text.slice(0, 1885)}...[truncated]` : text;
};

const getTrackingEvents = (body: TrackingRequestBody) => {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)) {
    return (body as { events: TrackingEvent[] }).events;
  }
  return [body as TrackingEvent];
};

const createNotionVisitorEvent = async (
  event: TrackingEvent,
  notionToken: string,
  databaseId: string,
  ipAddress: string,
  geo: ReturnType<typeof getCloudflareGeo>,
) => {
  const eventName = EVENT_NAMES.has(asString(event.event_name)) ? asString(event.event_name) : "page_view";
  const platform = PLATFORMS.has(asString(event.platform)) ? asString(event.platform) : "Unknown";
  const eventTime = asString(event.event_time) || new Date().toISOString();
  const eventId = asString(event.event_id) || crypto.randomUUID();

  return fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        "Event ID": title(eventId),
        "Event Time": date(eventTime),
        "Event Name": select(eventName),
        CLID: richText(event.clid),
        "Platform Click ID": richText(event.platform_click_id),
        Platform: select(platform),
        "Session ID": richText(event.session_id),
        "Visitor ID": richText(event.visitor_id),
        "Full URL": richText(event.full_url),
        "Page Path": richText(event.page_path),
        Referrer: richText(event.referrer),
        "UTM Source": richText(event.utm_source),
        "UTM Medium": richText(event.utm_medium),
        "UTM Campaign": richText(event.utm_campaign),
        "UTM Content": richText(event.utm_content),
        "UTM Term": richText(event.utm_term),
        "IP Address": richText(ipAddress),
        Country: richText(geo.country),
        Region: richText(geo.region),
        City: richText(geo.city),
        Timezone: richText(geo.timezone || event.timezone),
        "User Agent": richText(event.user_agent),
        "Event Payload": richText(jsonPayload(event, ipAddress, geo)),
      },
    }),
  });
};

export const POST: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const notionToken = env.NOTION_TOKEN?.trim();
    const databaseId = env.NOTION_VISITOR_EVENTS_DATABASE_ID?.trim() || DEFAULT_NOTION_VISITOR_EVENTS_DATABASE_ID;
    const sheetsConfigured = Boolean(
      env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
        env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
        env.GOOGLE_WORKSPACE_OAUTH_REFRESH_TOKEN?.trim(),
    );
    const notionConfigured = Boolean(notionToken && databaseId);

    if (!notionConfigured && !sheetsConfigured) {
      return new Response(JSON.stringify({ ok: false, configured: false }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await context.request.json()) as TrackingRequestBody;
    const events = getTrackingEvents(body).filter((event) => event && typeof event === "object").slice(0, 25);
    const ipAddress = getIpAddress(context.request);
    const geo = getCloudflareGeo(context);
    let notionTracked = 0;
    let sheetsTracked = 0;

    if (notionConfigured) {
      for (const event of events) {
        const notionResponse = await createNotionVisitorEvent(event, notionToken!, databaseId!, ipAddress, geo);

        if (!notionResponse.ok) {
          const errorText = await notionResponse.text();
          console.error("Unable to create Notion visitor event.", errorText);
          continue;
        }

        notionTracked += 1;
      }
    }

    if (sheetsConfigured) {
      try {
        sheetsTracked = await appendVisitorEvents(env, events as VisitorTrackingEvent[], ipAddress, geo);
      } catch (error) {
        console.error("Unable to append Google Sheets visitor events.", error);
      }
    }

    return new Response(JSON.stringify({ ok: true, received: events.length, notionTracked, sheetsTracked }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unable to track visitor event.", error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
};
