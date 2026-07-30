import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/ornis/env";
import { processFiuuStatusUpdate } from "@/lib/ornis/payment-status";
import { getPostHogServer } from "@/lib/posthog-server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const formData = await context.request.formData();

    const result = await processFiuuStatusUpdate(env, formData);

    const posthog = getPostHogServer();
    if (result.paid) {
      posthog.capture({
        distinctId: result.orderId,
        event: "payment_confirmed",
        properties: {
          order_id: result.orderId,
          status: result.status,
        },
      });
    } else if (result.status === "Failed") {
      posthog.capture({
        distinctId: result.orderId,
        event: "payment_failed",
        properties: {
          order_id: result.orderId,
          status: result.status,
        },
      });
    }
    await posthog.flush();

    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fiuu notification failed.";
    return new Response(message, { status: 400 });
  }
};
