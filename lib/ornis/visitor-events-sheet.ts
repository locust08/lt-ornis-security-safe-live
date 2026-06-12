import { ORNIS_SHEET_ID } from "./catalog";
import { requireEnv, type RuntimeEnv } from "./env";

export type VisitorTrackingEvent = {
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

export type VisitorTrackingGeo = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
};

type SheetMetadata = {
  sheets?: {
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }[];
};

const VISITOR_EVENTS_SHEET_TITLE = "Visitor Events";
const VISITOR_EVENT_COLUMNS = [
  "Event ID",
  "Event Time",
  "Event Name",
  "Visitor ID",
  "Session ID",
  "Full URL",
  "Page Path",
  "Query",
  "Referrer",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "CLID",
  "Platform Click ID",
  "Platform",
  "Contact Type",
  "Destination",
  "Content Name",
  "Placement",
  "IP Address",
  "Country",
  "Region",
  "City",
  "Timezone",
  "User Agent",
  "Language",
  "Screen",
  "Payload",
];

let cachedToken: { value: string; expiresAt: number } | null = null;

const getGoogleAccessToken = async (env: RuntimeEnv) => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

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

  const token = (await response.json()) as GoogleTokenResponse;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  return cachedToken.value;
};

const sheetsRequest = async (env: RuntimeEnv, path: string, init: RequestInit = {}) => {
  const accessToken = await getGoogleAccessToken(env);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID ?? ORNIS_SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Sheets request failed with ${response.status}: ${detail.slice(0, 500)}`);
  }

  return response.json();
};

const encodeSheetRange = (range: string) => encodeURIComponent(range).replace(/'/g, "%27");
const normalizeSheetRow = (row: unknown[]) => row.map((value) => String(value ?? ""));

const getSheetByTitle = async (env: RuntimeEnv, title: string) => {
  const metadata = (await sheetsRequest(env, "?fields=sheets(properties(sheetId,title))")) as SheetMetadata;
  return (metadata.sheets ?? []).find((sheet) => sheet.properties?.title === title)?.properties ?? null;
};

const getOrCreateVisitorEventsSheet = async (env: RuntimeEnv) => {
  const existing = await getSheetByTitle(env, VISITOR_EVENTS_SHEET_TITLE);

  if (existing?.sheetId !== undefined) {
    return {
      sheetId: existing.sheetId,
      title: existing.title ?? VISITOR_EVENTS_SHEET_TITLE,
    };
  }

  const response = (await sheetsRequest(env, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: VISITOR_EVENTS_SHEET_TITLE,
            },
          },
        },
      ],
    }),
  })) as { replies?: Array<{ addSheet?: { properties?: { sheetId?: number; title?: string } } }> };

  const created = response.replies?.[0]?.addSheet?.properties;

  if (created?.sheetId === undefined) {
    throw new Error(`${VISITOR_EVENTS_SHEET_TITLE} sheet could not be created.`);
  }

  return {
    sheetId: created.sheetId,
    title: created.title ?? VISITOR_EVENTS_SHEET_TITLE,
  };
};

const ensureVisitorEventHeaders = async (env: RuntimeEnv) => {
  const sheet = await getOrCreateVisitorEventsSheet(env);
  const headerRange = `'${sheet.title}'!A1:AD1`;
  const data = await sheetsRequest(env, `/values/${encodeSheetRange(headerRange)}?majorDimension=ROWS`);
  const existingHeader = normalizeSheetRow(((data.values ?? []) as unknown[][])[0] ?? []);

  if (VISITOR_EVENT_COLUMNS.every((column, index) => existingHeader[index] === column)) return sheet;

  await sheetsRequest(env, `/values/${encodeSheetRange(headerRange)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [VISITOR_EVENT_COLUMNS] }),
  });

  return sheet;
};

const getPayloadValue = (payload: unknown, key: string) => {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const serializePayload = (payload: unknown) => {
  if (!payload) return "";

  try {
    const text = JSON.stringify(payload);
    return text.length > 45000 ? `${text.slice(0, 44985)}...[truncated]` : text;
  } catch {
    return "";
  }
};

const visitorEventToSheetRow = (event: VisitorTrackingEvent, ipAddress: string, geo: VisitorTrackingGeo) => [
  event.event_id ?? "",
  event.event_time ?? new Date().toISOString(),
  event.event_name ?? "",
  event.visitor_id ?? "",
  event.session_id ?? "",
  event.full_url ?? "",
  event.page_path ?? "",
  event.query ?? "",
  event.referrer ?? "",
  event.utm_source ?? "",
  event.utm_medium ?? "",
  event.utm_campaign ?? "",
  event.utm_content ?? "",
  event.utm_term ?? "",
  event.clid ?? "",
  event.platform_click_id ?? "",
  event.platform ?? "",
  getPayloadValue(event.payload, "contact_type"),
  getPayloadValue(event.payload, "destination"),
  getPayloadValue(event.payload, "content_name"),
  getPayloadValue(event.payload, "placement"),
  ipAddress,
  geo.country ?? "",
  geo.region ?? "",
  geo.city ?? "",
  geo.timezone || event.timezone || "",
  event.user_agent ?? "",
  event.language ?? "",
  event.screen ?? "",
  serializePayload(event.payload),
];

export const appendVisitorEvents = async (
  env: RuntimeEnv,
  events: VisitorTrackingEvent[],
  ipAddress: string,
  geo: VisitorTrackingGeo,
) => {
  if (!events.length) return 0;

  const sheet = await ensureVisitorEventHeaders(env);
  const rowRange = encodeSheetRange(`'${sheet.title}'!A:AD`);

  await sheetsRequest(env, `/values/${rowRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({
      values: events.map((event) => visitorEventToSheetRow(event, ipAddress, geo)),
    }),
  });

  return events.length;
};
