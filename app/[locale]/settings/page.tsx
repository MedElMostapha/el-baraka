import { getTranslations } from 'next-intl/server';
import SettingsClient from '@/components/SettingsClient';
import { getFeedPricePerSac, getKgPerSac } from '@/actions/settings';

export default async function SettingsPage() {
  const kgPerSac = await getKgPerSac();
  const feedPricePerSac = await getFeedPricePerSac();
  return <SettingsClient kgPerSac={kgPerSac} feedPricePerSac={feedPricePerSac} />;
}
