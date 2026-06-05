import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { db } from "./db";

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { sellerProfile: true },
  });

  return user;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function syncUserFromClerk() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = adminEmails.includes(email.toLowerCase());

  const user = await db.user.upsert({
    where: { clerkId: clerkUser.id },
    create: {
      clerkId: clerkUser.id,
      email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      imageUrl: clerkUser.imageUrl,
      role: isAdmin ? Role.ADMIN : Role.CUSTOMER,
    },
    update: {
      email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      imageUrl: clerkUser.imageUrl,
      ...(isAdmin ? { role: Role.ADMIN } : {}),
    },
    include: { sellerProfile: true },
  });

  return user;
}
