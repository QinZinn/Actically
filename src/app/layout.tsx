import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Actically", description: "Học sâu, nhớ lâu" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className="dark"><body>{children}</body></html>;
}
