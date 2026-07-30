import assert from "node:assert/strict";
import test from "node:test";

import { getServerTrackingEventId } from "../lib/ornis/tracking-dedupe.ts";

const sessionId = "session_123";
const contents = [{ id: "or-ruby-310", quantity: 1, item_price: 499 }];

test("uses the same server event id for duplicate begin_checkout cart handoffs", () => {
  const productPageId = getServerTrackingEventId({
    event_name: "begin_checkout",
    session_id: sessionId,
    page_path: "/",
    payload: {
      content_ids: ["or-ruby-310"],
      contents,
      content_type: "product",
      currency: "MYR",
      value: 499,
      num_items: 1,
      coupon: "",
    },
  });

  const paymentPageId = getServerTrackingEventId({
    event_name: "begin_checkout",
    session_id: sessionId,
    page_path: "/payment",
    payload: {
      currency: "MYR",
      value: 499,
      contentIds: ["or-ruby-310"],
      contents,
      numItems: 1,
    },
  });

  assert.equal(paymentPageId, productPageId);
});

test("keeps separate begin_checkout ids for different carts", () => {
  const oneItemId = getServerTrackingEventId({
    event_name: "begin_checkout",
    session_id: sessionId,
    payload: {
      contents,
      currency: "MYR",
      value: 499,
    },
  });

  const twoItemId = getServerTrackingEventId({
    event_name: "begin_checkout",
    session_id: sessionId,
    payload: {
      contents: [{ id: "or-ruby-310", quantity: 2, item_price: 499 }],
      currency: "MYR",
      value: 998,
    },
  });

  assert.notEqual(twoItemId, oneItemId);
});

