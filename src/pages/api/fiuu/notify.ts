import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/ornis/env";
import { processFiuuStatusUpdate } from "@/lib/ornis/payment-status";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const formData = await context.request.formData();

    await processFiuuStatusUpdate(env, formData);

    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fiuu notification failed.";
    return new Response(message, { status: 400 });
  }
};
