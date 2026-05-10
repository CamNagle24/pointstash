import { PrismaClient, RedemptionCategory } from "@prisma/client";

const prisma = new PrismaClient();

interface RedemptionSeed {
  itemName: string;
  pointsCost: number;
  retail: number;
  category: RedemptionCategory;
}

interface ChainSeed {
  slug: string;
  name: string;
  logo: string;
  color: string;
  pointsName: string;
  websiteUrl: string;
  appDeepLink?: string;
  scrapingEnabled: boolean;
  redemptions: RedemptionSeed[];
}

function centsPerPoint(retail: number, points: number): number {
  return Math.round((retail / points) * 100 * 10000) / 10000;
}

const CHAINS: ChainSeed[] = [
  {
    slug: "mcdonalds",
    name: "McDonald's",
    logo: "/chains/mcdonalds.svg",
    color: "#FFC72C",
    pointsName: "points",
    websiteUrl: "https://www.mcdonalds.com",
    appDeepLink: "mcdonalds://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "McChicken", pointsCost: 1500, retail: 2.49, category: "ENTREE" },
      { itemName: "6-pc Chicken McNuggets", pointsCost: 3000, retail: 3.49, category: "ENTREE" },
      { itemName: "Filet-O-Fish", pointsCost: 4500, retail: 4.99, category: "ENTREE" },
      { itemName: "Big Mac", pointsCost: 6000, retail: 5.69, category: "ENTREE" },
      { itemName: "Quarter Pounder with Cheese", pointsCost: 6000, retail: 5.99, category: "ENTREE" },
      { itemName: "10-pc Chicken McNuggets", pointsCost: 6000, retail: 5.49, category: "ENTREE" },
    ],
  },
  {
    slug: "chickfila",
    name: "Chick-fil-A",
    logo: "/chains/chickfila.svg",
    color: "#DD0031",
    pointsName: "points",
    websiteUrl: "https://www.chick-fil-a.com",
    appDeepLink: "cfaone://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Hash Browns", pointsCost: 450, retail: 2.59, category: "SIDE" },
      { itemName: "Mac & Cheese (medium)", pointsCost: 950, retail: 4.49, category: "SIDE" },
      { itemName: "Chick-n-Strips (3 ct)", pointsCost: 850, retail: 5.85, category: "ENTREE" },
      { itemName: "Chick-fil-A Chicken Sandwich", pointsCost: 950, retail: 5.85, category: "ENTREE" },
      { itemName: "8-ct Nuggets", pointsCost: 950, retail: 5.99, category: "ENTREE" },
      { itemName: "Spicy Deluxe Sandwich", pointsCost: 1050, retail: 6.45, category: "ENTREE" },
    ],
  },
  {
    slug: "wendys",
    name: "Wendy's",
    logo: "/chains/wendys.svg",
    color: "#E2203D",
    pointsName: "points",
    websiteUrl: "https://www.wendys.com",
    appDeepLink: "wendys://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Jr. Frosty", pointsCost: 50, retail: 0.99, category: "DESSERT" },
      { itemName: "Small Fries", pointsCost: 200, retail: 2.59, category: "SIDE" },
      { itemName: "4-pc Spicy Nuggets", pointsCost: 350, retail: 2.99, category: "SIDE" },
      { itemName: "Dave's Single", pointsCost: 600, retail: 5.99, category: "ENTREE" },
      { itemName: "Spicy Chicken Sandwich", pointsCost: 800, retail: 6.79, category: "ENTREE" },
      { itemName: "Baconator", pointsCost: 1600, retail: 8.79, category: "ENTREE" },
    ],
  },
  {
    slug: "burgerking",
    name: "Burger King",
    logo: "/chains/burgerking.svg",
    color: "#D62300",
    pointsName: "crowns",
    websiteUrl: "https://www.bk.com",
    appDeepLink: "burgerking://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Hash Browns", pointsCost: 500, retail: 2.49, category: "SIDE" },
      { itemName: "Small Fries", pointsCost: 750, retail: 2.79, category: "SIDE" },
      { itemName: "Whopper Jr.", pointsCost: 1500, retail: 3.99, category: "ENTREE" },
      { itemName: "Original Chicken Sandwich", pointsCost: 2000, retail: 5.49, category: "ENTREE" },
      { itemName: "Whopper", pointsCost: 2500, retail: 6.79, category: "ENTREE" },
      { itemName: "Bacon King", pointsCost: 3000, retail: 8.49, category: "ENTREE" },
    ],
  },
  {
    slug: "tacobell",
    name: "Taco Bell",
    logo: "/chains/tacobell.svg",
    color: "#702082",
    pointsName: "points",
    websiteUrl: "https://www.tacobell.com",
    appDeepLink: "tacobell://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Cinnamon Twists", pointsCost: 250, retail: 1.49, category: "DESSERT" },
      { itemName: "Crunchy Taco", pointsCost: 500, retail: 1.99, category: "ENTREE" },
      { itemName: "Cheesy Bean & Rice Burrito", pointsCost: 750, retail: 2.49, category: "ENTREE" },
      { itemName: "Chalupa Supreme", pointsCost: 1000, retail: 4.99, category: "ENTREE" },
      { itemName: "Crunchwrap Supreme", pointsCost: 1500, retail: 5.49, category: "ENTREE" },
      { itemName: "Nachos BellGrande", pointsCost: 1500, retail: 5.49, category: "ENTREE" },
    ],
  },
  {
    slug: "popeyes",
    name: "Popeyes",
    logo: "/chains/popeyes.svg",
    color: "#FF7E1B",
    pointsName: "points",
    websiteUrl: "https://www.popeyes.com",
    appDeepLink: "popeyes://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Regular Side", pointsCost: 200, retail: 2.99, category: "SIDE" },
      { itemName: "Apple Pie", pointsCost: 300, retail: 1.99, category: "DESSERT" },
      { itemName: "3-pc Chicken Tenders", pointsCost: 500, retail: 5.99, category: "ENTREE" },
      { itemName: "Classic Chicken Sandwich", pointsCost: 800, retail: 5.99, category: "ENTREE" },
      { itemName: "Spicy Chicken Sandwich", pointsCost: 800, retail: 5.99, category: "ENTREE" },
      { itemName: "5-pc Tenders Combo", pointsCost: 1500, retail: 11.99, category: "COMBO" },
    ],
  },
  {
    slug: "subway",
    name: "Subway",
    logo: "/chains/subway.svg",
    color: "#008C15",
    pointsName: "tokens",
    websiteUrl: "https://www.subway.com",
    appDeepLink: "subway://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Cookie", pointsCost: 200, retail: 0.79, category: "DESSERT" },
      { itemName: "Chips", pointsCost: 200, retail: 1.99, category: "SIDE" },
      { itemName: "Fountain Drink", pointsCost: 300, retail: 2.49, category: "DRINK" },
      { itemName: "6-inch Sub", pointsCost: 600, retail: 5.99, category: "ENTREE" },
      { itemName: "Footlong Sub", pointsCost: 1200, retail: 9.99, category: "ENTREE" },
      { itemName: "Footlong Pro Sub (extra protein)", pointsCost: 1500, retail: 11.99, category: "ENTREE" },
    ],
  },
  {
    slug: "dunkin",
    name: "Dunkin'",
    logo: "/chains/dunkin.svg",
    color: "#FF671F",
    pointsName: "points",
    websiteUrl: "https://www.dunkindonuts.com",
    appDeepLink: "dunkin://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Classic Donut", pointsCost: 150, retail: 1.49, category: "DESSERT" },
      { itemName: "Bagel with Cream Cheese", pointsCost: 250, retail: 2.49, category: "ENTREE" },
      { itemName: "Medium Hot Coffee", pointsCost: 400, retail: 2.99, category: "DRINK" },
      { itemName: "Medium Iced Latte", pointsCost: 500, retail: 3.79, category: "DRINK" },
      { itemName: "Medium Frozen Coffee", pointsCost: 800, retail: 4.99, category: "DRINK" },
      { itemName: "Wake-Up Wrap", pointsCost: 900, retail: 3.99, category: "ENTREE" },
    ],
  },
  {
    slug: "starbucks",
    name: "Starbucks",
    logo: "/chains/starbucks.svg",
    color: "#006241",
    pointsName: "stars",
    websiteUrl: "https://www.starbucks.com",
    appDeepLink: "starbucks://",
    scrapingEnabled: true,
    redemptions: [
      { itemName: "Brewed Coffee or Tea (any size)", pointsCost: 100, retail: 3.45, category: "DRINK" },
      { itemName: "Bakery Item", pointsCost: 100, retail: 3.95, category: "DESSERT" },
      { itemName: "Grande Handcrafted Drink", pointsCost: 200, retail: 5.45, category: "DRINK" },
      { itemName: "Hot Breakfast Sandwich", pointsCost: 200, retail: 5.45, category: "ENTREE" },
      { itemName: "Lunch Sandwich or Salad", pointsCost: 300, retail: 8.95, category: "ENTREE" },
      { itemName: "Bag of Whole Bean Coffee", pointsCost: 400, retail: 15.95, category: "OTHER" },
    ],
  },
];

async function main() {
  console.log("Seeding chains and redemption options...");

  for (const c of CHAINS) {
    const chain = await prisma.chain.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        logo: c.logo,
        color: c.color,
        pointsName: c.pointsName,
        websiteUrl: c.websiteUrl,
        appDeepLink: c.appDeepLink,
        scrapingEnabled: c.scrapingEnabled,
      },
      create: {
        slug: c.slug,
        name: c.name,
        logo: c.logo,
        color: c.color,
        pointsName: c.pointsName,
        websiteUrl: c.websiteUrl,
        appDeepLink: c.appDeepLink,
        scrapingEnabled: c.scrapingEnabled,
      },
    });

    await prisma.redemptionOption.deleteMany({ where: { chainId: chain.id } });

    await prisma.redemptionOption.createMany({
      data: c.redemptions.map((r) => ({
        chainId: chain.id,
        itemName: r.itemName,
        pointsCost: r.pointsCost,
        estimatedRetailPrice: r.retail,
        centsPerPoint: centsPerPoint(r.retail, r.pointsCost),
        category: r.category,
        isAvailable: true,
        lastVerified: new Date(),
      })),
    });

    const best = [...c.redemptions]
      .map((r) => ({ ...r, cpp: centsPerPoint(r.retail, r.pointsCost) }))
      .sort((a, b) => b.cpp - a.cpp)[0];

    console.log(
      `  ✓ ${c.name.padEnd(14)} ${c.redemptions.length} redemptions   best: ${best.itemName} @ ${best.cpp.toFixed(3)} ¢/${c.pointsName.replace(/s$/, "")}`,
    );
  }

  console.log(`\nDone — seeded ${CHAINS.length} chains.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
