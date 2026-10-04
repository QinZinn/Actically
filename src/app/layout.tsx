import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata: Metadata = {
  title: "Actically",
  description: "Học sâu, nhớ lâu",
  icons: { icon: "/brand/actically-project-logo.png", apple: "/brand/actically-project-logo.png" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className="dark"><body><TooltipProvider delayDuration={250}>{children}<Toaster /></TooltipProvider></body></html>;
}
