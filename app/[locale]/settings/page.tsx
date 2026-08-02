import SettingsClient from '@/components/SettingsClient';
import { getCostPerChick, getFeedPricePerSac, getInvoiceBusinessAddress, getInvoiceBusinessName, getInvoiceBusinessPhone, getInvoiceFooter, getInvoiceTaxNumber, getKgPerSac, getLogoImage } from '@/actions/settings';

export default async function SettingsPage() {
  const kgPerSac = await getKgPerSac();
  const feedPricePerSac = await getFeedPricePerSac();
  const costPerChick = await getCostPerChick();
  const [invoiceBusinessName, invoiceBusinessPhone, invoiceBusinessAddress, invoiceTaxNumber, invoiceFooter, logoImage] = await Promise.all([
    getInvoiceBusinessName(),
    getInvoiceBusinessPhone(),
    getInvoiceBusinessAddress(),
    getInvoiceTaxNumber(),
    getInvoiceFooter(),
    getLogoImage(),
  ]);

  return (
    <SettingsClient
      kgPerSac={kgPerSac}
      feedPricePerSac={feedPricePerSac}
      costPerChick={costPerChick}
      invoiceBusinessName={invoiceBusinessName}
      invoiceBusinessPhone={invoiceBusinessPhone}
      invoiceBusinessAddress={invoiceBusinessAddress}
      invoiceTaxNumber={invoiceTaxNumber}
      invoiceFooter={invoiceFooter}
      logoImage={logoImage}
    />
  );
}
