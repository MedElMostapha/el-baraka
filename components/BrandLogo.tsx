"use client";

import React, { createContext, useContext } from 'react';
import Image from 'next/image';

const BrandContext = createContext<{ logoImage: string }>({ logoImage: '' });

export function BrandProvider({ logoImage, children }: { logoImage: string; children: React.ReactNode }) {
  return <BrandContext.Provider value={{ logoImage }}>{children}</BrandContext.Provider>;
}

export function useBrandLogo(): string {
  return useContext(BrandContext).logoImage;
}

const DEFAULT_LOGO = '/icons/icon-192x192.png';

export function LogoAvatar({ size = 52, className }: { size?: number; className?: string }) {
  const logoImage = useBrandLogo();
  if (logoImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoImage} alt="El Baraka" width={size} height={size} className={className} />
    );
  }
  return <Image src={DEFAULT_LOGO} alt="El Baraka" width={size} height={size} className={className} />;
}
