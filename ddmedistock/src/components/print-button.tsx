"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Download / Print PDF" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer size={16} /> {label}
    </Button>
  );
}
