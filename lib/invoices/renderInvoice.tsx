import React from 'react';
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer';
import path from 'node:path';

Font.register({
  family: 'IBMPlexSansArabic',
  fonts: [
    { src: path.join(process.cwd(), 'lib/invoices/fonts/IBMPlexSansArabic-Regular.ttf') },
    { src: path.join(process.cwd(), 'lib/invoices/fonts/IBMPlexSansArabic-Bold.ttf'), fontWeight: 'bold' },
  ],
});

export interface InvoiceSeller {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  taxNumber: string;
  footer: string;
  logoImage: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  batchName: string | null;
  saleType: 'wholesale' | 'retail';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  amountPaid: number;
  client: { name: string; phone?: string | null; address?: string | null } | null;
  seller: InvoiceSeller;
}

export interface InvoiceLabels {
  title: string;
  invoiceNumber: string;
  issueDate: string;
  seller: string;
  customer: string;
  cashClient: string;
  taxNumber: string;
  description: string;
  saleType: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  statusPaid: string;
  statusPartial: string;
  statusUnpaid: string;
  wholesale: string;
  retail: string;
  thankYou: string;
  currency: string;
}

const styles = {
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'IBMPlexSansArabic',
    color: '#22302b',
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 26,
  },
  brandBlock: {
    width: '58%',
  },
  brandLogoWrap: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  brandLogo: {
    width: 44,
    height: 44,
    objectFit: 'contain' as const,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#173b35',
    marginBottom: 5,
  },
  brandLine: {
    fontSize: 8.5,
    color: '#5b6b64',
    marginBottom: 1.5,
  },
  docBlock: {
    width: '42%',
    border: '1 solid #e3ebe5',
    borderRadius: 10,
    backgroundColor: '#f7faf7',
    padding: 12,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#e86f2d',
    marginBottom: 6,
  },
  docRow: {
    flexDirection: 'row' as const,
    marginBottom: 3,
  },
  docRowLabel: {
    fontSize: 8,
    color: '#8a9892',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
  },
  docRowValue: {
    fontSize: 8.5,
    fontWeight: 'bold' as const,
    color: '#173b35',
  },
  sectionLabel: {
    fontSize: 7.5,
    color: '#8a9892',
    fontWeight: 'bold' as const,
    letterSpacing: 0.12,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  customerBlock: {
    marginBottom: 24,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#22302b',
    marginBottom: 2,
  },
  customerLine: {
    fontSize: 9,
    color: '#5b6b64',
    marginBottom: 1.5,
  },
  table: {
    marginBottom: 18,
  },
  tableHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: '#173b35',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottom: '1 solid #e7eeea',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: {
    fontSize: 7.5,
    color: '#ffffff',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
  },
  td: {
    fontSize: 9.5,
    color: '#22302b',
  },
  cellDesc: { flex: 3 },
  cellType: { flex: 1.4 },
  cellQty: { flex: 1 },
  cellUnit: { flex: 1.2 },
  cellTotal: { flex: 1.4 },
  totalsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginBottom: 3,
  },
  totalsBlock: {
    width: '46%',
  },
  totalsLine: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  totalsLineAlt: {
    backgroundColor: '#f4f8f5',
    borderRadius: 6,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#5b6b64',
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    color: '#22302b',
  },
  balanceValue: {
    color: '#e86f2d',
  },
  statusChip: {
    alignSelf: 'flex-end' as const,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  statusChipText: {
    fontSize: 8,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
  },
  footer: {
    borderTop: '1 solid #e7eeea',
    marginTop: 20,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#5b6b64',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  thankYou: {
    fontSize: 8.5,
    color: '#173b35',
    fontWeight: 'bold' as const,
  },
} as const;

function renderHeaderRow(data: InvoiceData, labels: InvoiceLabels, isRTL: boolean) {
  const docAlign = isRTL ? 'left' : 'right';
  const valueAlign = isRTL ? 'left' : 'right';
  return (
    <View style={[styles.headerRow, { flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const) }]}>
      <View style={styles.brandBlock}>
        {data.seller.logoImage ? (
          <View style={[styles.brandLogoWrap, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.seller.logoImage} style={styles.brandLogo} />
          </View>
        ) : null}
        {data.seller.businessName ? (
          <Text style={[styles.brandName, { textAlign: isRTL ? 'right' : 'left' }]}>{data.seller.businessName}</Text>
        ) : null}
        {data.seller.businessPhone ? (
          <Text style={[styles.brandLine, { textAlign: isRTL ? 'right' : 'left' }]}>{data.seller.businessPhone}</Text>
        ) : null}
        {data.seller.businessAddress ? (
          <Text style={[styles.brandLine, { textAlign: isRTL ? 'right' : 'left' }]}>{data.seller.businessAddress}</Text>
        ) : null}
        {data.seller.taxNumber ? (
          <Text style={[styles.brandLine, { textAlign: isRTL ? 'right' : 'left' }]}>
            {labels.taxNumber}: {data.seller.taxNumber}
          </Text>
        ) : null}
      </View>
      <View style={styles.docBlock}>
        <Text style={[styles.docTitle, { textAlign: docAlign }]}>{labels.title}</Text>
        <View style={[styles.docRow, { flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const), justifyContent: 'space-between' as const }]}>
          <Text style={[styles.docRowLabel, { textAlign: valueAlign }]}>{labels.invoiceNumber}</Text>
          <Text style={[styles.docRowValue, { textAlign: valueAlign }]}>{data.invoiceNumber}</Text>
        </View>
        <View style={[styles.docRow, { flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const), justifyContent: 'space-between' as const }]}>
          <Text style={[styles.docRowLabel, { textAlign: valueAlign }]}>{labels.issueDate}</Text>
          <Text style={[styles.docRowValue, { textAlign: valueAlign }]}>
            {new Intl.DateTimeFormat(isRTL ? 'ar' : 'fr', { day: 'numeric', month: 'long', year: 'numeric' }).format(data.date)}
          </Text>
        </View>
        <View style={[styles.docRow, { flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const), justifyContent: 'space-between' as const }]}>
          <Text style={[styles.docRowLabel, { textAlign: valueAlign }]}>{labels.status}</Text>
          <Text style={[styles.docRowValue, { textAlign: valueAlign }]}>{statusLabel(data, labels)}</Text>
        </View>
      </View>
    </View>
  );
}

function renderCustomer(data: InvoiceData, labels: InvoiceLabels, isRTL: boolean) {
  const align = isRTL ? 'right' : 'left';
  return (
    <View style={styles.customerBlock}>
      <Text style={[styles.sectionLabel, { textAlign: align }]}>{labels.customer}</Text>
      {data.client ? (
        <View>
          <Text style={[styles.customerName, { textAlign: align }]}>{data.client.name}</Text>
          {data.client.phone ? <Text style={[styles.customerLine, { textAlign: align }]}>{data.client.phone}</Text> : null}
          {data.client.address ? <Text style={[styles.customerLine, { textAlign: align }]}>{data.client.address}</Text> : null}
        </View>
      ) : (
        <Text style={[styles.customerName, { textAlign: align }]}>{labels.cashClient}</Text>
      )}
    </View>
  );
}

function renderTable(data: InvoiceData, labels: InvoiceLabels, isRTL: boolean, money: (v: number) => string) {
  const colAlign = isRTL ? 'right' : 'left';
  const numAlign = isRTL ? 'left' : 'right';
  const header = (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.th, styles.cellDesc, { textAlign: colAlign }]}>{labels.description}</Text>
      <Text style={[styles.th, styles.cellType, { textAlign: colAlign }]}>{labels.saleType}</Text>
      <Text style={[styles.th, styles.cellQty, { textAlign: numAlign }]}>{labels.quantity}</Text>
      <Text style={[styles.th, styles.cellUnit, { textAlign: numAlign }]}>{labels.unitPrice}</Text>
      <Text style={[styles.th, styles.cellTotal, { textAlign: numAlign }]}>{labels.lineTotal}</Text>
    </View>
  );

  const row = (
    <View style={styles.tableRow}>
      <Text style={[styles.td, styles.cellDesc, { textAlign: colAlign }]}>{data.batchName || labels.description}</Text>
      <Text style={[styles.td, styles.cellType, { textAlign: colAlign }]}>
        {data.saleType === 'wholesale' ? labels.wholesale : labels.retail}
      </Text>
      <Text style={[styles.td, styles.cellQty, { textAlign: numAlign }]}>{money(data.quantity)}</Text>
      <Text style={[styles.td, styles.cellUnit, { textAlign: numAlign }]}>{money(data.unitPrice)}</Text>
      <Text style={[styles.td, styles.cellTotal, { textAlign: numAlign }]}>{money(data.totalPrice)}</Text>
    </View>
  );

  return (
    <View style={styles.table}>
      {header}
      {row}
    </View>
  );
}

function renderTotals(data: InvoiceData, labels: InvoiceLabels, isRTL: boolean, money: (v: number) => string) {
  const balance = Math.max(0, data.totalPrice - data.amountPaid);
  const status = statusLabel(data, labels);
  const statusStyles = statusChipStyle(data);
  const blockAlign = isRTL ? 'flex-start' : 'flex-end';
  return (
    <View style={{ alignItems: blockAlign }}>
      <View style={styles.totalsBlock}>
        <View style={[styles.totalsLine, styles.totalsLineAlt]}>
          <Text style={[styles.totalsLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{labels.total}</Text>
          <Text style={[styles.totalsValue, { textAlign: isRTL ? 'left' : 'right' }]}>{money(data.totalPrice)} {labels.currency}</Text>
        </View>
        <View style={styles.totalsLine}>
          <Text style={[styles.totalsLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{labels.amountPaid}</Text>
          <Text style={[styles.totalsValue, { textAlign: isRTL ? 'left' : 'right' }]}>{money(data.amountPaid)} {labels.currency}</Text>
        </View>
        <View style={[styles.totalsLine, styles.totalsLineAlt]}>
          <Text style={[styles.totalsLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{labels.balanceDue}</Text>
          <Text style={[styles.totalsValue, styles.balanceValue, { textAlign: isRTL ? 'left' : 'right' }]}>{money(balance)} {labels.currency}</Text>
        </View>
      </View>
      <View style={[styles.statusChip, statusStyles.background]}>
        <Text style={[styles.statusChipText, statusStyles.color]}>{status}</Text>
      </View>
    </View>
  );
}

function statusLabel(data: InvoiceData, labels: InvoiceLabels): string {
  if (data.amountPaid >= data.totalPrice) return labels.statusPaid;
  if (data.amountPaid > 0) return labels.statusPartial;
  return labels.statusUnpaid;
}

function statusChipStyle(data: InvoiceData) {
  if (data.amountPaid >= data.totalPrice) return { background: { backgroundColor: '#e4f3e9' }, color: { color: '#1d7a44' } };
  if (data.amountPaid > 0) return { background: { backgroundColor: '#fdf0e2' }, color: { color: '#c2562a' } };
  return { background: { backgroundColor: '#fdeaea' }, color: { color: '#b3362c' } };
}

function renderFooter(data: InvoiceData, labels: InvoiceLabels, isRTL: boolean) {
  const align = isRTL ? 'right' : 'left';
  return (
    <View style={styles.footer}>
      {data.seller.footer ? <Text style={[styles.footerText, { textAlign: align }]}>{data.seller.footer}</Text> : null}
      <Text style={[styles.thankYou, { textAlign: align }]}>{labels.thankYou}</Text>
    </View>
  );
}

export async function renderInvoice(data: InvoiceData, labels: InvoiceLabels, locale: string): Promise<Buffer> {
  const isRTL = locale === 'ar';
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const money = (value: number) => nf.format(value);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderHeaderRow(data, labels, isRTL)}
        {renderCustomer(data, labels, isRTL)}
        {renderTable(data, labels, isRTL, money)}
        {renderTotals(data, labels, isRTL, money)}
        {renderFooter(data, labels, isRTL)}
      </Page>
    </Document>
  );

  const { renderToBuffer } = await import('@react-pdf/renderer');
  return renderToBuffer(doc);
}
