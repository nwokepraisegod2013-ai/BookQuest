import { db } from "./db";
import { getEffectivePriceCents } from "./utils";

export async function getCart(userId: string) {
  const items = await db.cartItem.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      bookId: true,
      createdAt: true,
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverUrl: true,
          priceCents: true,
          salePriceCents: true,
          currency: true,
          sellerId: true,
          seller: true,
        },
      },
    },
  });

  const subtotalCents = items.reduce(
    (sum, item) => sum + getEffectivePriceCents(item.book),
    0
  );

  return { items, subtotalCents, itemCount: items.length };
}
