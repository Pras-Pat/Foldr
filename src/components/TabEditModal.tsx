/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, ArrowUpRight, Globe, Check } from 'lucide-react';
import { Tab, CollectionSection } from '../types';
import { fetchUrlMetadata, normalizeUrl, getDomainFavicon } from '../utils/urlMetadata';
import { TabFavicon } from './TabFavicon';

interface TabEditModalProps {
  isOpen: boolean;
  tab: Tab | null;
  sections?: CollectionSection[];
  onClose: () => void;
  onSave: (tabId: string, updates: { title: string; url: string; favicon: string; sectionId?: string | null }) => void;
}

export const TabEditModal: React.FC<TabEditModalProps> = ({
  isOpen,
  tab,
  sections,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [favicon, setFavicon] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tab && isOpen) {
      setTitle(tab.title);
      setUrl(tab.url);
      setFavicon(tab.favicon);
      setSectionId(tab.sectionId || null);
      setIsFetching(false);
      setFetchSuccess(false);
      setErrorMsg(null);
    }
  }, [tab, isOpen]);

  if (!isOpen || !tab) return null;

  const handleFetchWebTitle = async () => {
    if (!url.trim()) {
      setErrorMsg('Please enter a valid URL first.');
      return;
    }
    setErrorMsg(null);
    setIsFetching(true);
    setFetchSuccess(false);

    try {
      const normalized = normalizeUrl(url);
      const meta = await fetchUrlMetadata(normalized, 5000);
      if (meta.title) {
        setTitle(meta.title);
      }
      if (meta.favicon) {
        setFavicon(meta.favicon);
      }
      setFetchSuccess(true);
      setTimeout(() => setFetchSuccess(false), 2500);
    } catch {
      setErrorMsg('Could not fetch title from web. You can type a custom title manually.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a title for this bookmark.');
      return;
    }
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl) {
      setErrorMsg('Please enter a valid URL.');
      return;
    }

    // Always preserve tab's existing favicon or resolve via bulletproof getDomainFavicon
    const finalFavicon =
      favicon && !favicon.includes('undefined')
        ? favicon
        : (tab.favicon && !tab.favicon.includes('undefined'))
        ? tab.favicon
        : getDomainFavicon(cleanUrl);

    onSave(tab.id, {
      title: title.trim(),
      url: cleanUrl,
      favicon: finalFavicon,
      sectionId,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.16 }}
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/80 w-full max-w-lg overflow-hidden z-10"
          id="tab-edit-modal-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                <TabFavicon
                  url={url}
                  favicon={favicon}
                  size={18}
                  className="w-4.5 h-4.5 object-contain"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-[15px] text-gray-900 leading-tight">
                  Rename & Edit Link
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  Customize the title or fetch the latest name from the web
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="tab-edit-title-input"
                  className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block"
                >
                  Link Title / Name
                </label>
                <button
                  type="button"
                  onClick={handleFetchWebTitle}
                  disabled={isFetching || !url.trim()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Auto-fetch title from YouTube, Google Docs, Amazon, etc."
                >
                  {isFetching ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-blue-600" />
                      <span>Fetching title...</span>
                    </>
                  ) : fetchSuccess ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600">Updated!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="text-blue-500" />
                      <span>Auto-fetch from web</span>
                    </>
                  )}
                </button>
              </div>

              <input
                id="tab-edit-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Taylor Swift - Blank Space or Project Roadmap"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all shadow-2xs"
                autoFocus
              />
            </div>

            {/* URL field */}
            <div className="space-y-1.5">
              <label
                htmlFor="tab-edit-url-input"
                className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block"
              >
                Destination URL
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Globe size={14} />
                </div>
                <input
                  id="tab-edit-url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all shadow-2xs"
                />
                <a
                  href={normalizeUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Test link in new window"
                >
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>

            {/* Section selector (if collection has sections) */}
            {sections && sections.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="tab-edit-section-select"
                  className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block"
                >
                  Section
                </label>
                <select
                  id="tab-edit-section-select"
                  value={sectionId || ''}
                  onChange={(e) => setSectionId(e.target.value || null)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all shadow-2xs"
                >
                  <option value="">General / No Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <p className="text-[11.5px] font-medium text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {errorMsg}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[12px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-[12px] font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
