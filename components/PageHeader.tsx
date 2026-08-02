import { LogoAvatar } from '@/components/BrandLogo';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__content">
        <span className="page-header__eyebrow">{subtitle}</span>
        <h1 className="page-header__title">{title}</h1>
      </div>
      <div className="page-header__mark">
        <LogoAvatar size={52} className="page-header__avatar" />
        <div className="status-dot" aria-label="Connected"></div>
      </div>
    </header>
  );
}
