import SettingsClient from '@/components/SettingsClient';
import { getCostPerChick, getFeedPricePerSac, getKgPerSac } from '@/actions/settings';

export default async function SettingsPage() {
  const kgPerSac = await getKgPerSac();
  const feedPricePerSac = await getFeedPricePerSac();
  const costPerChick = await getCostPerChick();
  return <SettingsClient kgPerSac={kgPerSac} feedPricePerSac={feedPricePerSac} costPerChick={costPerChick} />;
}
