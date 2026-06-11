import type { APIRoute } from "astro";
import { savePrePaymentLead, type PrePaymentRequestBody } from "@/lib/ornis/pre-payment-server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = (await context.request.json()) as PrePaymentRequestBody;
    const result = await savePrePaymentLead(context, body);

    return new Response(
      JSON.stringify({
        ok: true,
        saved: result.saved,
        destinations: result.destinations,
        status: result.lead.status,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unable to save pre-payment lead.", error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
};
