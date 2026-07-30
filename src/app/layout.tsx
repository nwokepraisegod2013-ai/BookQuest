import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BookQuest — PDF Book Marketplace",
  description:
    "Discover, buy, and read premium PDF books from independent sellers across Nigeria and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0c0c14",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="antialiased">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
