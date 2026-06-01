/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  severity?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  severity = 'danger',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="confirmation-modal-overlay">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            id="confirmation-modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-[360px] bg-white rounded-xl shadow-xl overflow-hidden border border-[#EBEBEB] text-[13px] leading-relaxed z-10"
            id="confirmation-modal-card"
          >
            {/* Header / Accent Top Bar based on severity */}
            <div 
              className={`h-1.5 w-full ${
                severity === 'danger' 
                  ? 'bg-red-500' 
                  : severity === 'warning' 
                  ? 'bg-amber-500' 
                  : 'bg-blue-500'
              }`} 
              id="confirmation-severity-bar"
            />

            {/* Close Button Top-Right */}
            <button
              onClick={onClose}
              id="confirmation-close-btn"
              className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            {/* Content Area */}
            <div className="p-5 flex flex-col items-center text-center" id="confirmation-body">
              {/* Severity Icon */}
              <div 
                className={`w-11 h-11 rounded-full flex items-center justify-center mb-3.5 ${
                  severity === 'danger' 
                    ? 'bg-red-50 text-red-500 border border-red-100' 
                    : severity === 'warning' 
                    ? 'bg-amber-50 text-amber-500 border border-amber-100' 
                    : 'bg-blue-50 text-blue-500 border border-blue-100'
                }`}
                id="confirmation-icon-circle"
              >
                {severity === 'danger' && <Trash2 size={19} className="stroke-[2.2]" />}
                {severity === 'warning' && <AlertTriangle size={19} className="stroke-[2.2]" />}
                {severity === 'info' && <AlertTriangle size={19} className="stroke-[2.2]" />}
              </div>

              {/* Title */}
              <h3 className="font-extrabold text-[#1A1A1A] text-[14.5px] tracking-tight mb-2" id="confirmation-title">
                {title}
              </h3>

              {/* Message */}
              <div className="text-gray-500 font-medium text-[12.5px] px-1" id="confirmation-msg">
                {message}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[#EBEBEB] bg-gray-50/50" id="confirmation-footer">
              <button
                type="button"
                id="confirmation-cancel-btn"
                onClick={onClose}
                className="flex-1 py-1.5 font-bold border border-[#EBEBEB] rounded-lg bg-white text-gray-600 hover:bg-gray-100 active:bg-gray-100/70 transition-all cursor-pointer text-center select-none"
              >
                {cancelText}
              </button>
              <button
                type="button"
                id="confirmation-action-btn"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-1.5 font-semibold text-white rounded-lg transition-all cursor-pointer text-center select-none shadow-sm ${
                  severity === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 hover:shadow active:bg-red-700'
                    : severity === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
                    : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
