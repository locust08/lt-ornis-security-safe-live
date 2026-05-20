import { ArrowRightIcon, CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StatCard = {
  title: string;
  description: string;
}[];

type FeatureCard = {
  title: string;
  description: string;
}[];

const AboutUs = ({ statCards, featureCards }: { statCards: StatCard; featureCards: FeatureCard }) => {
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

            <Button asChild size="lg" className="group rounded-lg text-base has-[>svg]:px-6">
              <a href="/contact-us">
                Contact Us
                <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </Button>
          </div>

          <img
            src="/ornis/footer-safe-service.png"
            alt="Falcon Safe technician servicing a safe"
            className="h-full max-h-[44rem] min-h-[24rem] w-full rounded-md object-cover"
            loading="lazy"
            decoding="async"
          />
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
