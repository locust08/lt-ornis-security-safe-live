"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, MinusIcon, PlusIcon, ShoppingCartIcon, Trash2Icon, TruckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ProductOverviewProps = {
  productItems: {
    id?: string;
    name: string;
    description: string;
    totalReview: number;
    rating: number;
    price: number;
    originalPrice?: number;
    hasDiscount?: boolean;
    discountPercentage?: number;
    images: Array<{
      src: string;
      alt: string;
    }>;
    breadcrumbData: Array<{
      label: string;
      href?: string;
    }>;
    defaultSize?: string;
    defaultColorOption?: string;
    color?: string;
    specs?: string;
    href?: string;
  }[];
  sizesChart: {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
  colorsChart: {
    value: string;
    label?: string;
    colorOption: string;
    disabled?: boolean;
  }[];
};

type ProductItem = ProductOverviewProps["productItems"][number];

type CartItem = ProductItem & {
  quantity: number;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

const ORNIS_PROMO_CODE = "ORNIS45";

const withPromoCode = (href: string, promoCode: string) =>
  `${href}${href.includes("?") ? "&" : "?"}promo=${encodeURIComponent(promoCode)}`;

const ProductOverview = ({ productItems, colorsChart, sizesChart }: ProductOverviewProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCartNotice, setShowCartNotice] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const cartNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeProduct = productItems[activeIndex] ?? productItems[0];

  const couponApplied = couponCode.trim().toLowerCase() === ORNIS_PROMO_CODE.toLowerCase();
  const listPrice = activeProduct.originalPrice ?? activeProduct.price;
  const couponPrice = activeProduct.price;
  const finalPrice = couponApplied ? couponPrice : listPrice;
  const discountPercentage = useMemo(() => {
    if (activeProduct.discountPercentage) return activeProduct.discountPercentage;
    if (!activeProduct.hasDiscount || listPrice <= couponPrice) return 0;

    return Math.round(((listPrice - couponPrice) / listPrice) * 100);
  }, [activeProduct.discountPercentage, activeProduct.hasDiscount, couponPrice, listPrice]);
  const hasDiscount = couponApplied && activeProduct.hasDiscount && listPrice > couponPrice;
  const activeImage = activeProduct.images[0];
  const activeColor = activeProduct.defaultColorOption ?? activeProduct.color;
  const activeSize = activeProduct.defaultSize;
  const productHref = couponApplied
    ? withPromoCode(activeProduct.href ?? "/payment", ORNIS_PROMO_CODE)
    : (activeProduct.href ?? "#");
  const getItemListPrice = (item: ProductItem) => item.originalPrice ?? item.price;
  const getItemPrice = (item: ProductItem) => (couponApplied ? item.price : getItemListPrice(item));
  const getTrackingItem = (item: ProductItem, quantity = 1) => ({
    item_id: item.id ?? item.name,
    item_name: item.name,
    item_variant: [item.defaultSize, item.defaultColorOption ?? item.color].filter(Boolean).join(" / "),
    price: getItemPrice(item),
    quantity,
  });
  const pushEcommerceEvent = (event: "add_to_cart" | "begin_checkout", items: Array<{ item: ProductItem; quantity: number }>) => {
    if (typeof window === "undefined") return;

    const trackingItems = items.map(({ item, quantity }) => getTrackingItem(item, quantity));
    const value = trackingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event,
      currency: "MYR",
      value,
      ecommerce: {
        currency: "MYR",
        value,
        items: trackingItems,
      },
    });
  };

  const switchProduct = (nextSize?: string, nextColor?: string) => {
    const match = productItems.findIndex(
      (item) =>
        (!nextSize || item.defaultSize === nextSize) &&
        (!nextColor || (item.defaultColorOption ?? item.color) === nextColor),
    );

    if (match >= 0) setActiveIndex(match);
  };

  const switchModel = (nextSize: string) => {
    switchProduct(nextSize, activeColor);
  };

  const addToCart = () => {
    pushEcommerceEvent("add_to_cart", [{ item: activeProduct, quantity: 1 }]);

    setCartItems((items) => {
      const existingItem = items.find((item) => (item.id ?? item.name) === (activeProduct.id ?? activeProduct.name));

      if (existingItem) {
        return items.map((item) =>
          (item.id ?? item.name) === (activeProduct.id ?? activeProduct.name)
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...items, { ...activeProduct, quantity: 1 }];
    });
    setShowCartNotice(true);
    if (cartNoticeTimeoutRef.current) {
      clearTimeout(cartNoticeTimeoutRef.current);
    }
    cartNoticeTimeoutRef.current = setTimeout(() => setShowCartNotice(false), 1800);
    setIsCartOpen(true);
  };

  const updateCartQuantity = (itemKey: string, quantity: number) => {
    setCartItems((items) =>
      items
        .map((item) => ((item.id ?? item.name) === itemKey ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + getItemPrice(item) * item.quantity, 0);
  const cartItemParam = cartItems
    .map((item) => `${encodeURIComponent(item.id ?? item.name)}:${item.quantity}`)
    .join(",");
  const baseCheckoutHref =
    cartItems.length === 1
      ? `/payment?items=${cartItemParam}`
      : `/payment?items=${cartItemParam}`;
  const checkoutHref = couponApplied
    ? withPromoCode(baseCheckoutHref, ORNIS_PROMO_CODE)
    : baseCheckoutHref;

  useEffect(() => {
    const promo = new URLSearchParams(window.location.search).get("promo");

    if (promo?.trim().toLowerCase() === ORNIS_PROMO_CODE.toLowerCase()) {
      setCouponCode(ORNIS_PROMO_CODE);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cartNoticeTimeoutRef.current) {
        clearTimeout(cartNoticeTimeoutRef.current);
      }
    };
  }, []);

  const trackBuyNow = () => {
    pushEcommerceEvent("begin_checkout", [{ item: activeProduct, quantity: 1 }]);
  };

  const trackCartCheckout = () => {
    pushEcommerceEvent(
      "begin_checkout",
      cartItems.map((item) => ({ item, quantity: item.quantity })),
    );
  };

  return (
    <section className="relative bg-background py-8 sm:py-14 lg:py-20" aria-labelledby="choose-ornis">
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className={cn(
          "fixed bottom-5 right-4 z-[70] inline-flex size-12 items-center justify-center rounded-full border border-[#0e5963]/15 bg-white/90 text-[#0e5963] shadow-[0_1rem_2rem_rgba(52,40,31,0.16)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-[#0e5963] hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0e5963]/30 sm:bottom-6 sm:right-6",
          showCartNotice && "scale-110 ring-4 ring-[#955f69]/20",
        )}
        aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
      >
        <ShoppingCartIcon className="size-5" />
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#955f69] px-1 text-xs font-bold leading-none text-white">
            {cartCount}
          </span>
        )}
        <span
          className={cn(
            "pointer-events-none absolute bottom-[calc(100%+0.55rem)] right-0 rounded-full bg-[#1f2020] px-3 py-1 text-xs font-bold text-white shadow-lg transition-all duration-300",
            showCartNotice ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          Added
        </span>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[80] transition-opacity duration-300 ease-out",
          isCartOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-sidebar-title"
        aria-hidden={!isCartOpen}
      >
          <button
            type="button"
            className="absolute inset-0 bg-[#1f2020]/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
            tabIndex={isCartOpen ? 0 : -1}
          />
          <aside
            className={cn(
              "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#0e5963]/12 bg-[#f6f1ea] shadow-[0_0_4rem_rgba(31,32,32,0.22)] transition-transform duration-300 ease-out",
              isCartOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="flex items-center justify-between border-b border-[#0e5963]/12 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-[#955f69]">Your cart</p>
                <h2 id="cart-sidebar-title" className="text-2xl font-semibold text-[#1f2020]">
                  Selected Ornis safes
                </h2>
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full bg-white/75"
                aria-label="Close cart"
                onClick={() => setIsCartOpen(false)}
                tabIndex={isCartOpen ? 0 : -1}
              >
                <XIcon />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {cartItems.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div className="max-w-xs">
                    <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-white/80 text-[#0e5963] shadow-sm">
                      <ShoppingCartIcon className="size-6" />
                    </div>
                    <p className="text-lg font-semibold text-[#1f2020]">Your cart is empty</p>
                    <p className="mt-2 text-sm leading-6 text-[#665d57]">
                      Choose a model below and press Add to Cart to keep it here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const itemKey = item.id ?? item.name;
                    const itemImage = item.images[0];
                    const itemListPrice = getItemListPrice(item);
                    const itemUnitPrice = getItemPrice(item);

                    return (
                      <article key={itemKey} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-md border border-[#0e5963]/12 bg-white/62 p-3 shadow-sm">
                        <div className="grid aspect-square place-items-center overflow-hidden rounded-md bg-[#eee9e3]">
                          <img src={itemImage.src} alt={itemImage.alt} className="max-h-16 max-w-[82%] object-contain drop-shadow-md" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-[#1f2020]">{item.name}</h3>
                              <p className="mt-1 text-sm text-[#665d57]">{item.specs}</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-[#955f69] transition-colors hover:bg-[#955f69]/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#955f69]/25"
                              aria-label={`Remove ${item.name} from cart`}
                              onClick={() => updateCartQuantity(itemKey, 0)}
                              tabIndex={isCartOpen ? 0 : -1}
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="inline-flex items-center rounded-full border border-[#0e5963]/14 bg-[#f6f1ea]">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full text-[#0e5963] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0e5963]/25"
                                aria-label={`Decrease quantity for ${item.name}`}
                                onClick={() => updateCartQuantity(itemKey, item.quantity - 1)}
                                tabIndex={isCartOpen ? 0 : -1}
                              >
                                <MinusIcon className="size-3.5" />
                              </button>
                              <span className="min-w-8 text-center text-sm font-bold text-[#1f2020]">{item.quantity}</span>
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full text-[#0e5963] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0e5963]/25"
                                aria-label={`Increase quantity for ${item.name}`}
                                onClick={() => updateCartQuantity(itemKey, item.quantity + 1)}
                                tabIndex={isCartOpen ? 0 : -1}
                              >
                                <PlusIcon className="size-3.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              {couponApplied && itemListPrice > itemUnitPrice && (
                                <span className="block text-xs font-semibold text-[#8b7d78] line-through">
                                  {formatRM(itemListPrice * item.quantity)}
                                </span>
                              )}
                              <strong className="text-lg text-[#1f2020]">{formatRM(itemUnitPrice * item.quantity)}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#0e5963]/12 bg-white/60 px-5 py-5">
              <div className="mb-4 flex items-center justify-between text-[#1f2020]">
                <span className="font-semibold">Subtotal</span>
                <strong className="text-2xl">{formatRM(cartTotal)}</strong>
              </div>
              <Button
                size="lg"
                className="w-full rounded-md"
                disabled={cartItems.length === 0}
                asChild={cartItems.length > 0}
                tabIndex={isCartOpen ? 0 : -1}
              >
                {cartItems.length > 0 ? <a href={checkoutHref} onClick={trackCartCheckout}>Checkout</a> : <span>Checkout</span>}
              </Button>
            </div>
          </aside>
        </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] md:gap-12 xl:gap-20">
          <div className="flex flex-col gap-6">
            <div
              id="ornis-product-preview"
              className="relative grid min-h-[14rem] place-items-center overflow-hidden rounded-md bg-[#eee9e3] p-3 sm:min-h-[28rem] lg:min-h-[34rem]"
            >
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="h-auto max-h-[12rem] w-auto max-w-[92%] object-contain drop-shadow-[0_1.5rem_2rem_rgba(38,37,34,0.18)] sm:max-h-[25rem] lg:max-h-[32rem]"
              />
            </div>
          </div>

          <div className="space-y-6 py-2 md:py-5">
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-normal text-[#955f69]">Premium fire-resistant safe</p>
              <h2 id="choose-ornis" className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                {activeProduct.name}
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-lg font-semibold">Choose Model</h3>
                <p className="text-right text-sm text-muted-foreground">{activeProduct.specs}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sizesChart.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => switchModel(item.value)}
                    disabled={item.disabled}
                    className={cn(
                      "border-input group relative flex aspect-[3.4/1] cursor-pointer items-center gap-2 rounded-md border bg-white/60 px-4 py-2 text-center text-sm font-medium shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
                      activeSize === item.value && "border-primary bg-white/80",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border transition-all",
                        activeSize === item.value ? "border-primary" : "border-[#0e5963]/35",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2.5 rounded-full transition-all",
                          activeSize === item.value ? "bg-primary" : "bg-transparent",
                        )}
                      />
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="max-w-xl text-muted-foreground">{activeProduct.description}</p>

            <Separator />

            <div className="flex flex-wrap items-center gap-5">
              <h3 className="text-lg font-semibold">Color:</h3>
              <RadioGroup className="flex" value={activeColor} onValueChange={(value) => switchProduct(activeSize, value)}>
                {colorsChart.map((colorItem) => (
                  <label
                    key={colorItem.value}
                    className={cn(
                      "relative grid size-9 cursor-pointer place-items-center rounded-full border border-transparent text-center transition-all outline-none has-data-[state=checked]:border-primary has-data-[state=checked]:bg-white/70 has-data-[state=checked]:shadow-sm has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50",
                    )}
                    title={colorItem.label ?? colorItem.value}
                  >
                    <span
                      className={cn(
                        "block size-6 rounded-full shadow-xs",
                      colorItem.colorOption,
                    )}
                    />
                    <RadioGroupItem
                      value={colorItem.value}
                      className="sr-only after:absolute after:inset-0"
                      aria-label={`color-radio-${colorItem.value}`}
                      disabled={colorItem.disabled}
                    />
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3 rounded-md border border-[#0e5963]/12 bg-white/55 p-4">
              <label htmlFor="ornis-coupon" className="text-sm font-bold uppercase tracking-normal text-[#955f69]">
                Voucher code
              </label>
              <div className="flex min-h-12 items-center gap-3 rounded-md border border-input bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/20">
                <input
                  id="ornis-coupon"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold uppercase text-[#1f2020] outline-none placeholder:normal-case placeholder:text-[#8b7d78]"
                  placeholder="Use code ORNIS45"
                />
                {couponApplied && (
                  <span className="grid size-7 place-items-center rounded-full bg-green-600 text-white" aria-label="Voucher applied">
                    <CheckIcon className="size-4" />
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasDiscount && (
                <span className="coupon-price-strike font-medium text-muted-foreground">{formatRM(listPrice)}</span>
              )}
              <h4 className="text-3xl font-bold text-foreground">{formatRM(finalPrice)}</h4>
              {hasDiscount && (
                <>
                  <Badge className="border-none bg-green-600/10 text-green-700">
                    <CheckIcon className="size-3" />
                    {discountPercentage}% Off
                  </Badge>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button size="lg" className="grow rounded-md hover:-translate-y-0.5 hover:shadow-lg" asChild>
                <a href={productHref} onClick={trackBuyNow}>
                  <ShoppingCartIcon />
                  Buy Now
                </a>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="grow rounded-md hover:-translate-y-0.5 hover:shadow-md"
                onClick={addToCart}
              >
                <ShoppingCartIcon />
                Add to Cart
              </Button>
            </div>

            <Separator />

            <div className="rounded-md border border-border bg-white/45">
              <div className="flex items-center gap-5 px-6 py-4">
                <TruckIcon className="size-7 text-[#0e5963]" />
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold">Free Delivery</p>
                  <p className="text-muted-foreground">Doorstep delivery included across selected areas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductOverview;
