export type SyncErrorCode =
  | 'batch_not_found'
  | 'batch_closed'
  | 'insufficient_birds'
  | 'feed_stock_insufficient'
  | 'feed_stock_missing'
  | 'feed_config_missing'
  | 'client_not_found'
  | 'validation_failed'
  | 'unsupported_type'
  | 'network_error';

export type ErrorTranslator = (key: string) => string;

export function translateSyncError(t: ErrorTranslator, code?: string): string {
  switch (code as SyncErrorCode) {
    case 'batch_not_found':
      return t('batchNotFound');
    case 'batch_closed':
      return t('batchClosed');
    case 'insufficient_birds':
      return t('notEnoughBirds');
    case 'feed_stock_insufficient':
      return t('notEnoughFeed');
    case 'feed_stock_missing':
      return t('feedStockMissing');
    case 'feed_config_missing':
      return t('feedConfigMissing');
    case 'client_not_found':
      return t('clientNotFound');
    case 'validation_failed':
    case 'unsupported_type':
      return t('validationFailed');
    case 'network_error':
      return t('syncNetworkError');
    default:
      return t('internalError');
  }
}
