import {
  getAppliedPromoCode,
  getPayableTotal,
  ORNIS_PRODUCTS,
  getProductById,
  getUnitPrice,
  isPromoApplied,
  type OrderLineItem,
} from "./catalog";

export type CustomerDetails = {
  name: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  state: string;
};

export type CheckoutOrder = {
  orderId: string;
  createdAt: string;
  customer: CustomerDetails;
  items: OrderLineItem[];
  promoCode: string;
  promoApplied: boolean;
  shipping: number;
  originalTotal: number;
  finalTotal: number;
  totalPaid: number;
};

export type FiuuPaymentUpdate = {
  status: string;
  tranId: string;
  channel: string;
  amount: string;
  paydate: string;
  note?: string;
};

const getString = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

const randomOrderSuffix = () => {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36).toUpperCase()).join("");
};

export const createOrderId = () => {
  const date = new Date();
  const yyyymmdd = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  return `ORNIS${yyyymmdd}${randomOrderSuffix()}${randomOrderSuffix()}`;
};

export const formatAmount = (value: number) => value.toFixed(2);

export const itemLabel = (item: OrderLineItem) => `${item.model} ${item.color}`;

export const summarizeItems = (items: OrderLineItem[]) =>
  items.map((item) => `${itemLabel(item)} x ${item.quantity}`).join(", ");

const MALAYSIA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

const padTwoDigits = (value: number) => String(value).padStart(2, "0");

const formatCreatedDateTime = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return { date: createdAt, time: "" };
  }

  const malaysiaDate = new Date(date.getTime() + MALAYSIA_UTC_OFFSET_MS);
  const year = malaysiaDate.getUTCFullYear();
  const month = padTwoDigits(malaysiaDate.getUTCMonth() + 1);
  const day = padTwoDigits(malaysiaDate.getUTCDate());
  const hour24 = malaysiaDate.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const minutes = padTwoDigits(malaysiaDate.getUTCMinutes());
  const suffix = hour24 < 12 ? "AM" : "PM";

  return {
    date: `${year}-${month}-${day}`,
    time: `${padTwoDigits(hour12)}:${minutes}${suffix}`,
  };
};

const parseCreatedDateTime = (dateValue: string | undefined, timeValue: string | undefined) => {
  const date = String(dateValue ?? "").trim();
  const time = String(timeValue ?? "").trim();
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!date || !match) return date || new Date().toISOString();

  const [, rawHour, rawMinutes, rawSuffix] = match;
  const [year, month, day] = date.split("-").map(Number);
  const parsedHour = Number(rawHour);
  const minutes = Number(rawMinutes);
  const suffix = rawSuffix.toUpperCase();
  const hour24 = suffix === "AM" ? parsedHour % 12 : (parsedHour % 12) + 12;

  if (![year, month, day, parsedHour, minutes].every(Number.isFinite)) {
    return date;
  }

  return new Date(Date.UTC(year, month - 1, day, hour24, minutes) - MALAYSIA_UTC_OFFSET_MS).toISOString();
};

export const parseOrderFromFormData = (formData: FormData): CheckoutOrder => {
  const customer: CustomerDetails = {
    name: getString(formData, "name"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email").toLowerCase(),
    address: getString(formData, "address"),
    postcode: getString(formData, "postcode"),
    state: getString(formData, "state"),
  };
  const missingCustomerField = Object.entries(customer).find(([, value]) => !value)?.[0];

  if (missingCustomerField) {
    throw new Error(`Please fill in ${missingCustomerField}.`);
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) {
    throw new Error("Please enter a valid email address.");
  }

  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("quantity").map((value) => Number(value));

  if (itemIds.length === 0) {
    throw new Error("Please choose at least one Ornis safe.");
  }

  const items: OrderLineItem[] = [];

  itemIds.forEach((itemId, index) => {
    const product = getProductById(itemId);
    const quantity = Math.trunc(quantities[index] ?? 1);

    if (!product) {
      throw new Error("One of the selected products is unavailable.");
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error(`Please choose a valid quantity for ${product.model} ${product.color}.`);
    }

    if (quantity > product.stock) {
      throw new Error(`Sorry, there isn't enough stock available for ${product.model} ${product.color}.`);
    }

    items.push({ ...product, quantity });
  });

  const promoCode = getAppliedPromoCode(getString(formData, "promoCode"));
  const promoApplied = isPromoApplied(promoCode);
  const originalTotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const finalTotal = items.reduce((sum, item) => sum + getUnitPrice(item, promoCode) * item.quantity, 0);
  const shipping = 0;
  const totalPaid = getPayableTotal(items, promoCode, shipping);

  return {
    orderId: createOrderId(),
    createdAt: new Date().toISOString(),
    customer,
    items,
    promoCode,
    promoApplied,
    shipping,
    originalTotal,
    finalTotal,
    totalPaid,
  };
};

export const orderToSheetRow = (
  order: CheckoutOrder,
  status: string,
  payment?: Partial<FiuuPaymentUpdate>,
  emailStatus = "",
) => {
  const created = formatCreatedDateTime(order.createdAt);
  const firstItem = order.items[0];
  const productSummary = order.items.map((item) => `${item.model} x ${item.quantity}`).join(", ");
  const colorSummary = order.items.map((item) => item.color).join(", ");
  const originalUnitSummary = order.items.map((item) => item.originalPrice).join(", ");
  const finalUnitSummary = order.items.map((item) => getUnitPrice(item, order.promoCode)).join(", ");

  return [
    order.orderId,
    created.date,
    created.time,
    status,
    order.orderId,
    payment?.tranId ?? "",
    payment?.channel ?? "",
    order.customer.name,
    order.customer.phone,
    order.customer.email,
    order.customer.address,
    order.customer.postcode,
    order.customer.state,
    productSummary || firstItem?.model || "",
    colorSummary || firstItem?.color || "",
    order.items.reduce((sum, item) => sum + item.quantity, 0),
    originalUnitSummary,
    order.promoCode,
    finalUnitSummary,
    order.shipping,
    order.totalPaid,
    emailStatus,
    new Date().toISOString(),
    payment?.note ?? summarizeItems(order.items),
  ];
};

const parseNumber = (value: string | undefined) => Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;

const hasCreatedTimeColumn = (values: string[]) => !["paid", "pending", "failed"].includes(String(values[2] ?? "").toLowerCase());

export const sheetRowToOrder = (values: string[]): CheckoutOrder | null => {
  const offset = hasCreatedTimeColumn(values) ? 1 : 0;
  const productParts = String(values[12 + offset] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const colorParts = String(values[13 + offset] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const originalPrices = String(values[15 + offset] ?? "")
    .split(",")
    .map((part) => parseNumber(part));
  const finalPrices = String(values[17 + offset] ?? "")
    .split(",")
    .map((part) => parseNumber(part));
  const items: OrderLineItem[] = [];

  productParts.forEach((part, index) => {
    const match = part.match(/^(OR\s+(?:310|530))(?:\s+x\s+(\d+))?/i);
    const model = match?.[1]?.toUpperCase().replace(/\s+/, " ") as OrderLineItem["model"] | undefined;
    const color = colorParts[index] as OrderLineItem["color"] | undefined;
    const quantity = Number(match?.[2] ?? 1);
    const product = ORNIS_PRODUCTS.find((item) => item.model === model && item.color === color);

    if (product) {
      items.push({ ...product, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1 });
    }
  });

  if (items.length === 0) return null;

  items.forEach((item, index) => {
    if (Number.isFinite(originalPrices[index]) && originalPrices[index] > 0) item.originalPrice = originalPrices[index];
    if (Number.isFinite(finalPrices[index])) {
      item.discountedPrice = finalPrices[index];
      item.dealerDiscountedPrice = finalPrices[index];
    }
  });

  return {
    orderId: values[0] ?? "",
    createdAt: offset ? parseCreatedDateTime(values[1], values[2]) : values[1] ?? new Date().toISOString(),
    customer: {
      name: values[6 + offset] ?? "",
      phone: values[7 + offset] ?? "",
      email: values[8 + offset] ?? "",
      address: values[9 + offset] ?? "",
      postcode: values[10 + offset] ?? "",
      state: values[11 + offset] ?? "",
    },
    items,
    promoCode: values[16 + offset] ?? "",
    promoApplied: isPromoApplied(values[16 + offset]),
    shipping: parseNumber(values[18 + offset]),
    originalTotal: items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0),
    finalTotal: parseNumber(values[19 + offset]),
    totalPaid: parseNumber(values[19 + offset]),
  };
};
