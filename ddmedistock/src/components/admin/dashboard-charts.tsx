"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  "Under Review": "#d97706",
  "Matching Completed": "#0ea5e9",
  "Quotation In Progress": "#7c3aed",
  "Quotation Uploaded": "#059669",
  Approved: "#059669",
  Rejected: "#dc2626",
};

export function DashboardCharts({
  rfqByStatus,
  originSplit,
}: {
  rfqByStatus: { name: string; value: number }[];
  originSplit: { name: string; value: number }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>RFQ pipeline by status</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rfqByStatus} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {rfqByStatus.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? "#0369a1"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quotation line items: Domestic vs Imported</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={originSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  <Cell fill="#059669" />
                  <Cell fill="#0ea5e9" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
