"use client";

import React from 'react';
import { Modal } from './Modal';
import { Loader2 } from 'lucide-react';

import { useTranslations } from 'next-intl';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }: ConfirmModalProps) {
  const t = useTranslations('Common');
  const [isPending, setIsPending] = React.useState(false);

  const displayConfirm = confirmText || t('confirm');
  const displayCancel = cancelText || t('cancel');

  const handleConfirm = async () => {
    setIsPending(true);
    await onConfirm();
    setIsPending(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-500 font-medium mb-8 text-sm">{message}</p>
      <div className="flex gap-3">
        <button 
          onClick={onClose}
          disabled={isPending}
          className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors disabled:opacity-50"
        >
          {displayCancel}
        </button>
        <button 
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-200"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : displayConfirm}
        </button>
      </div>
    </Modal>
  );
}
