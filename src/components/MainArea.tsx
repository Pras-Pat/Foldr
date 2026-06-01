/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, FolderOpen, ArrowUpRight, Play, Info, Keyboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Collection, Tab, StatusType } from '../types';
import { LucideIcon } from './LucideIcon';
import { ConfirmationModal } from './ConfirmationModal';

interface MainAreaProps {
  collection: Collection | null;
  allCollections: Collection[];
  onCycleStatus: (collectionId: string) => void;
  onEditCollection: (collectionId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onAddTabs: (collectionId: string, urlsStr: string) => void;
  onDeleteTab: (collectionId: string, tabId: string) => void;
  onDeleteMultipleTabs: (collectionId: string, tabIds: string[]) => void;
  onReorderTabs: (collectionId: string, sourceTabId: string, targetTabId: string, position: 'before' | 'after') => void;
  onSelectCollection: (collectionId: string) => void;
}

export const MainArea: React.FC<MainAreaProps> = ({
  collection,
  allCollections,
  onCycleStatus,
  onEditCollection,
  onDeleteCollection,
  onAddTabs,
  onDeleteTab,
  onDeleteMultipleTabs,
  onReorderTabs,
  onSelectCollection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUrls, setIsAddingUrls] = useState(false);
  const [urlsInput, setUrlsInput] = useState('');
  const [infoToast, setInfoToast] = useState<string | null>(null);

  // Bulk selection states
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Reset selection when collection or search query changes
  useEffect(() => {
    setSelectedTabIds([]);
  }, [collection?.id, searchQuery]);

  const handleToggleSelectTab = (tabId: string) => {
    setSelectedTabIds((prev) =>
      prev.includes(tabId)
        ? prev.filter((id) => id !== tabId)
        : [...prev, tabId]
    );
  };

  const handleSelectAllNone = () => {
    if (!collection) return;
    const allIds = collection.tabs.map((t) => t.id);
    const areAllSelected = allIds.every((id) => selectedTabIds.includes(id));
    if (areAllSelected) {
      // Deselect all
      setSelectedTabIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      // Select all
      setSelectedTabIds((prev) => {
        const others = prev.filter((id) => !allIds.includes(id));
        return [...others, ...allIds];
      });
    }
  };

  const handleOpenSelected = () => {
    if (!collection) return;
    const selectedTabs = collection.tabs.filter((t) => selectedTabIds.includes(t.id));
    if (selectedTabs.length === 0) return;
    
    selectedTabs.forEach((tab) => {
      window.open(tab.url, '_blank', 'noopener,noreferrer');
    });
    
    setInfoToast(`Attempted to open ${selectedTabs.length} selected bookmark(s) in new tabs.`);
  };

  // Confirmation states
  const [isConfirmingDeleteSelected, setIsConfirmingDeleteSelected] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);

  const handleDeleteSelected = () => {
    if (!collection) return;
    const count = selectedTabIds.length;
    if (count === 0) return;
    setIsConfirmingDeleteSelected(true);
  };

  const handleConfirmDeleteSelected = () => {
    if (!collection) return;
    const count = selectedTabIds.length;
    onDeleteMultipleTabs(collection.id, selectedTabIds);
    setSelectedTabIds([]);
    setInfoToast(`${count} bookmark(s) successfully removed.`);
  };

  // Tab dragging states
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (isAddingUrls && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAddingUrls]);

  // Handle Cancel or Escape Key in Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsAddingUrls(false);
      setUrlsInput('');
    }
  };

  // Toast auto-dismissal
  useEffect(() => {
    if (infoToast) {
      const timer = setTimeout(() => setInfoToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [infoToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      // Escape key handler: dismiss panels, clear states, blur focus
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          e.preventDefault();
          return;
        }
        if (isInputActive) {
          (activeEl as HTMLElement).blur();
          e.preventDefault();
        }
        if (isAddingUrls) {
          setIsAddingUrls(false);
          setUrlsInput('');
          e.preventDefault();
        }
        if (selectedTabIds.length > 0) {
          setSelectedTabIds([]);
          setInfoToast('Selections cleared.');
          e.preventDefault();
        }
        if (searchQuery) {
          setSearchQuery('');
          e.preventDefault();
        }
        return;
      }

      // Help Modal: '?' key when not inside an input
      if (e.key === '?' && !isInputActive) {
        setIsShortcutsOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Cmd or Ctrl detection
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. Add New Tab: Ctrl+A / Cmd+A (when not focused) or Alt+N / Alt+A
      const isAddTabPressed = (isCmdOrCtrl && e.key.toLowerCase() === 'a' && !isInputActive) ||
                              (e.altKey && e.key.toLowerCase() === 'n');
      if (isAddTabPressed) {
        e.preventDefault();
        if (collection) {
          setIsAddingUrls(true);
        } else {
          setInfoToast('Please select or create a collection first to add tab bookmarks.');
        }
        return;
      }

      // 2. Global Search: Ctrl+F / Cmd+F or Ctrl+K / Cmd+K
      if (isCmdOrCtrl && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input-field') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 3. Open All Tabs in Current Collection: Ctrl+O / Cmd+O
      if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenAll();
        return;
      }

      // 4. Bulk Select All / None Tabs: Alt+S or Ctrl+Shift+A (since Ctrl+A adds a bookmark)
      if ((isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        handleSelectAllNone();
        return;
      }

      // 5. Bulk Delete Selected Tab(s): Ctrl+Shift+D or Shift+Delete (only works when bookmarks are selected)
      if (selectedTabIds.length > 0 && (
        (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'd') || 
        (e.shiftKey && e.key === 'Delete')
      )) {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // 6. Bulk Open Selected Tab(s): Ctrl+Shift+O or Shift+Enter (only works when bookmarks are selected)
      if (selectedTabIds.length > 0 && (
        (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'o') || 
        (e.shiftKey && e.key === 'Enter')
      )) {
        e.preventDefault();
        handleOpenSelected();
        return;
      }

      // 7. Navigation: ArrowUp / ArrowDown to move between collections (no inputs active)
      if (!isInputActive) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (allCollections.length <= 1) return;

          const currentIndex = allCollections.findIndex((c) => c.id === collection?.id);
          let nextIndex = currentIndex;

          if (e.key === 'ArrowUp') {
            nextIndex = currentIndex <= 0 ? allCollections.length - 1 : currentIndex - 1;
          } else {
            nextIndex = currentIndex === -1 || currentIndex === allCollections.length - 1 ? 0 : currentIndex + 1;
          }

          if (nextIndex !== currentIndex && allCollections[nextIndex]) {
            onSelectCollection(allCollections[nextIndex].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    collection,
    allCollections,
    isAddingUrls,
    selectedTabIds,
    searchQuery,
    isShortcutsOpen,
    onSelectCollection
  ]);

  // Filter tabs across all collections when search is active
  const isSearchActive = searchQuery.trim().length > 0;
  
  interface MatchedTabResult {
    tab: Tab;
    collection: Collection;
  }
  
  const allMatchedResults: MatchedTabResult[] = [];
  if (isSearchActive) {
    const query = searchQuery.trim().toLowerCase();
    allCollections.forEach((col) => {
      col.tabs.forEach((tab) => {
        if (
          tab.title.toLowerCase().includes(query) ||
          tab.url.toLowerCase().includes(query)
        ) {
          allMatchedResults.push({
            tab,
            collection: col,
          });
        }
      });
    });
  }

  const navigateToCollectionFromSearch = (collectionId: string) => {
    onSelectCollection(collectionId);
    setSearchQuery(''); // clear search on navigation
  };

  // Calculate Status styling colors
  const getStatusStyle = (status: StatusType) => {
    switch (status) {
      case 'Active':
        return {
          text: '#15803D',
          bg: '#DCFCE7', // Tailwind green-100
        };
      case 'Parked':
        return {
          text: '#B45309',
          bg: '#FEF3C7', // Tailwind amber-100
        };
      case 'Done':
        return {
          text: '#4B5563',
          bg: '#F3F4F6', // Tailwind gray-100
        };
    }
  };

  const statusStyle = collection ? getStatusStyle(collection.status) : null;

  // Formatted date generator
  const formatDateTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Submit multiple URLs
  const handleAddUrlsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !urlsInput.trim()) return;

    onAddTabs(collection.id, urlsInput);
    setIsAddingUrls(false);
    setUrlsInput('');
    setInfoToast('URLs added successfully to the collection!');
  };

  // Open all tabs in new windows
  const handleOpenAll = () => {
    if (!collection) return;
    if (collection.tabs.length === 0) {
      setInfoToast('There are no tabs in this collection to open.');
      return;
    }
    
    collection.tabs.forEach((tab) => {
      window.open(tab.url, '_blank', 'noopener,noreferrer');
    });

    setInfoToast(`Attempted to open ${collection.tabs.length} tabs. If they didn't load, please enable browser popups or open in a new tab!`);
  };

  // Copy URL action helper
  const handleSingleTabOpen = (tabUrl: string) => {
    window.open(tabUrl, '_blank', 'noopener,noreferrer');
  };

  // Drag handles for Tabs reordering
  const handleTabDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
    e.currentTarget.style.opacity = '0.35';
  };

  const handleTabDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTabId(null);
    setDropIndicator(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleTabDragOver = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    if (draggedTabId === tabId) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const position: 'before' | 'after' = relativeY < rect.height / 2 ? 'before' : 'after';

    setDropIndicator({ id: tabId, position });
  };

  const handleTabDragLeave = () => {
    setDropIndicator(null);
  };

  const handleTabDrop = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
    e.preventDefault();
    const sourceTabId = e.dataTransfer.getData('text/plain');
    if (collection && sourceTabId && sourceTabId !== targetTabId && dropIndicator) {
      onReorderTabs(collection.id, sourceTabId, targetTabId, dropIndicator.position);
    }
    setDropIndicator(null);
  };

  return (
    <div className="flex-1 bg-white h-screen flex flex-col text-[13px] overflow-hidden" id="main-area-viewport">
      {/* Search Header Bar (Centered in the viewport, No time indicator, Matches All Collections) */}
      <div className="h-13 border-b border-[#EBEBEB] px-6 flex items-center justify-center shrink-0 relative bg-white" id="global-search-header-bar">
        <div className="relative w-full max-w-md mx-auto" id="search-searchquery-wrapper">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13.5} />
          <input
            id="search-input-field"
            type="text"
            placeholder="Search bookmarks across all collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-14 py-1.5 bg-gray-50/70 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 focus:bg-white text-[12.5px] transition-all text-center placeholder-gray-400"
          />
          {searchQuery && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 hover:text-gray-600 bg-gray-200/50 hover:bg-gray-200 rounded px-1.5 py-0.5 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Keyboard Shortcuts Dialog Trigger Button */}
        <button
          type="button"
          id="keyboard-shortcuts-helper-toggle-btn"
          onClick={() => setIsShortcutsOpen(true)}
          className="absolute right-6 top-1/2 -translate-y-1/2 py-1 px-2.5 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-lg border border-transparent hover:border-[#EBEBEB] transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold select-none"
          title="See Keyboard Shortcuts (Or press '?')"
        >
          <Keyboard size={13} className="text-gray-400" />
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 text-[9px] font-mono rounded text-gray-500 font-extrabold shadow-sm leading-none m-0">?</kbd>
        </button>
      </div>

      {/* Main Area Body depending on Search Status */}
      {isSearchActive ? (
        <div className="flex-1 overflow-y-auto" id="search-results-viewport">
          {/* Header of Search Screen */}
          <div className="px-6 py-4 border-b border-[#EBEBEB] bg-gray-50/30" id="search-results-heading-area">
            <h1 className="font-extrabold text-[15px] text-gray-900 leading-tight">
              Global Search Results
            </h1>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5" id="search-results-subheading">
              Showing {allMatchedResults.length} matches for &quot;{searchQuery}&quot; across all collections
            </p>
          </div>

          <div className="p-6 space-y-2" id="search-results-content-wrapper">
            <div className="space-y-1 bg-white rounded-xl overflow-hidden" id="search-matched-tabs-container">
              {allMatchedResults.map(({ tab, collection: parentCol }) => (
                <div
                  key={tab.id}
                  id={`search-tab-row-${tab.id}`}
                  className="group relative flex items-center justify-between px-3 py-2 rounded-lg border border-transparent hover:bg-gray-50 transition-all"
                >
                  {/* Icon & Details */}
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1" id={`search-tab-meta-${tab.id}`}>
                    <img
                      src={tab.favicon}
                      alt=""
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' %3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E";
                      }}
                      referrerPolicy="no-referrer"
                      className="w-3.5 h-3.5 object-contain shrink-0 rounded-sm bg-gray-100"
                    />

                    <div className="flex items-baseline gap-2 overflow-hidden flex-1" id={`search-tab-title-desc-${tab.id}`}>
                      <span className="font-bold text-gray-800 text-[12.5px] truncate max-w-[280px]" id={`search-tab-main-heading-${tab.id}`}>
                        {tab.title}
                      </span>
                      <span
                        className="font-mono text-[11px] text-gray-400 truncate max-w-[240px] hover:text-gray-600 cursor-pointer"
                        id={`search-tab-anchor-tag-${tab.id}`}
                        onClick={() => handleSingleTabOpen(tab.url)}
                      >
                        {tab.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  </div>

                  {/* Actions & collection badge link */}
                  <div className="flex items-center gap-3 shrink-0 ml-4 font-medium" id={`search-tab-triggers-${tab.id}`}>
                    {/* Collection link badge */}
                    <button
                      id={`search-parent-badge-btn-${tab.id}`}
                      onClick={() => navigateToCollectionFromSearch(parentCol.id)}
                      style={{
                        backgroundColor: `${parentCol.iconColor}1a`,
                        color: parentCol.iconColor,
                      }}
                      className="px-2 py-0.5 rounded text-[10.5px] font-bold transition-all hover:scale-105 flex items-center gap-1 cursor-pointer"
                      title={`Go to collection: ${parentCol.name}`}
                    >
                      <LucideIcon name={parentCol.icon} size={10} />
                      <span>{parentCol.name}</span>
                    </button>

                    {/* Timestamp added */}
                    <span className="text-[11px] text-gray-400 group-hover:hidden select-none">
                      {new Date(tab.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>

                    {/* Action buttons (only appear on hover) */}
                    <div className="hidden group-hover:flex items-center gap-1 bg-white pl-2 transition-all">
                      <button
                        onClick={() => handleSingleTabOpen(tab.url)}
                        title="Open Tab in New Window"
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                      >
                        <ArrowUpRight size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteTab(parentCol.id, tab.id)}
                        title="Remove Bookmark"
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {allMatchedResults.length === 0 && (
                <div className="py-16 border border-[#EBEBEB] rounded-xl bg-gray-50/50 flex flex-col items-center justify-center p-4 text-center text-gray-400" id="search-empty-state">
                  <p className="font-bold text-gray-600 text-[12.5px]">No Bookmarks Matched Query</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                    No tabs matched &quot;{searchQuery}&quot; across any of your archived collections.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {!collection ? (
            <div className="flex-1 bg-white h-screen flex flex-col items-center justify-center p-8 text-center text-[13px] text-gray-500" id="main-area-empty-state">
              <div className="w-14 h-14 bg-gray-50 border border-[#EBEBEB] rounded-2xl flex items-center justify-center mb-4 text-gray-400">
                <FolderOpen size={24} />
              </div>
              <h3 className="font-bold text-gray-800 text-[14px]">No Collection Selected</h3>
              <p className="mt-1 text-gray-500 max-w-xs leading-relaxed">
                Select an active, parked, or done collection from the sidebar, or create a brand new one to starting archiving tab bookmarks.
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic Collection Header with opacity tint */}
              <div
                id="collection-hero-header"
                style={{ backgroundColor: `${collection.iconColor}0F` }} // 6% opacity background
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#EBEBEB] transition-all"
              >
                <div className="flex items-center gap-3.5" id="header-metadata-section">
                  {/* 34x34px icon container (icon color at 15% opacity background) */}
                  <div
                    id="collection-large-icon-wrapper"
                    style={{
                      backgroundColor: `${collection.iconColor}26`, // 15% opacity
                      color: collection.iconColor,
                    }}
                    className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-black/5"
                  >
                    <LucideIcon name={collection.icon} size={17} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2" id="header-title-pill-wrapper">
                      <h1 className="font-extrabold text-[15px] text-gray-900 leading-tight" id="header-collection-name">
                        {collection.name}
                      </h1>
                      
                      {/* Clickable status pill that cycles Active -> Parked -> Done on Click */}
                      <button
                        id="header-cycle-status-pill"
                        onClick={() => onCycleStatus(collection.id)}
                        style={{
                          color: statusStyle?.text,
                          backgroundColor: statusStyle?.bg,
                        }}
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide transition-all scale-95 hover:scale-100 cursor-pointer text-center select-none"
                        title="Click to cycle status"
                      >
                        {collection.status}
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5" id="header-last-opened-label">
                      Last saved: {formatDateTime(collection.lastOpenedAt)}
                    </p>
                  </div>
                </div>

                {/* Action Controls right-side */}
                <div className="flex items-center gap-2" id="header-controls-section">
                  <button
                    id="open-all-tabs-action-btn"
                    onClick={handleOpenAll}
                    className="flex items-center gap-1 px-3 py-1.5 border border-[#EBEBEB] rounded-lg bg-white/90 hover:bg-white text-gray-700 font-bold shadow-sm transition-all text-xs cursor-pointer hover:shadow"
                  >
                    <Play size={11} className="fill-gray-500 text-gray-500" />
                    <span>Open All</span>
                  </button>
                  
                  <button
                    id="edit-collection-action-btn"
                    onClick={() => onEditCollection(collection.id)}
                    title="Edit Collection"
                    className="p-2 border border-[#EBEBEB] rounded-lg bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow-sm transition-all cursor-pointer"
                  >
                    <Edit size={12.5} />
                  </button>

                  <button
                    id="delete-collection-action-btn"
                    onClick={() => onDeleteCollection(collection.id)}
                    title="Delete Collection"
                    className="p-2 border border-[#EBEBEB] rounded-lg bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 shadow-sm transition-all cursor-pointer"
                  >
                    <Trash2 size={12.5} />
                  </button>
                </div>
              </div>

              {/* Main Scrollable tab List area */}
              <div className="flex-1 overflow-y-auto" id="collection-tablist-scroller">
                {/* Bulk Actions Sticky Toolbar */}
                {selectedTabIds.length > 0 && (
                  <div className="sticky top-0 z-30 bg-gray-900 text-white px-6 py-2.5 flex items-center justify-between border-b border-gray-800 shadow-md text-xs" id="bulk-actions-toolbar">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center text-white font-extrabold text-[11px]" id="bulk-selection-count">
                        {selectedTabIds.length}
                      </div>
                      <span className="text-gray-200 font-medium text-[12px]">
                        {selectedTabIds.length === 1 ? '1 bookmark selected' : `${selectedTabIds.length} bookmarks selected`}
                      </span>
                      
                      <button
                        type="button"
                        id="bulk-clear-selection-btn"
                        onClick={() => setSelectedTabIds([])}
                        className="text-gray-400 hover:text-white underline text-[11px] cursor-pointer ml-1 select-none font-medium"
                      >
                        Deselect all
                      </button>
                    </div>

                    <div className="flex items-center gap-2" id="bulk-action-buttons">
                      <button
                        id="bulk-open-tabs-btn"
                        onClick={handleOpenSelected}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/5 rounded-md font-bold transition-all cursor-pointer text-[11px]"
                      >
                        <ArrowUpRight size={12} />
                        <span>Open Selected</span>
                      </button>
                      
                      <button
                        id="bulk-delete-tabs-btn"
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md font-bold transition-all cursor-pointer text-[11px]"
                      >
                        <Trash2 size={12} />
                        <span>Delete Selected</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Toast Notification */}
                {infoToast && (
                  <div className="m-6 mb-0 p-3 bg-gray-50 border border-[#EBEBEB] rounded-xl text-gray-600 flex items-start gap-2.5 animate-slide-up" id="toast-banner">
                    <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 text-[12px] font-medium leading-relaxed" id="toast-text">
                      {infoToast}
                    </div>
                    <button id="close-toast-btn" onClick={() => setInfoToast(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold leading-none py-0.5 px-1.5 cursor-pointer">
                      ×
                    </button>
                  </div>
                )}

                {/* Add URLs Form box */}
                <div className="p-6 pb-0" id="add-urls-block">
                  {!isAddingUrls ? (
                    <button
                      id="expand-add-urls-btn"
                      onClick={() => setIsAddingUrls(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-gray-200 rounded-xl font-bold text-gray-500 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add URLs to this collection</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddUrlsSubmit} className="space-y-2.5 p-4 border border-[#EBEBEB] rounded-xl bg-gray-50/50" id="add-urls-expanded-form">
                      <div className="flex justify-between items-center" id="add-urls-form-header">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest block font-bold">
                          Paste Multiple URLs (One per line)
                        </span>
                        <span className="text-[9.5px] font-mono text-gray-400" id="textarea-escape-hint">
                          Press [Esc] to cancel
                        </span>
                      </div>
                      
                      <textarea
                        id="clipboard-urls-textarea"
                        ref={textareaRef}
                        value={urlsInput}
                        onChange={(e) => setUrlsInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={4}
                        placeholder="e.g.&#10;github.com&#10;https://vite.dev&#10;news.ycombinator.com"
                        className="w-full p-3 bg-white border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 text-[12px] font-mono leading-relaxed"
                      />

                      <div className="flex items-center justify-end gap-2" id="add-urls-actions-bottom">
                        <button
                          id="cancel-add-urls-btn"
                          type="button"
                          onClick={() => {
                            setIsAddingUrls(false);
                            setUrlsInput('');
                          }}
                          className="px-3.5 py-1.5 font-bold border border-[#EBEBEB] rounded-lg bg-white text-gray-600 hover:bg-gray-50 text-xs transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          id="submit-add-urls-btn"
                          type="submit"
                          disabled={!urlsInput.trim()}
                          className="px-3.5 py-1.5 font-bold rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Add Bookmark
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Tabs display */}
                <div className="p-6 space-y-1" id="tab-list-cards-wrapper">
                  <div className="flex justify-between items-center px-1 pb-2 border-b border-gray-100/80 mb-2" id="tab-list-section-header">
                    <div className="flex items-center gap-2.5">
                      {collection.tabs.length > 0 && (
                        <button
                          type="button"
                          id="bulk-select-all-checkbox"
                          onClick={handleSelectAllNone}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            collection.tabs.every((t) => selectedTabIds.includes(t.id))
                              ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-400'
                          }`}
                          title={collection.tabs.every((t) => selectedTabIds.includes(t.id)) ? "Deselect all" : "Select all"}
                        >
                          {collection.tabs.every((t) => selectedTabIds.includes(t.id)) && (
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block select-none">
                        Saved Tabs ({collection.tabs.length})
                      </span>
                    </div>

                    {selectedTabIds.length > 0 && (
                      <span className="text-[10.5px] font-bold text-gray-500 font-mono select-none">
                        {selectedTabIds.length} of {collection.tabs.length} selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 bg-white rounded-xl overflow-hidden" id="loaded-tabs-container">
                    {collection.tabs.map((tab) => {
                      const isOver = dropIndicator?.id === tab.id;
                      const isDragged = draggedTabId === tab.id;
                      const isSelected = selectedTabIds.includes(tab.id);

                      return (
                        <div
                          key={tab.id}
                          id={`tab-row-${tab.id}`}
                          draggable
                          onDragStart={(e) => handleTabDragStart(e, tab.id)}
                          onDragEnd={handleTabDragEnd}
                          onDragOver={(e) => handleTabDragOver(e, tab.id)}
                          onDragLeave={handleTabDragLeave}
                          onDrop={(e) => handleTabDrop(e, tab.id)}
                          className={`group relative flex items-center justify-between px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-50/80 cursor-grab select-none transition-all ${
                            isSelected ? 'bg-gray-50/70 shadow-none' : ''
                          } ${
                            isDragged ? 'opacity-30 border-dashed border-gray-300' : ''
                          }`}
                        >
                          {/* Reorder Drop Indicator Top line */}
                          {isOver && dropIndicator?.position === 'before' && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300 rounded-full z-10 animate-pulse" id="tab-drop-indicator-top" />
                          )}

                          {/* Icon, Checkbox & Details */}
                          <div className="flex items-center gap-2.5 overflow-hidden flex-1" id="tab-meta-anchor">
                            {/* Individual Row Checkbox */}
                            <button
                              type="button"
                              id={`select-tab-checkbox-${tab.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectTab(tab.id);
                              }}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-gray-400 group-hover:border-gray-300'
                              }`}
                              title={isSelected ? "Deselect bookmark" : "Select bookmark"}
                            >
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 fill-current scale-75" viewBox="0 0 20 20">
                                  <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                </svg>
                              )}
                            </button>

                            <img
                              id={`tab-favicon-${tab.id}`}
                              src={tab.favicon}
                              alt=""
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' %3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E";
                              }}
                              referrerPolicy="no-referrer"
                              className="w-3.5 h-3.5 object-contain shrink-0 rounded-sm bg-gray-100 cursor-grab"
                            />

                            <div className="flex items-baseline gap-2 overflow-hidden flex-1 cursor-grab" id="tab-titles-wrapper">
                              <span className="font-bold text-gray-800 text-[12.5px] truncate max-w-[280px]" id="tab-main-title">
                                {tab.title}
                              </span>
                              <span
                                className="font-mono text-[11px] text-gray-400 truncate max-w-[240px] hover:text-gray-600 cursor-pointer"
                                id="tab-truncated-url"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleTabOpen(tab.url);
                                }}
                              >
                                {tab.url.replace(/^https?:\/\//, '')}
                              </span>
                            </div>
                          </div>

                          {/* Actions & Dates added */}
                          <div className="flex items-center gap-3 shrink-0 ml-4" id="tab-right-actions-group">
                            <span className="text-[11px] text-gray-400 group-hover:hidden select-none transition-opacity" id="tab-added-ago">
                              {new Date(tab.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>

                            <div className="hidden group-hover:flex items-center gap-1 bg-white pl-2 transition-all" id="tab-hover-actions">
                              <button
                                id={`open-link-icon-btn-${tab.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleTabOpen(tab.url);
                                }}
                                title="Open Tab in New Window"
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                              >
                                <ArrowUpRight size={13} />
                              </button>
                              <button
                                id={`delete-tab-icon-btn-${tab.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTabToDelete(tab);
                                }}
                                title="Remove Bookmark"
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Reorder Drop Indicator Bottom line */}
                          {isOver && dropIndicator?.position === 'after' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 rounded-full z-10 animate-pulse" id="tab-drop-indicator-bottom" />
                          )}
                        </div>
                      );
                    })}

                    {collection.tabs.length === 0 && (
                      <div className="py-12 border border-[#EBEBEB] rounded-xl bg-gray-50/50 flex flex-col items-center justify-center p-4 text-center text-gray-400" id="collection-tabs-empty">
                        <p className="font-bold text-gray-600 text-[12.5px]" id="no-tabs-found">No Bookmarks Found</p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                          Paste list of links in the box above to starts managing your resources!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Confirmation Modal for Bulk Deletion */}
      <ConfirmationModal
        isOpen={isConfirmingDeleteSelected}
        title="Delete Selected Bookmarks?"
        severity="danger"
        message={
          <span>
            Are you sure you want to remove the{' '}
            <strong className="text-gray-900 font-extrabold">{selectedTabIds.length}</strong>{' '}
            selected bookmark(s)? This action cannot be undone.
          </span>
        }
        confirmText="Delete Selected"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteSelected}
        onClose={() => setIsConfirmingDeleteSelected(false)}
      />

      {/* Confirmation Modal for Individual Deletion */}
      <ConfirmationModal
        isOpen={!!tabToDelete}
        title="Delete Bookmark?"
        severity="danger"
        message={
          <span>
            Are you sure you want to remove the bookmark{' '}
            <strong className="text-gray-900 font-extrabold text-xs break-all">
              &ldquo;{tabToDelete?.title || 'this tab'}&rdquo;
            </strong>?
          </span>
        }
        confirmText="Delete Bookmark"
        cancelText="Cancel"
        onConfirm={() => {
          if (collection && tabToDelete) {
            onDeleteTab(collection.id, tabToDelete.id);
            setSelectedTabIds((prev) => prev.filter((id) => id !== tabToDelete.id));
          }
          setTabToDelete(null);
        }}
        onClose={() => setTabToDelete(null)}
      />

      {/* Keyboard Shortcuts Dialog */}
      <AnimatePresence>
        {isShortcutsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="keyboard-shortcuts-overlay-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShortcutsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              id="shortcuts-backdrop"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#EBEBEB] text-[12.5px] font-medium text-gray-700 z-10"
              id="shortcuts-card"
            >
              {/* Header section */}
              <div className="p-5 border-b border-[#EBEBEB] bg-gray-50/50 flex items-center justify-between" id="shortcuts-header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white" id="shortcuts-header-icon">
                    <Keyboard size={15} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1A1A1A] text-[14px] tracking-tight leading-tight">Keyboard Shortcuts</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Speed up your bookmark organization</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="shortcuts-close-x-btn"
                  onClick={() => setIsShortcutsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Shortcuts content */}
              <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto" id="shortcuts-items-list">
                {/* Category 1 */}
                <div className="space-y-1.5" id="shortcuts-category-general">
                  <h4 className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest px-0.5 pb-0.5" id="shortcuts-category-header-1">
                    General Navigation
                  </h4>
                  <div className="space-y-1 bg-gray-50/50 border border-gray-100/50 p-2 rounded-xl" id="shortcuts-category-items-1">
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-1">
                      <span className="text-gray-500 font-medium">Global Search</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">F</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">K</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-2">
                      <span className="text-gray-500 font-medium">Toggle Shortcuts Menu</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">?</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-3">
                      <span className="text-gray-500 font-medium">Navigate Collections</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">↑</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">↓</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category 2 */}
                <div className="space-y-1.5" id="shortcuts-category-active">
                  <h4 className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest px-0.5 pb-0.5" id="shortcuts-category-header-2">
                    Collection Actions
                  </h4>
                  <div className="space-y-1 bg-gray-50/50 border border-gray-100/50 p-2 rounded-xl" id="shortcuts-category-items-2">
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-4">
                      <span className="text-gray-500 font-medium">Add Bookmark Tab(s)</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">A</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Alt</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">N</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-5">
                      <span className="text-gray-500 font-medium">Open All Tabs in List</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">O</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category 3 */}
                <div className="space-y-1.5" id="shortcuts-category-selection">
                  <h4 className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest px-0.5 pb-0.5" id="shortcuts-category-header-3">
                    Bulk Selection Actions
                  </h4>
                  <div className="space-y-1 bg-gray-50/50 border border-gray-100/50 p-2 rounded-xl" id="shortcuts-category-items-3">
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-6">
                      <span className="text-gray-500 font-medium">Select All / None</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Shift</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">A</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Alt</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">S</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-7">
                      <span className="text-gray-500 font-medium">Open Selected Tab(s)</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Shift</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">O</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Shift</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Enter</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 px-1 text-[12px]" id="shortcut-row-8">
                      <span className="text-gray-500 font-medium">Delete Selected Tab(s)</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Ctrl</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Shift</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">D</kbd>
                        <span className="text-[10px] text-gray-400 font-mono">/</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Shift</kbd>
                        <span className="text-[10px] text-gray-400">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 font-mono text-[10px] rounded text-gray-600 font-bold shadow-sm">Del</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="py-2.5 bg-gray-50 text-center text-gray-400 text-[10.5px] font-bold border-t border-[#EBEBEB]" id="shortcuts-footer-status">
                Tip: Press <kbd className="px-1 py-0.5 bg-white border border-gray-200 text-[9px] rounded shadow-sm text-gray-500 font-extrabold font-mono">Esc</kbd> to exit any menu.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
