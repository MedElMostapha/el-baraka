import { describe, it, expect } from 'vitest';
import { computeDashboard, type DashboardInput } from './compute';

const baseInput: DashboardInput = {
  batches: [
    { id: 'b1', name: 'lot', initialQuantity: 100, costPerChick: 10, status: 'active' },
    { id: 'b2', name: 'lot-2', initialQuantity: 50, costPerChick: 12, status: 'closed' },
  ],
  sales: [
    { id: 's1', batchId: 'b1', date: '2026-08-01T10:00:00Z', quantity: 20, totalPrice: 1000, amountPaid: 1000 },
    { id: 's2', batchId: 'b1', date: '2026-08-02T10:00:00Z', quantity: 10, totalPrice: 500, amountPaid: 200 },
  ],
  dailyLogs: [
    { id: 'l1', batchId: 'b1', mortality: 5 },
  ],
  expenses: [
    { id: 'e1', date: '2026-08-01T10:00:00Z', amount: 300 },
  ],
  inventory: [
    { id: 'i1', category: 'feed', quantity: 10, unit: 'kg' },
  ],
  restocks: [],
};

const now = new Date('2026-08-03T12:00:00Z');

describe('computeDashboard', () => {
  it('computes financial metrics', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    expect(r.totalRevenue).toBe(1500);
    expect(r.totalExpenses).toBe(300);
    expect(r.totalPaid).toBe(1200);
    expect(r.totalDebt).toBe(300);
    expect(r.cashOnHand).toBe(900);
    expect(r.netProfit).toBe(1500 - 300 - (100 * 10 + 50 * 12));
  });

  it('falls back to batch cost when there are no restocks', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    const batchCost = 100 * 10 + 50 * 12;
    expect(r.netProfit).toBe(1500 - 300 - batchCost);
  });

  it('uses restock cost when restocks exist', () => {
    const r = computeDashboard(
      { ...baseInput, restocks: [{ id: 'r1', quantity: 60, costPerChick: 15 }] },
      0,
      '7d',
      now,
    );
    expect(r.netProfit).toBe(1500 - 300 - 60 * 15);
  });

  it('computes active batch stats and bird count', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    expect(r.activeBatches).toHaveLength(1);
    expect(r.activeBatches[0].mortality).toBe(5);
    expect(r.activeBatches[0].sold).toBe(30);
    expect(r.activeBatches[0].remainingQuantity).toBe(65);
    expect(r.activeBirdCount).toBe(65);
  });

  it('computes mortality rate across all batches', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    expect(r.mortalityRate).toBe('3.3');
  });

  it('normalizes feed stock to kg using kgPerSac', () => {
    const r = computeDashboard(baseInput, 25, '7d', now);
    expect(r.totalFeedKg).toBe(10);
    expect(r.lowStock).toBe(false);
  });

  it('converts sac inventory to kg', () => {
    const input = {
      ...baseInput,
      inventory: [{ id: 'i1', category: 'feed', quantity: 2, unit: 'sac' }],
    };
    const r = computeDashboard(input, 25, '7d', now);
    expect(r.totalFeedKg).toBe(50);
  });

  it('flags low stock when feed is below 5kg', () => {
    const input = {
      ...baseInput,
      inventory: [{ id: 'i1', category: 'feed', quantity: 3, unit: 'kg' }],
    };
    const r = computeDashboard(input, 0, '7d', now);
    expect(r.lowStock).toBe(true);
  });

  it('builds chart data for the 7d range', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    expect(r.chartData).toHaveLength(7);
    const last = r.chartData[r.chartData.length - 1];
    expect(last.revenue).toBe(0);
  });

  it('includes recent sales in chart buckets', () => {
    const r = computeDashboard(baseInput, 0, '7d', now);
    const withRevenue = r.chartData.filter((d) => d.revenue > 0);
    expect(withRevenue.reduce((s, d) => s + d.revenue, 0)).toBe(1500);
  });

  it('returns null mortality rate when no birds exist', () => {
    const r = computeDashboard({ ...baseInput, batches: [] }, 0, '7d', now);
    expect(r.mortalityRate).toBeNull();
    expect(r.activeBatches).toHaveLength(0);
  });
});
