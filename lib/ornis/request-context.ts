import type { APIRoute } from "astro";

type CloudflareRequest = Request & {
  cf?: Record<string, unknown>;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const getRequestIpAddress = (request: Request) => {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    forwardedFor.split(",")[0]?.trim() ??
    ""
  );
};

export const getRequestGeo = (context: Parameters<APIRoute>[0]) => {
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
