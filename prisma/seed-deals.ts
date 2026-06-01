import { PrismaClient, DealType, DiscountType } from "@prisma/client";

const prisma = new PrismaClient();

interface DealSeed {
  title: string;
  description: string;
  dealType: DealType;
  discountType: DiscountType;
  originalPrice?: number;
  dealPrice?: number;
  pointsCost?: number;
  /** Days from now the deal expires. */
  daysOut: number;
}

// Hand-curated, realistic app/loyalty deals per chain. These are MANUAL +
// verified and survive the daily cron (which only churns LLM/AGGREGATOR rows).
// Reseed is idempotent: per chain we deleteMany(MANUAL) then createMany.
const DEALS: Record<string, DealSeed[]> = {
  mcdonalds: [
    {
      title: "Free Medium Fries with $1+ purchase (Fridays)",
      description: "Every Friday in the app: redeem free medium fries with any purchase of $1 or more. App exclusive.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 14,
    },
    {
      title: "Buy One Get One Free Big Mac",
      description: "Members-only BOGO on Big Macs ordered in the app for pickup or delivery.",
      dealType: "REWARD_MEMBER",
      discountType: "BOGO",
      daysOut: 10,
    },
    {
      title: "$1 Any Size Soft Drink",
      description: "Any size fountain drink for $1, all day, in store and on the app.",
      dealType: "IN_STORE",
      discountType: "DOLLAR_OFF",
      dealPrice: 1.0,
      daysOut: 21,
    },
  ],
  chickfila: [
    {
      title: "Free Chocolate Chunk Cookie",
      description: "One free Chocolate Chunk Cookie with any mobile order in the Chick-fil-A One app.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      pointsCost: 250,
      daysOut: 12,
    },
    {
      title: "Free Medium Waffle Fries",
      description: "Reward members get free medium Waffle Potato Fries — check your rewards tab.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      pointsCost: 350,
      daysOut: 9,
    },
  ],
  wendys: [
    {
      title: "$1 Dave's Single",
      description: "Dave's Single for $1 with any purchase, app exclusive.",
      dealType: "APP_EXCLUSIVE",
      discountType: "DOLLAR_OFF",
      dealPrice: 1.0,
      daysOut: 7,
    },
    {
      title: "Free Spicy Chicken Nuggets (any purchase)",
      description: "Free 6-pc Spicy Chicken Nuggets with any purchase in the Wendy's app.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 14,
    },
    {
      title: "BOGO Premium Combo",
      description: "Buy one premium combo, get one free with the mobile offer.",
      dealType: "APP_EXCLUSIVE",
      discountType: "BOGO",
      daysOut: 11,
    },
  ],
  tacobell: [
    {
      title: "Free Doritos Locos Taco with $5+ order",
      description: "Add a free Nacho Cheese Doritos Locos Taco to any app order of $5 or more.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 15,
    },
    {
      title: "$5 Cravings Box",
      description: "Build-your-own Cravings Box for $5, available in store and online.",
      dealType: "ONLINE",
      discountType: "DOLLAR_OFF",
      dealPrice: 5.0,
      daysOut: 20,
    },
  ],
  burgerking: [
    {
      title: "Free Whopper with $3+ purchase",
      description: "Royal Perks members: free Whopper with any purchase of $3 or more in the app.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 10,
    },
    {
      title: "2 for $5 Mix & Match",
      description: "Pick two from select sandwiches for $5, app and in store.",
      dealType: "IN_STORE",
      discountType: "DOLLAR_OFF",
      dealPrice: 5.0,
      daysOut: 18,
    },
  ],
  popeyes: [
    {
      title: "Free 3-pc Tenders with $10+ order",
      description: "Get 3 free signature tenders on app orders of $10 or more.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 12,
    },
    {
      title: "$6 Big Box",
      description: "Big Box meal for $6, online ordering only.",
      dealType: "ONLINE",
      discountType: "DOLLAR_OFF",
      dealPrice: 6.0,
      daysOut: 16,
    },
  ],
  subway: [
    {
      title: "Buy One Footlong, Get One 50% Off",
      description: "BOGO 50% off any Footlong with code in the Subway app.",
      dealType: "APP_EXCLUSIVE",
      discountType: "PERCENTAGE_OFF",
      daysOut: 9,
    },
    {
      title: "Free Cookie with Footlong",
      description: "MyWay Rewards members get a free cookie with any Footlong purchase.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 13,
    },
  ],
  dunkin: [
    {
      title: "Free Medium Coffee with mobile order",
      description: "DD Perks members: free medium hot or iced coffee with any mobile order.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 8,
    },
    {
      title: "3x Points on Espresso Drinks",
      description: "Earn triple points on all espresso beverages this week.",
      dealType: "REWARD_MEMBER",
      discountType: "POINTS_MULTIPLIER",
      daysOut: 7,
    },
  ],
  starbucks: [
    {
      title: "Double Star Days",
      description: "Earn 2x Stars on every purchase for members — today through the weekend.",
      dealType: "REWARD_MEMBER",
      discountType: "POINTS_MULTIPLIER",
      daysOut: 5,
    },
    {
      title: "Free Handcrafted Drink (150 Stars)",
      description: "Redeem 150 Stars for any handcrafted drink in the Starbucks app.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      pointsCost: 150,
      daysOut: 21,
    },
  ],
  chipotle: [
    {
      title: "Free Guac with Entrée",
      description: "Rewards members add free guacamole to any entrée ordered in the app.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 10,
    },
    {
      title: "BOGO Burrito (app only)",
      description: "Buy one burrito, bowl, or salad, get one free with the in-app offer.",
      dealType: "APP_EXCLUSIVE",
      discountType: "BOGO",
      daysOut: 6,
    },
  ],
  pancheros: [
    {
      title: "Free Queso with Burrito",
      description: "Punchero Rewards members get free queso with any burrito purchase.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 12,
    },
  ],
  dairyqueen: [
    {
      title: "$0.85 Small Blizzard",
      description: "Blizzard treat for $0.85 with any purchase in the DQ app — limited time.",
      dealType: "APP_EXCLUSIVE",
      discountType: "DOLLAR_OFF",
      dealPrice: 0.85,
      daysOut: 14,
    },
    {
      title: "Free Dilly Bar with $5+ order",
      description: "Add a free Dilly Bar to mobile orders of $5 or more.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 11,
    },
  ],
  culvers: [
    {
      title: "Free Scoop of Custard",
      description: "MyCulver's members get a free single scoop of the Flavor of the Day.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 9,
    },
  ],
  jimmyjohns: [
    {
      title: "Free Chips & Drink with Sandwich",
      description: "Freaky Fast Rewards: free chips and a drink with any sandwich in the app.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 13,
    },
    {
      title: "$2 Off Orders of $10+",
      description: "Take $2 off any online order of $10 or more.",
      dealType: "ONLINE",
      discountType: "DOLLAR_OFF",
      dealPrice: 2.0,
      daysOut: 17,
    },
  ],
  buffalowildwings: [
    {
      title: "Free Snack-Size Wings with $15+ order",
      description: "Blazin' Rewards members get free snack-size wings on orders of $15+.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 10,
    },
    {
      title: "Boneless Thursdays — 20% Off",
      description: "20% off boneless wings every Thursday, online ordering.",
      dealType: "ONLINE",
      discountType: "PERCENTAGE_OFF",
      daysOut: 7,
    },
  ],
  kfc: [
    {
      title: "Free Original Recipe Chicken (8-pc bucket deal)",
      description: "Add free pieces with select bucket meals ordered in the KFC app.",
      dealType: "APP_EXCLUSIVE",
      discountType: "FREE_ITEM",
      daysOut: 12,
    },
    {
      title: "$5 Fill Up Box",
      description: "Classic $5 Fill Up available online and in store.",
      dealType: "IN_STORE",
      discountType: "DOLLAR_OFF",
      dealPrice: 5.0,
      daysOut: 20,
    },
  ],
  pandaexpress: [
    {
      title: "Free Small Entrée with $20+ order",
      description: "Panda Rewards members get a free small entrée on orders of $20 or more.",
      dealType: "REWARD_MEMBER",
      discountType: "FREE_ITEM",
      daysOut: 11,
    },
    {
      title: "2x Panda Points this week",
      description: "Earn double Panda Points on every order through Sunday.",
      dealType: "REWARD_MEMBER",
      discountType: "POINTS_MULTIPLIER",
      daysOut: 6,
    },
  ],
};

function expiresInDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const chains = await prisma.chain.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(chains.map((c) => [c.slug, c.id]));

  let inserted = 0;
  for (const [slug, deals] of Object.entries(DEALS)) {
    const chainId = bySlug.get(slug);
    if (!chainId) {
      console.warn(`  ⚠ no chain row for "${slug}" — skipping`);
      continue;
    }

    await prisma.deal.deleteMany({ where: { chainId, source: "MANUAL" } });
    await prisma.deal.createMany({
      data: deals.map((d) => ({
        chainId,
        title: d.title,
        description: d.description,
        dealType: d.dealType,
        discountType: d.discountType,
        originalPrice: d.originalPrice ?? null,
        dealPrice: d.dealPrice ?? null,
        pointsCost: d.pointsCost ?? null,
        expiresAt: expiresInDays(d.daysOut),
        source: "MANUAL",
        isVerified: true,
        isActive: true,
      })),
    });
    inserted += deals.length;
    console.log(`  ✓ ${slug}: ${deals.length} deals`);
  }

  console.log(`\nSeeded ${inserted} curated deals across ${Object.keys(DEALS).length} chains.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
