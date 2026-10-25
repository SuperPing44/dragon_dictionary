import type { Metadata } from "next";
import {
  Cinzel,
  Cinzel_Decorative,
  Crimson_Pro,
  Inter,
} from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: "700",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dragon Dictionary",
  description: "Plan, research and write Forest Dragon videos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cinzelDecorative.variable} ${crimsonPro.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex h-full">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-10 pt-9 pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
