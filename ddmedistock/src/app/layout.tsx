import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DDMediStock — AI Medical Procurement & RFQ Platform",
  description:
    "AI-powered, specification-based medical procurement. Upload RFQs, match products across vendors, and let admins control every quotation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
