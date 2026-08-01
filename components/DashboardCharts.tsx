"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
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
    formula: string;
  };
}

export function DashboardCharts({ data, t }: DashboardChartsProps) {
  return (
    <div className="panel chart-panel p-6">
      <div className="section-heading">
        <div>
          <span className="section-kicker">{t.performance}</span>
          <h3>{t.revenue} / {t.expenses}</h3>
        </div>
        <span className="section-heading__badge">MRU</span>
      </div>
      <p className="formula-caption">{t.formula}</p>

        <div className="h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e86f2d" stopOpacity={0.28}/>
                  <stop offset="95%" stopColor="#e86f2d" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6f8f80" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="#6f8f80" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eee8" />
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
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 12px 30px rgba(23,59,53,0.12)',
                  padding: '0.75rem'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                labelStyle={{ marginBottom: '0.5rem', fontWeight: 900, fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name={t.revenue}
                stroke="#e86f2d"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name={t.expenses}
                stroke="#6f8f80"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorExpenses)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
}
