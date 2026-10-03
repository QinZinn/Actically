import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
export const metadata: Metadata = { title: "Actically", description: "Học sâu, nhớ lâu" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className="dark"><body>{children}<Toaster /></body></html>;
}
