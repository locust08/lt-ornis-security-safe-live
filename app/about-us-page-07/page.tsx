import AboutUs from "@/components/shadcn-studio/blocks/about-us-page-07/about-us-page-07";

const statCards = [
  {
    title: "Since 1982",
    description: "Manufacturing Falcon safe boxes, vaults, and fireproof protection products.",
  },
  {
    title: "30+ years",
    description: "Serving security and asset-protection needs across Malaysia and beyond.",
  },
  {
    title: "Global reach",
    description: "Exporting to Asia, Australia, the Middle East, Europe, USA, and China.",
  },
  {
    title: "Certified trust",
    description: "Backed by awards, certificates, and proven institutional use cases.",
  },
];

const featureCards: { title: string; description: string }[] = [];

const AboutUsPage = () => {
  return <AboutUs statCards={statCards} featureCards={featureCards} />;
};

export default AboutUsPage;
