"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Loader2 } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
  title: string;
  label: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
  type?: "text" | "number";
}

export function PromptModal({ isOpen, onClose, onSubmit, title, label, defaultValue = "", submitText = "Save", cancelText = "Cancel", type = "text" }: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    await onSubmit(value);
    setIsPending(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
          <input 
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-14 px-6 rounded-2xl border-none bg-slate-100/50 text-lg font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" 
            autoFocus
          />
        </div>
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            type="submit"
            disabled={isPending || !value.trim()}
            className="flex-1 px-4 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-colors flex items-center justify-center disabled:opacity-50 shadow-xl"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
