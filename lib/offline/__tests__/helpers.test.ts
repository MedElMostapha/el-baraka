import { describe, it, expect } from 'vitest';
import { translateSyncError } from '../errors';
import { getRetryDelayMs, offlineInvoicePlaceholder, placeholderForInvoice } from '../sync';

function makeT(key: string): string {
  return `t:${key}`;
}

describe('errors.translateSyncError', () => {
  it('maps each sync error code to its translation key', () => {
    expect(translateSyncError(makeT, 'batch_not_found')).toBe('t:batchNotFound');
    expect(translateSyncError(makeT, 'batch_closed')).toBe('t:batchClosed');
    expect(translateSyncError(makeT, 'insufficient_birds')).toBe('t:notEnoughBirds');
    expect(translateSyncError(makeT, 'feed_stock_insufficient')).toBe('t:notEnoughFeed');
    expect(translateSyncError(makeT, 'feed_stock_missing')).toBe('t:feedStockMissing');
    expect(translateSyncError(makeT, 'feed_config_missing')).toBe('t:feedConfigMissing');
    expect(translateSyncError(makeT, 'client_not_found')).toBe('t:clientNotFound');
    expect(translateSyncError(makeT, 'validation_failed')).toBe('t:validationFailed');
    expect(translateSyncError(makeT, 'unsupported_type')).toBe('t:validationFailed');
    expect(translateSyncError(makeT, 'network_error')).toBe('t:syncNetworkError');
  });

  it('falls back to internalError for unknown or missing codes', () => {
    expect(translateSyncError(makeT, 'mystery_code')).toBe('t:internalError');
    expect(translateSyncError(makeT, undefined)).toBe('t:internalError');
  });
});

describe('sync helpers', () => {
  it('caps the retry backoff delay at the last value', () => {
    expect(getRetryDelayMs(0)).toBe(5000);
    expect(getRetryDelayMs(1)).toBe(30000);
    expect(getRetryDelayMs(2)).toBe(120000);
    expect(getRetryDelayMs(3)).toBe(600000);
    expect(getRetryDelayMs(10)).toBe(600000);
  });

  it('uses the offline invoice placeholder', () => {
    expect(offlineInvoicePlaceholder()).toBe('PENDING-XXXXXXXX');
    expect(placeholderForInvoice('PENDING-XXXXXXXX')).toBe(true);
    expect(placeholderForInvoice('INV-2026-ABC')).toBe(false);
    expect(placeholderForInvoice(null)).toBe(false);
  });
});
