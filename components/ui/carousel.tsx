"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";

import { cn } from "@/lib/utils";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];

type CarouselProps = {
  opts?: CarouselOptions;
  setApi?: (api: CarouselApi) => void;
};

function Carousel({
  opts,
  setApi,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(opts);

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  return (
    <div ref={carouselRef} className={cn("overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex", className)} {...props} />;
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="group" className={cn("min-w-0 shrink-0 grow-0 basis-full", className)} {...props} />;
}

export { Carousel, CarouselContent, CarouselItem, type CarouselApi };
