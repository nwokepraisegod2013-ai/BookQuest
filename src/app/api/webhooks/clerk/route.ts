import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

type ClerkEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string;
  };
};

export async function POST(req: Request) {
  const payload = await req.text();
  const hdrs = await headers();
  const svixId = hdrs.get("svix-id");
  const svixTimestamp = hdrs.get("svix-timestamp");
  const svixSignature = hdrs.get("svix-signature");

  if (!process.env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  let evt: ClerkEvent;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId!,
      "svix-timestamp": svixTimestamp!,
      "svix-signature": svixSignature!,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const email =
      evt.data.email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)
        ?.email_address ?? evt.data.email_addresses?.[0]?.email_address;

    if (!email) return NextResponse.json({ ok: true });

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    await db.user.upsert({
      where: { clerkId: evt.data.id },
      create: {
        clerkId: evt.data.id,
        email,
        name: [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null,
        imageUrl: evt.data.image_url,
        role: adminEmails.includes(email.toLowerCase()) ? Role.ADMIN : Role.CUSTOMER,
      },
      update: {
        email,
        name: [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null,
        imageUrl: evt.data.image_url,
        ...(adminEmails.includes(email.toLowerCase()) ? { role: Role.ADMIN } : {}),
      },
    });
  }

  if (evt.type === "user.deleted") {
    await db.user.updateMany({
      where: { clerkId: evt.data.id },
      data: {
        email: `deleted-${evt.data.id}@bookquest.removed`,
        name: "Deleted user",
        imageUrl: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
