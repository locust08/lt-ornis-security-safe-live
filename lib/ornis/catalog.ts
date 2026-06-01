export type OrnisProduct = {
  id: string;
  model: "OR 310" | "OR 530";
  color: "Emerald" | "Ruby";
  originalPrice: number;
  discountedPrice: number;
  stock: number;
  image: string;
  specs: string;
};

export type OrderLineItem = OrnisProduct & {
  quantity: number;
};

export const ORNIS_PROMO_CODE = "ORNIS45";
export const ORNIS_SHEET_ID = "1Mp2uefJ9T0tCzqzNZ3mfoCj0YPbj62tu-Zmmb_a3PRo";

export const ORNIS_PRODUCTS: OrnisProduct[] = [
  {
    id: "or-emerald-530",
    model: "OR 530",
    color: "Emerald",
    originalPrice: 3160,
    discountedPrice: 1800,
    stock: 16,
    image: "/ornis/or-emerald-530-hd.png",
    specs: "530 x 435 x 463 mm / 40.87L",
  },
  {
    id: "or-ruby-530",
    model: "OR 530",
    color: "Ruby",
    originalPrice: 3160,
    discountedPrice: 1800,
    stock: 25,
    image: "/ornis/or-ruby-530-hd.png",
    specs: "530 x 435 x 463 mm / 40.87L",
  },
  {
    id: "or-emerald-310",
    model: "OR 310",
    color: "Emerald",
    originalPrice: 2690,
    discountedPrice: 1500,
    stock: 69,
    image: "/ornis/or-emerald-310-hd.png",
    specs: "310 x 420 x 378 mm / 15.12L",
  },
  {
    id: "or-ruby-310",
    model: "OR 310",
    color: "Ruby",
    originalPrice: 2690,
    discountedPrice: 1500,
    stock: 62,
    image: "/ornis/or-ruby-310-hd.png",
    specs: "310 x 420 x 378 mm / 15.12L",
  },
];

export const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

export const getProductById = (id: string) => ORNIS_PRODUCTS.find((product) => product.id === id);

export const isPromoApplied = (promoCode: string | null | undefined) =>
  promoCode?.trim().toUpperCase() === ORNIS_PROMO_CODE;

export const getUnitPrice = (product: OrnisProduct, promoApplied: boolean) =>
  promoApplied ? product.discountedPrice : product.originalPrice;

export const parseCheckoutItems = (searchParams: URLSearchParams): OrderLineItem[] => {
  const itemParam = searchParams.get("items");
  const modelParam = searchParams.get("model");
  const modelsParam = searchParams.get("models");
  const parsedItems: OrderLineItem[] = [];

  const addItem = (rawId: string, quantity = 1) => {
    const product = getProductById(rawId.trim());
    const safeQuantity = Math.min(Math.max(Math.trunc(quantity) || 1, 1), product?.stock ?? 1);

    if (!product) return;

    const existing = parsedItems.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + safeQuantity, product.stock);
      return;
    }

    parsedItems.push({ ...product, quantity: safeQuantity });
  };

  if (itemParam) {
    for (const part of itemParam.split(",")) {
      const [id, rawQuantity] = part.split(":");
      addItem(id, Number(rawQuantity));
    }
  } else if (modelsParam) {
    for (const id of modelsParam.split(",")) {
      addItem(decodeURIComponent(id));
    }
  } else if (modelParam) {
    addItem(modelParam);
  }

  if (parsedItems.length === 0) {
    parsedItems.push({ ...ORNIS_PRODUCTS[0], quantity: 1 });
  }

  return parsedItems;
};
