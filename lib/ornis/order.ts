import {
  getAppliedPromoCode,
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
      throw new Error(`Only ${product.stock} units of ${product.model} ${product.color} are available.`);
    }

    items.push({ ...product, quantity });
  });

  const promoCode = getAppliedPromoCode(getString(formData, "promoCode"));
  const promoApplied = isPromoApplied(promoCode);
  const originalTotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const finalTotal = items.reduce((sum, item) => sum + getUnitPrice(item, promoCode) * item.quantity, 0);
  const shipping = 0;

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
    totalPaid: finalTotal + shipping,
  };
};

export const orderToSheetRow = (
  order: CheckoutOrder,
  status: string,
  payment?: Partial<FiuuPaymentUpdate>,
  emailStatus = "",
) => {
  const firstItem = order.items[0];
  const productSummary = order.items.map((item) => `${item.model} x ${item.quantity}`).join(", ");
  const colorSummary = order.items.map((item) => item.color).join(", ");
  const originalUnitSummary = order.items.map((item) => item.originalPrice).join(", ");
  const finalUnitSummary = order.items.map((item) => getUnitPrice(item, order.promoCode)).join(", ");

  return [
    order.orderId,
    order.createdAt,
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

export const sheetRowToOrder = (values: string[]): CheckoutOrder | null => {
  const productParts = String(values[12] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const colorParts = String(values[13] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const originalPrices = String(values[15] ?? "")
    .split(",")
    .map((part) => parseNumber(part));
  const finalPrices = String(values[17] ?? "")
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
    if (Number.isFinite(finalPrices[index])) item.discountedPrice = finalPrices[index];
  });

  return {
    orderId: values[0] ?? "",
    createdAt: values[1] ?? new Date().toISOString(),
    customer: {
      name: values[6] ?? "",
      phone: values[7] ?? "",
      email: values[8] ?? "",
      address: values[9] ?? "",
      postcode: values[10] ?? "",
      state: values[11] ?? "",
    },
    items,
    promoCode: values[16] ?? "",
    promoApplied: isPromoApplied(values[16]),
    shipping: parseNumber(values[18]),
    originalTotal: items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0),
    finalTotal: parseNumber(values[19]),
    totalPaid: parseNumber(values[19]),
  };
};
