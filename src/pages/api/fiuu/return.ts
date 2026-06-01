import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/ornis/env";
import { processFiuuStatusUpdate } from "@/lib/ornis/payment-status";

export const prerender = false;

const redirectToThankYou = (origin: string, orderId: string, status: string) =>
  Response.redirect(new URL(`/thank-you?order=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}`, origin), 303);

export const POST: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const formData = await context.request.formData();
    const result = await processFiuuStatusUpdate(env, formData);

    return redirectToThankYou(context.url.origin, result.orderId, result.status);
  } catch {
    return redirectToThankYou(context.url.origin, "", "Pending");
  }
};

export const GET: APIRoute = async (context) => redirectToThankYou(context.url.origin, "", "Pending");
