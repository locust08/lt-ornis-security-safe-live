"use client";

import { useState } from "react";
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StatCard = {
  title: string;
  description: string;
}[];

type FeatureCard = {
  title: string;
  description: string;
}[];

const aboutImages = [
  {
    src: "/ornis/about-us/about-01-service.webp",
    alt: "Falcon Safe technician servicing a safe",
  },
  {
    src: "/ornis/about-us/about-07-shopfloor.webp",
    alt: "Falcon Safe production floor with team members working on safe components",
  },
  {
    src: "/ornis/about-us/about-06-welding.webp",
    alt: "Close-up of Falcon Safe manufacturing work with sparks during metal finishing",
  },
  {
    src: "/ornis/about-us/about-08-finishing.webp",
    alt: "Falcon Safe workshop team finishing safe components",
  },
  {
    src: "/ornis/about-us/about-02-factory.webp",
    alt: "Falcon Safe factory team working on production materials",
  },
  {
    src: "/ornis/about-us/about-03-workshop.webp",
    alt: "Falcon Safe workshop production process",
  },
  {
    src: "/ornis/about-us/about-04-production.webp",
    alt: "Falcon Safe production area with staff preparing safe parts",
  },
  {
    src: "/ornis/about-us/about-05-team.webp",
    alt: "Falcon Safe team member working inside the factory",
  },
];

const AboutUs = ({ statCards, featureCards }: { statCards: StatCard; featureCards: FeatureCard }) => {
  const [activeImage, setActiveImage] = useState(0);
  const selectedImage = aboutImages[activeImage];

  const showNextImage = () => {
    setActiveImage((currentImage) => (currentImage + 1) % aboutImages.length);
  };

  const showPreviousImage = () => {
    setActiveImage((currentImage) => (currentImage - 1 + aboutImages.length) % aboutImages.length);
  };

  return (
    <section className="bg-[#f6f1ea] py-10 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1672px] px-4 sm:px-6 lg:px-10">
        <div className="mb-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-primary text-sm font-medium uppercase">About Us</p>
              <h2 className="text-2xl font-semibold text-[#1f2020] md:text-3xl lg:text-4xl">
                Falcon The World's Trusted Safe
              </h2>
              <p className="text-muted-foreground text-lg leading-8">
                Since 1982, Falcon Safe has grown from a Malaysian safe box, vault, and fireproof cabinet
                manufacturer into a broad security and asset-protection brand, combining advanced product development,
                professional service, and internationally trusted protection for homes, businesses, banks, jewellery,
                retail, government, and institutional needs.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {statCards.map((stat, index) => (
                <Card
                  key={index}
                  className="rounded-lg border-[#0e5963]/20 bg-white/72 shadow-none transition-colors duration-300 hover:border-[#0e5963]/55"
                >
                  <CardHeader>
                    <CardTitle className="text-xl text-[#1f2020]">{stat.title}</CardTitle>
                    <CardDescription className="text-base leading-7">{stat.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

          </div>

          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md lg:self-center">
            <button
              type="button"
              className="group block h-full w-full cursor-pointer text-left"
              onClick={showNextImage}
              aria-label="Advance About Us image carousel"
            >
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
                loading="lazy"
                decoding="async"
              />
            </button>

            <button
              type="button"
              className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[#1f2020]/45 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-[#1f2020]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={showPreviousImage}
              aria-label="Show previous About Us image"
            >
              <ChevronLeftIcon className="size-5" />
            </button>

            <button
              type="button"
              className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[#1f2020]/45 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-[#1f2020]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={showNextImage}
              aria-label="Show next About Us image"
            >
              <ChevronRightIcon className="size-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1f2020]/45 px-3 py-2 backdrop-blur-sm">
              {aboutImages.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  className={`size-2.5 rounded-full transition-colors duration-200 ${
                    index === activeImage ? "bg-white" : "bg-white/45 hover:bg-white/75"
                  }`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show About Us image ${index + 1}`}
                  aria-pressed={index === activeImage}
                />
              ))}
            </div>
          </div>
        </div>

        {featureCards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => (
              <Card
                key={index}
                className="rounded-lg border-[#3d3733]/15 bg-white/78 shadow-none max-lg:last:col-span-full"
              >
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-3 text-xl text-[#1f2020]">
                    <CheckCircleIcon className="size-5 text-[#0e5963]" />
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-7">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AboutUs;
