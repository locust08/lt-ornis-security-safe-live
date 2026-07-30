export type ServerTrackingEvent = {
  event_id?: string;
  event_name?: string;
  session_id?: string;
  visitor_id?: string;
  page_path?: string;
  payload?: unknown;
};

const DEDUPED_EVENT_NAMES = new Set(["begin_checkout"]);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const hashText = (text: string) => {
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
};

const normalizeContents = (contents: unknown) => {
  if (!Array.isArray(contents)) return [];

  return contents
    .map((item) => {
      const record = asRecord(item);
      const id = String(record.id ?? record.item_id ?? "");
      const quantity = Number(record.quantity ?? 1) || 1;
      const price = Number(record.item_price ?? record.price ?? 0) || 0;

      return { id, quantity, item_price: price };
    })
    .filter((item) => item.id)
    .sort((left, right) => left.id.localeCompare(right.id));
};

const getCommercePayloadSignature = (payload: Record<string, unknown>) => ({
  contents: normalizeContents(payload.contents),
  currency: String(payload.currency ?? ""),
  value: Number(payload.value ?? 0) || 0,
  coupon: String(payload.coupon ?? ""),
});

export const getServerTrackingEventId = (event: ServerTrackingEvent) => {
  const existingEventId = event.event_id?.trim();
  const eventName = event.event_name?.trim() || "page_view";

  if (existingEventId && !DEDUPED_EVENT_NAMES.has(eventName)) return existingEventId;
  if (!DEDUPED_EVENT_NAMES.has(eventName)) return "";

  const payload = asRecord(event.payload);
  const dedupePayload = eventName === "begin_checkout" ? getCommercePayloadSignature(payload) : payload;
  const dedupeKey = stableStringify({
    event_name: eventName,
    session_id: event.session_id ?? "",
    visitor_id: event.session_id ? "" : (event.visitor_id ?? ""),
    payload: dedupePayload,
  });

  return `dedupe_${eventName}_${hashText(dedupeKey)}`;
};

