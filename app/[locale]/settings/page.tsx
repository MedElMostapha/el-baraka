import { getTranslations } from 'next-intl/server';
import SettingsClient from '@/components/SettingsClient';
import { getKgPerSac } from '@/actions/settings';

export default async function SettingsPage() {
  const kgPerSac = await getKgPerSac();
  return <SettingsClient kgPerSac={kgPerSac} />;
}
