"use client";

import { useMemo, useState } from "react";
import { CheckIcon, HeartIcon, ShoppingCartIcon, StarIcon, TruckIcon } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

const ProductOverview = ({ productItems, colorsChart, sizesChart }: ProductOverviewProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProduct = productItems[activeIndex] ?? productItems[0];

  const originalPrice = activeProduct.originalPrice ?? activeProduct.price;
  const finalPrice = activeProduct.price;
  const discountPercentage = useMemo(() => {
    if (activeProduct.discountPercentage) return activeProduct.discountPercentage;
    if (!activeProduct.hasDiscount || originalPrice <= finalPrice) return 0;

    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  }, [activeProduct.discountPercentage, activeProduct.hasDiscount, finalPrice, originalPrice]);
  const hasDiscount = activeProduct.hasDiscount && originalPrice > finalPrice;
  const activeImage = activeProduct.images[0];
  const activeColor = activeProduct.defaultColorOption ?? activeProduct.color;
  const activeSize = activeProduct.defaultSize;

  const switchProduct = (nextSize?: string, nextColor?: string) => {
    const match = productItems.findIndex(
      (item) =>
        (!nextSize || item.defaultSize === nextSize) &&
        (!nextColor || (item.defaultColorOption ?? item.color) === nextColor),
    );

    if (match >= 0) setActiveIndex(match);
  };

  return (
    <section className="bg-background py-8 sm:py-14 lg:py-20" aria-labelledby="choose-ornis">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] md:gap-12 xl:gap-20">
          <div className="flex flex-col gap-6">
            <div className="group relative grid min-h-[26rem] place-items-center overflow-hidden rounded-md bg-[#eee9e3] sm:min-h-[34rem]">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="h-auto max-h-[22rem] w-auto max-w-[82%] object-contain drop-shadow-[0_1.5rem_2rem_rgba(38,37,34,0.18)] transition-transform duration-300 group-hover:scale-105 sm:max-h-[30rem] lg:max-h-[34rem]"
              />
              <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0e5963] shadow-sm">
                Hover to zoom
              </div>
            </div>
          </div>

          <div className="space-y-6 py-2 md:py-5">
            <Breadcrumb>
              <BreadcrumbList>
                {activeProduct.breadcrumbData.map((breadcrumb, index) => (
                  <div key={`${breadcrumb.label}-${index}`} className="flex items-center gap-2">
                    <BreadcrumbItem>
                      {index === activeProduct.breadcrumbData.length - 1 ? (
                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={breadcrumb.href || "#"}>{breadcrumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < activeProduct.breadcrumbData.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-normal text-[#955f69]">Premium fire-resistant safe</p>
              <h2 id="choose-ornis" className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                {activeProduct.name}
              </h2>
            </div>

            <div className="flex w-fit items-center rounded-sm border border-border bg-white/55 px-2.5 py-1.5">
              <span className="me-2.5 flex items-center gap-1 border-e border-border pe-2.5 text-sm">
                <span className="text-lg font-medium">{activeProduct.rating}</span>
                <StarIcon className="mb-0.5 size-4 fill-amber-500 stroke-transparent" />
              </span>
              <span className="text-muted-foreground">{activeProduct.totalReview} Reviews</span>
            </div>

            <p className="max-w-xl text-muted-foreground">{activeProduct.description}</p>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-lg font-semibold">Choose Model</h3>
                <p className="text-right text-sm text-muted-foreground">{activeProduct.specs}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {productItems.map((item, index) => (
                  <button
                    key={item.id ?? item.name}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "rounded-md border border-input bg-white/60 px-4 py-3 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                      activeIndex === index && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <h3 className="text-lg font-semibold">Color:</h3>
              <RadioGroup className="flex" value={activeColor} onValueChange={(value) => switchProduct(activeSize, value)}>
                {colorsChart.map((colorItem) => (
                  <label
                    key={colorItem.value}
                    className={cn(
                      "relative size-6 cursor-pointer rounded-full text-center shadow-xs transition-all outline-none has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50",
                      colorItem.colorOption,
                    )}
                    title={colorItem.label ?? colorItem.value}
                  >
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

            <div className="flex flex-wrap items-center gap-5">
              <h3 className="text-lg font-semibold">Size:</h3>
              <RadioGroup className="flex flex-wrap" value={activeSize} onValueChange={(value) => switchProduct(value, activeColor)}>
                {sizesChart.map((sizeItem) => (
                  <label
                    key={sizeItem.value}
                    className="border-input group has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground relative flex cursor-pointer flex-col items-center gap-3 rounded-md border bg-white/60 px-4 py-2 text-center text-sm font-medium shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary has-focus-visible:ring-[3px] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50"
                  >
                    <RadioGroupItem
                      value={sizeItem.value}
                      className="sr-only after:absolute after:inset-0"
                      aria-label={`size-radio-${sizeItem.value}`}
                      disabled={sizeItem.disabled}
                    />
                    {sizeItem.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-3xl font-bold text-foreground">{formatRM(finalPrice)}</h4>
              {hasDiscount && (
                <>
                  <span className="font-medium text-muted-foreground line-through">MRP {formatRM(originalPrice)}</span>
                  <Badge className="border-none bg-green-600/10 text-green-700">
                    <CheckIcon className="size-3" />
                    {discountPercentage}% Off
                  </Badge>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button size="lg" className="grow rounded-md hover:-translate-y-0.5 hover:shadow-lg" asChild>
                <a href={activeProduct.href ?? "#"}>
                  <ShoppingCartIcon />
                  Buy Now
                </a>
              </Button>
              <Button size="lg" variant="secondary" className="grow rounded-md hover:-translate-y-0.5 hover:shadow-md">
                <HeartIcon />
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
