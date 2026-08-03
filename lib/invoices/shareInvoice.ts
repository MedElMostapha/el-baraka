export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function waMeNumber(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? normalized.slice(1) : null;
}

export type ShareInvoiceInput = {
  saleId: string;
  invoiceNumber?: string;
  phone?: string | null;
  message?: string;
  title?: string;
};

export type ShareInvoiceResult =
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'fallback' }
  | { status: 'unsupported' };

export async function shareInvoice({
  saleId,
  invoiceNumber,
  phone,
  message = '',
  title = '',
}: ShareInvoiceInput): Promise<ShareInvoiceResult> {
  const response = await fetch(`/sales/${saleId}/invoice`);

  if (!response.ok) {
    throw new Error(`Invoice fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new Error('Invoice response is not a PDF');
  }

  const blob = await response.blob();
  const safeNumber = (invoiceNumber || saleId).replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = `invoice-${safeNumber}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    (() => {
      try {
        return navigator.canShare({ files: [file] });
      } catch {
        return false;
      }
    })();

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title, text: message });
      return { status: 'shared' };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: 'cancelled' };
      }
      throw error;
    }
  }

  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

  const waNumber = waMeNumber(phone);
  if (waNumber) {
    const waLink = document.createElement('a');
    waLink.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    document.body.appendChild(waLink);
    waLink.click();
    waLink.remove();
    return { status: 'fallback' };
  }

  return { status: 'unsupported' };
}
