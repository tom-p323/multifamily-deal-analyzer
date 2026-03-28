import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "First Pass Deal Screen",
  description: "Quick small multifamily first-pass deal screening for Charlotte-area properties.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
