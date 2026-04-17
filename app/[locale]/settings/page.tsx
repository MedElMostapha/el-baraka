import { getTranslations } from 'next-intl/server';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  return <SettingsClient />;
}
