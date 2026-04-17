import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <main className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-orange-50 rounded-[1.25rem] flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">
          El Baraka
        </p>
      </div>
    </main>
  );
}
