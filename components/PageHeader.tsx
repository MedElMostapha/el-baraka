import Image from 'next/image';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between mt-4 mb-6">
      <div>
        <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
          {title}
        </h1>
        <p className="text-orange-500 font-black text-xs uppercase tracking-[0.2em] mt-2">{subtitle}</p>
      </div>
      <div className="relative shrink-0 ml-4">
        <Image 
          src="/icons/icon-192x192.png" 
          alt="App Icon" 
          width={56} 
          height={56} 
          className="rounded-[1.25rem] shadow-xl shadow-orange-200"
        />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#f8fafc] rounded-full"></div>
      </div>
    </header>
  );
}
