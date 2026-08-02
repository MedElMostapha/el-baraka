import { db } from "@/db";
import { sales, batches, clients, appSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { renderInvoice, type InvoiceLabels } from "@/lib/invoices/renderInvoice";
import type { InvoiceSeller } from "@/lib/invoices/renderInvoice";import frMessages from "@/messages/fr.json";
import arMessages from "@/messages/ar.json";

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ locale: string; id: string }>;
};

function buildLabels(locale: string): InvoiceLabels {
  const messages = locale === 'ar' ? arMessages : frMessages;
  const i = messages.Invoice;
  const s = messages.Sales;
  return {
    title: i.title,
    invoiceNumber: i.invoiceNumber,
    issueDate: i.issueDate,
    seller: i.seller,
    customer: i.customer,
    cashClient: s.cashClient,
    taxNumber: i.taxNumber,
    description: i.description,
    saleType: i.saleType,
    quantity: s.quantity,
    unitPrice: s.unitPrice,
    lineTotal: i.lineTotal,
    total: s.total,
    amountPaid: s.paid,
    balanceDue: i.balanceDue,
    status: i.status,
    statusPaid: i.statusPaid,
    statusPartial: i.statusPartial,
    statusUnpaid: i.statusUnpaid,
    wholesale: s.wholesale,
    retail: s.retail,
    thankYou: i.thankYou,
    currency: s.currency,
  };
}

async function loadSeller(): Promise<InvoiceSeller> {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [
    'invoice_business_name',
    'invoice_business_phone',
    'invoice_business_address',
    'invoice_tax_number',
    'invoice_footer',
    'logo_image',
  ]));
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    businessName: map.get('invoice_business_name') ?? '',
    businessPhone: map.get('invoice_business_phone') ?? '',
    businessAddress: map.get('invoice_business_address') ?? '',
    taxNumber: map.get('invoice_tax_number') ?? '',
    footer: map.get('invoice_footer') ?? '',
    logoImage: map.get('logo_image') ?? '',
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { locale: rawLocale, id } = await context.params;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = rawLocale === 'ar' || rawLocale === 'fr' ? rawLocale : cookieLocale === 'ar' ? 'ar' : 'fr';

  const saleRow = await db
    .select({
      id: sales.id,
      date: sales.date,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      totalPrice: sales.totalPrice,
      amountPaid: sales.amountPaid,
      type: sales.type,
      invoiceNumber: sales.invoiceNumber,
      batchName: batches.name,
      clientId: clients.id,
      clientName: clients.name,
      clientPhone: clients.phone,
      clientAddress: clients.address,
    })
    .from(sales)
    .leftJoin(batches, eq(sales.batchId, batches.id))
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(eq(sales.id, id));

  if (saleRow.length === 0) {
    return new Response('Sale not found', { status: 404 });
  }

  const sale = saleRow[0];
  const seller = await loadSeller();

  const pdf = await renderInvoice(
    {
      invoiceNumber: sale.invoiceNumber ?? `INV-${sale.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      date: sale.date,
      batchName: sale.batchName,
      saleType: sale.type,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalPrice: sale.totalPrice,
      amountPaid: sale.amountPaid,
      client: sale.clientId
        ? { name: sale.clientName ?? '', phone: sale.clientPhone, address: sale.clientAddress }
        : null,
      seller,
    },
    buildLabels(locale),
    locale,
  );

  const safeInvoiceNumber = (sale.invoiceNumber ?? 'invoice').replace(/[^a-zA-Z0-9-_]/g, '');

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${safeInvoiceNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
