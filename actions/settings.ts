"use server";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const KG_PER_SAC_KEY = 'kg_per_sac';
const FEED_PRICE_PER_SAC_KEY = 'feed_price_per_sac';
const COST_PER_CHICK_KEY = 'cost_per_chick';

const INVOICE_BUSINESS_NAME_KEY = 'invoice_business_name';
const INVOICE_BUSINESS_PHONE_KEY = 'invoice_business_phone';
const INVOICE_BUSINESS_ADDRESS_KEY = 'invoice_business_address';
const INVOICE_TAX_NUMBER_KEY = 'invoice_tax_number';
const INVOICE_FOOTER_KEY = 'invoice_footer';
const LOGO_IMAGE_KEY = 'logo_image';

async function getSetting(key: string): Promise<string> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row.length > 0 ? row[0].value : '';
  } catch {
    return '';
  }
}

async function setSetting(key: string, value: string) {
  try {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error);
    return { success: false };
  }
}

export async function getKgPerSac(): Promise<number> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, KG_PER_SAC_KEY));
    return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setKgPerSac(value: number) {
  try {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, KG_PER_SAC_KEY));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value: String(value) }).where(eq(appSettings.key, KG_PER_SAC_KEY));
    } else {
      await db.insert(appSettings).values({ key: KG_PER_SAC_KEY, value: String(value) });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to set kgPerSac:", error);
    return { success: false };
  }
}

export async function getFeedPricePerSac(): Promise<number> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, FEED_PRICE_PER_SAC_KEY));
    return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setFeedPricePerSac(value: number) {
  try {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, FEED_PRICE_PER_SAC_KEY));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value: String(value) }).where(eq(appSettings.key, FEED_PRICE_PER_SAC_KEY));
    } else {
      await db.insert(appSettings).values({ key: FEED_PRICE_PER_SAC_KEY, value: String(value) });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to set feedPricePerSac:", error);
    return { success: false };
  }
}

export async function getCostPerChick(): Promise<number> {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, COST_PER_CHICK_KEY));
    return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setCostPerChick(value: number) {
  try {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, COST_PER_CHICK_KEY));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value: String(value) }).where(eq(appSettings.key, COST_PER_CHICK_KEY));
    } else {
      await db.insert(appSettings).values({ key: COST_PER_CHICK_KEY, value: String(value) });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to set costPerChick:", error);
    return { success: false };
  }
}

export async function getInvoiceBusinessName(): Promise<string> {
  return getSetting(INVOICE_BUSINESS_NAME_KEY);
}

export async function setInvoiceBusinessName(value: string) {
  return setSetting(INVOICE_BUSINESS_NAME_KEY, value);
}

export async function getInvoiceBusinessPhone(): Promise<string> {
  return getSetting(INVOICE_BUSINESS_PHONE_KEY);
}

export async function setInvoiceBusinessPhone(value: string) {
  return setSetting(INVOICE_BUSINESS_PHONE_KEY, value);
}

export async function getInvoiceBusinessAddress(): Promise<string> {
  return getSetting(INVOICE_BUSINESS_ADDRESS_KEY);
}

export async function setInvoiceBusinessAddress(value: string) {
  return setSetting(INVOICE_BUSINESS_ADDRESS_KEY, value);
}

export async function getInvoiceTaxNumber(): Promise<string> {
  return getSetting(INVOICE_TAX_NUMBER_KEY);
}

export async function setInvoiceTaxNumber(value: string) {
  return setSetting(INVOICE_TAX_NUMBER_KEY, value);
}

export async function getInvoiceFooter(): Promise<string> {
  return getSetting(INVOICE_FOOTER_KEY);
}

export async function setInvoiceFooter(value: string) {
  return setSetting(INVOICE_FOOTER_KEY, value);
}

export async function getLogoImage(): Promise<string> {
  return getSetting(LOGO_IMAGE_KEY);
}

export async function setLogoImage(value: string) {
  return setSetting(LOGO_IMAGE_KEY, value);
}
