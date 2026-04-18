"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell
} from 'recharts';

interface ChartData {
  date: string;
  revenue: number;
  expenses: number;
}

interface DashboardChartsProps {
  data: ChartData[];
  t: {
    performance: string;
    revenue: string;
    expenses: string;
  };
}

export function DashboardCharts({ data, t }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight uppercase tracking-widest text-[10px] text-slate-400">
          {t.performance}
        </h3>
        
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '1.5rem', 
                  border: 'none', 
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  padding: '1rem'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                labelStyle={{ marginBottom: '0.5rem', fontWeight: 900, fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name={t.revenue}
                stroke="#f97316" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                name={t.expenses}
                stroke="#64748b" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
