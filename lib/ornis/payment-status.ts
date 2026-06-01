import { findOrderRow, updateOrderPayment } from "./google";
import { sendCustomerPaymentEmail, sendSellerPaymentEmail } from "./notifications";
import { formatAmount, sheetRowToOrder } from "./order";
import type { RuntimeEnv } from "./env";
import { acknowledgeFiuuIpn, parseFiuuResponse, verifyFiuuResponse } from "./fiuu";

export const processFiuuStatusUpdate = async (env: RuntimeEnv, formData: FormData) => {
  await acknowledgeFiuuIpn(env, formData);

  const fiuu = parseFiuuResponse(formData);

  if (!fiuu.orderid) {
    throw new Error("Missing Fiuu order ID.");
  }

  if (!verifyFiuuResponse(env, fiuu)) {
    throw new Error("Invalid Fiuu signature.");
  }

  const existing = await findOrderRow(env, fiuu.orderid);
  const order = existing ? sheetRowToOrder(existing.values) : null;

  if (!order) {
    throw new Error(`Order ${fiuu.orderid} was not found in the order sheet.`);
  }

  if (formatAmount(order.totalPaid) !== formatAmount(Number(fiuu.amount))) {
    throw new Error(`Amount mismatch for ${fiuu.orderid}.`);
  }

  const status = fiuu.status === "00" ? "Paid" : fiuu.status === "22" ? "Pending" : "Failed";
  const existingEmailStatus = existing?.values[20] ?? "";
  let emailStatus = existingEmailStatus;
  let note = fiuu.error_desc || fiuu.error_code || "";

  if (status === "Paid" && existingEmailStatus.toLowerCase() !== "yes") {
    const paymentDetails = {
      status,
      tranId: fiuu.tranID,
      channel: fiuu.channel,
      amount: fiuu.amount,
      paydate: fiuu.paydate,
    };

    try {
      await sendSellerPaymentEmail(env, order, paymentDetails);
      await sendCustomerPaymentEmail(env, order, paymentDetails);
      emailStatus = "Yes";
    } catch (error) {
      emailStatus = `Email failed ${new Date().toISOString()}`;
      const message = error instanceof Error ? error.message : "email failed";
      note = note ? `${note}; ${message}` : message;
    }
  }

  await updateOrderPayment(
    env,
    order,
    {
      status,
      tranId: fiuu.tranID,
      channel: fiuu.channel,
      amount: fiuu.amount,
      paydate: fiuu.paydate,
      note,
    },
    emailStatus,
  );

  return {
    orderId: order.orderId,
    status,
    paid: status === "Paid",
  };
};
