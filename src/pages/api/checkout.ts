import type { APIRoute } from "astro";
import { getUnitPrice } from "@/lib/ornis/catalog";
import { buildFiuuPaymentRequest } from "@/lib/ornis/fiuu";
import { appendPendingOrder } from "@/lib/ornis/google";
import { getRuntimeEnv } from "@/lib/ornis/env";
import { parseOrderFromFormData } from "@/lib/ornis/order";
import { savePrePaymentLead } from "@/lib/ornis/pre-payment-server";

export const prerender = false;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paymentFormHtml = (action: string, fields: Record<string, string>) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to Fiuu</title>
    <style>
      body {
        display: grid;
        min-height: 100vh;
        place-items: center;
        margin: 0;
        background: #f6f1ea;
        color: #1f2020;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 30rem);
        padding: 2rem;
        border: 1px solid rgba(14, 89, 99, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.74);
        box-shadow: 0 1.25rem 3rem rgba(52, 40, 31, 0.12);
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      p {
        color: #665d57;
        line-height: 1.6;
      }
      button {
        min-height: 3rem;
        padding: 0 1.25rem;
        border: 0;
        border-radius: 8px;
        background: #0e5963;
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Redirecting to secure payment</h1>
      <p>You will be taken to Fiuu's hosted payment page.</p>
      <form id="fiuu-payment-form" action="${escapeHtml(action)}" method="post">
        ${Object.entries(fields)
          .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
          .join("")}
        <button type="submit">Continue to Fiuu</button>
      </form>
    </main>
    <script>
      document.getElementById("fiuu-payment-form")?.submit();
    </script>
  </body>
</html>`;

const getString = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

const saveSubmittedPrePaymentLead = async (context: Parameters<APIRoute>[0], formData: FormData, order: ReturnType<typeof parseOrderFromFormData>) => {
  const draftId = getString(formData, "checkoutDraftId");

  if (!draftId) return;

  const items = order.items.map((item) => ({
    id: item.id,
    name: `${item.model} ${item.color}`,
    quantity: item.quantity,
    price: getUnitPrice(item, order.promoCode),
  }));

  const savePromise = savePrePaymentLead(context, {
    draftId,
    orderId: order.orderId,
    status: "Submitted to Fiuu",
    firstSeenAt: getString(formData, "checkoutFirstSeenAt"),
    submittedAt: new Date().toISOString(),
    customer: order.customer,
    items,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    promoCode: order.promoCode,
    checkoutValue: order.totalPaid,
    attribution: {
      clid: getString(formData, "checkoutClid"),
      fbclid: getString(formData, "checkoutFbclid"),
      ttclid: getString(formData, "checkoutTtclid"),
      gclid: getString(formData, "checkoutGclid"),
      utm_source: getString(formData, "checkoutUtmSource"),
      utm_medium: getString(formData, "checkoutUtmMedium"),
      utm_campaign: getString(formData, "checkoutUtmCampaign"),
    },
    fullUrl: getString(formData, "checkoutFullUrl"),
    referrer: getString(formData, "checkoutReferrer"),
    userAgent: getString(formData, "checkoutUserAgent"),
  }).catch((error) => {
    console.error("Unable to save submitted pre-payment lead.", error);
  });

  await Promise.race([
    savePromise,
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
};

export const POST: APIRoute = async (context) => {
  try {
    const env = getRuntimeEnv(context);
    const formData = await context.request.formData();
    const order = parseOrderFromFormData(formData);

    await saveSubmittedPrePaymentLead(context, formData, order);

    const paymentRequest = buildFiuuPaymentRequest(env, order, context.url.origin);

    await appendPendingOrder(env, order);

    return new Response(paymentFormHtml(paymentRequest.action, paymentRequest.fields), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";

    return new Response(
      `<!doctype html><html><body><h1>Checkout could not start</h1><p>${escapeHtml(message)}</p><p><a href="/payment">Return to checkout</a></p></body></html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
};
