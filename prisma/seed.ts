import { copyFile, mkdir } from "fs/promises";
import path from "path";
import { PrismaClient, BookStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

const PRIVATE_PDFS = path.join(process.cwd(), "storage", "private", "pdfs");
const LEGACY_PUBLIC_PDFS = path.join(process.cwd(), "public", "uploads", "pdfs");

async function ensureDemoPdf(name: string): Promise<string> {
  await mkdir(PRIVATE_PDFS, { recursive: true });
  const dest = path.join(PRIVATE_PDFS, name);
  const legacy = path.join(LEGACY_PUBLIC_PDFS, name);
  try {
    await copyFile(legacy, dest);
  } catch {
    // demo file may already exist in private storage
  }
  return `private:pdfs/${name}`;
}

async function main() {
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      platformCommissionPct: 15,
      minPayoutCents: 500000,
      supportEmail: "support@bookquest.app",
    },
    update: {},
  });

  const categories = [
    { name: "Fiction", slug: "fiction" },
    { name: "Business", slug: "business" },
    { name: "Technology", slug: "technology" },
    { name: "Self-Help", slug: "self-help" },
    { name: "Education", slug: "education" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }

  const fiction = await prisma.category.findUniqueOrThrow({ where: { slug: "fiction" } });
  const business = await prisma.category.findUniqueOrThrow({ where: { slug: "business" } });

  const demoSellerUser = await prisma.user.upsert({
    where: { email: "seller@bookquest.demo" },
    create: {
      clerkId: "demo_seller_clerk",
      email: "seller@bookquest.demo",
      name: "Demo Seller",
      role: Role.SELLER,
    },
    update: {},
  });

  const seller = await prisma.sellerProfile.upsert({
    where: { userId: demoSellerUser.id },
    create: {
      userId: demoSellerUser.id,
      storeName: "Lagos Lit Press",
      storeSlug: "lagos-lit-press",
      bio: "Independent publisher of African fiction and business guides.",
      verified: true,
    },
    update: { verified: true },
  });

  const [pdfMidnight, pdfBuild, pdfAncestral] = await Promise.all([
    ensureDemoPdf("demo-midnight.pdf"),
    ensureDemoPdf("demo-build.pdf"),
    ensureDemoPdf("demo-ancestral.pdf"),
  ]);

  const books = [
    {
      slug: "midnight-market",
      title: "Midnight Market",
      subtitle: "A Lagos noir thriller",
      description:
        "When a street vendor discovers encrypted ledgers in the old Balogun market, she unravels a conspiracy that stretches from Marina boardrooms to the lagoon at midnight.",
      priceCents: 350000,
      coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
      pdfKey: pdfMidnight,
      categoryId: fiction.id,
      featured: true,
    },
    {
      slug: "build-in-public-ng",
      title: "Build in Public — Nigeria Edition",
      subtitle: "From side project to sustainable SaaS",
      description:
        "Practical playbook for Nigerian founders: pricing in NGN, Paystack setup, community-led growth, and shipping fast with small teams.",
      priceCents: 450000,
      salePriceCents: 399000,
      coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=800&fit=crop",
      pdfKey: pdfBuild,
      categoryId: business.id,
      featured: true,
    },
    {
      slug: "ancestral-code",
      title: "Ancestral Code",
      description:
        "Essays on tradition, technology, and identity—how Yoruba philosophy informs modern product design and creative work.",
      priceCents: 280000,
      coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
      pdfKey: pdfAncestral,
      categoryId: fiction.id,
      featured: false,
    },
  ];

  for (const b of books) {
    await prisma.book.upsert({
      where: { slug: b.slug },
      create: {
        ...b,
        sellerId: seller.id,
        status: BookStatus.PUBLISHED,
        salesCount: Math.floor(Math.random() * 50),
        averageRating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 20),
      },
      update: {
        status: BookStatus.PUBLISHED,
        featured: b.featured,
        pdfKey: b.pdfKey,
      },
    });
  }

  console.log("Seed complete: categories, demo seller, 3 books (private PDFs)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
