import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { SellerApplyForm } from "@/components/seller/apply-form";

export default async function SellerApplyPage() {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  if (user.sellerProfile || user.role === Role.SELLER) {
    redirect("/seller");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Set up your seller profile</h1>
      <p className="mb-8 text-zinc-400">
        List your PDF books on BookQuest. After approval, you can publish and earn on every sale.
      </p>
      <SellerApplyForm />
    </div>
  );
}
