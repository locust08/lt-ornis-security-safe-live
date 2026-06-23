import ProductOverview from "@/components/shadcn-studio/blocks/product-overview-01/product-overview-01";

const overviewData = [
  {
    id: "or-ruby-310",
    name: "OR Ruby 310",
    breadcrumbData: [
      { label: "Ornis", href: "#" },
      { label: "Fire-Resistant Safe", href: "#" },
      { label: "OR Ruby 310", href: "#" },
    ],
    description:
      "Compact fire-resistant security safe with smart lock access, biometric protection, and a refined ruby finish for everyday valuables.",
    totalReview: 210,
    rating: 4.8,
    hasDiscount: true,
    originalPrice: 2690,
    price: 1500,
    dealerPrice: 1425,
    images: [{ src: "/ornis/or-ruby-310-hd.png", alt: "OR Ruby 310 safe" }],
    defaultSize: "310",
    defaultColorOption: "ruby",
    specs: "310 x 420 x 378 mm / 15.12L",
    href: "/payment?model=or-ruby-310",
  },
  {
    id: "or-emerald-310",
    name: "OR Emerald 310",
    breadcrumbData: [
      { label: "Ornis", href: "#" },
      { label: "Fire-Resistant Safe", href: "#" },
      { label: "OR Emerald 310", href: "#" },
    ],
    description:
      "Compact fire-resistant security safe with smart lock access, biometric protection, and a refined emerald finish for everyday valuables.",
    totalReview: 188,
    rating: 4.8,
    hasDiscount: true,
    originalPrice: 2690,
    price: 1500,
    dealerPrice: 1425,
    images: [{ src: "/ornis/or-emerald-310-ruby-shape.png", alt: "OR Emerald 310 safe" }],
    defaultSize: "310",
    defaultColorOption: "emerald",
    specs: "310 x 420 x 378 mm / 15.12L",
    href: "/payment?model=or-emerald-310",
  },
  {
    id: "or-ruby-530",
    name: "OR Ruby 530",
    breadcrumbData: [
      { label: "Ornis", href: "#" },
      { label: "Fire-Resistant Safe", href: "#" },
      { label: "OR Ruby 530", href: "#" },
    ],
    description:
      "Larger fire-resistant security safe with smart lock access, biometric protection, and extra storage for documents and high-value items.",
    totalReview: 164,
    rating: 4.9,
    hasDiscount: true,
    originalPrice: 3160,
    price: 1800,
    dealerPrice: 1710,
    images: [{ src: "/ornis/or-ruby-530-emerald-shape.png", alt: "OR Ruby 530 safe" }],
    defaultSize: "530",
    defaultColorOption: "ruby",
    specs: "530 x 435 x 463 mm / 40.87L",
    href: "/payment?model=or-ruby-530",
  },
  {
    id: "or-emerald-530",
    name: "OR Emerald 530",
    breadcrumbData: [
      { label: "Ornis", href: "#" },
      { label: "Fire-Resistant Safe", href: "#" },
      { label: "OR Emerald 530", href: "#" },
    ],
    description:
      "Larger fire-resistant security safe with smart lock access, biometric protection, and extra storage for documents and high-value items.",
    totalReview: 171,
    rating: 4.9,
    hasDiscount: true,
    originalPrice: 3160,
    price: 1800,
    dealerPrice: 1710,
    images: [{ src: "/ornis/or-emerald-310-hd.png", alt: "OR Emerald 530 safe" }],
    defaultSize: "530",
    defaultColorOption: "emerald",
    specs: "530 x 435 x 463 mm / 40.87L",
    href: "/payment?model=or-emerald-530",
  },
];

const sizes = [
  { value: "310", label: "OR 310" },
  { value: "530", label: "OR 530" },
];

const colors = [
  {
    value: "ruby",
    label: "Ruby",
    colorOption:
      "bg-[#b89aa3] has-data-[state=checked]:outline has-data-[state=checked]:outline-2 has-data-[state=checked]:outline-offset-2 has-data-[state=checked]:outline-[#955f69]",
  },
  {
    value: "emerald",
    label: "Emerald",
    colorOption:
      "bg-[#0e5963] has-data-[state=checked]:outline has-data-[state=checked]:outline-2 has-data-[state=checked]:outline-offset-2 has-data-[state=checked]:outline-[#0e5963]",
  },
];

const ProductOverviewPage = () => {
  return <ProductOverview productItems={overviewData} sizesChart={sizes} colorsChart={colors} />;
};

export default ProductOverviewPage;
