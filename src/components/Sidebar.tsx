/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Star, ChevronRight, ChevronDown, Plus, Sun, Moon } from 'lucide-react';
import { Collection, StatusType } from '../types';
import { LucideIcon } from './LucideIcon';

interface SidebarProps {
  collections: Collection[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  selectedStatus: 'All' | StatusType;
  setSelectedStatus: (status: 'All' | StatusType) => void;
  onAddCollection: () => void;
  onAddSubcollection: (parentId: string) => void;
  onReorderCollections: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onMoveCollectionToParent?: (sourceId: string, targetParentId: string | null) => void;
  onToggleStarCollection: (id: string) => void;
  isPersisted: boolean;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestHarden: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  activeId,
  setActiveId,
  selectedStatus,
  setSelectedStatus,
  onAddCollection,
  onAddSubcollection,
  onReorderCollections,
  onMoveCollectionToParent,
  onToggleStarCollection,
  isPersisted,
  onExportBackup,
  onImportBackup,
  onRequestHarden,
  theme = 'light',
  onToggleTheme,
}) => {
  // Drag states local to sidebar item
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null);

  // Expanded / collapsed state for parent collections (default to expanded)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  // If active collection is a subcollection, ensure its parent is expanded
  useEffect(() => {
    if (activeId) {
      const activeCol = collections.find((c) => c.id === activeId);
      if (activeCol && activeCol.parentId) {
        setCollapsedMap((prev) => ({
          ...prev,
          [activeCol.parentId!]: false,
        }));
      }
    }
  }, [activeId, collections]);

  const toggleExpand = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setCollapsedMap((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // Status dot color mapping
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'Active':
        return '#22C55E';
      case 'Parked':
        return '#F59E0B';
      case 'Done':
        return '#9CA3AF';
    }
  };

  // Separate root collections from subcollections
  const rootCollections = collections.filter((c) => !c.parentId);

  // Helper to get subcollections for a given parent
  const getSubcollections = (parentId: string) => {
    return collections.filter((c) => c.parentId === parentId);
  };

  // Filter root collection and its subcollections by status
  const filterRootCollection = (rootCol: Collection) => {
    const subs = getSubcollections(rootCol.id);
    if (selectedStatus === 'All') {
      return { include: true, subs };
    }
    const matchingSubs = subs.filter((s) => s.status === selectedStatus);
    const rootMatches = rootCol.status === selectedStatus;
    if (rootMatches || matchingSubs.length > 0) {
      return { include: true, subs: matchingSubs };
    }
    return { include: false, subs: [] };
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    const target = e.currentTarget;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedId(null);
    setDropIndicator(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string, isRootTarget: boolean) => {
    if (!draggedId || draggedId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    // Check dragged item properties
    const draggedCol = collections.find((c) => c.id === draggedId);
    const hasChildren = collections.some((c) => c.parentId === draggedId);
    
    // Only root collections without children can be dragged INTO a root collection
    // (If the dragged item is already a subcollection, dragging directly into another root can move it into that root)
    const canNestInside = isRootTarget && !hasChildren;

    let position: 'before' | 'after' | 'inside';
    if (canNestInside) {
      // 3 zones: top 25% = before, middle 50% = inside, bottom 25% = after
      if (relativeY < height * 0.25) {
        position = 'before';
      } else if (relativeY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else {
      // Standard reordering (before / after)
      position = relativeY < height * 0.5 ? 'before' : 'after';
    }

    setDropIndicator({ id: targetId, position });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving to an element outside the current target
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId && sourceId !== targetId && dropIndicator) {
      if (dropIndicator.position === 'inside') {
        if (onMoveCollectionToParent) {
          onMoveCollectionToParent(sourceId, targetId);
          // Auto-expand target collection so the newly nested item is visible
          setCollapsedMap((prev) => ({
            ...prev,
            [targetId]: false,
          }));
        }
      } else {
        onReorderCollections(sourceId, targetId, dropIndicator.position);
      }
    }
    setDropIndicator(null);
    setDraggedId(null);
  };

  // Handler when dropping in the empty list container (promotes subcollection to root at the end of the list)
  const handleEmptyListDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedId) return;
    e.preventDefault();
  };

  const handleEmptyListDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId) {
      const sourceCol = collections.find((c) => c.id === sourceId);
      if (sourceCol && sourceCol.parentId && onMoveCollectionToParent) {
        onMoveCollectionToParent(sourceId, null);
      }
    }
    setDropIndicator(null);
    setDraggedId(null);
  };

  // Render Subcollection Row
  const renderSubcollectionRow = (sub: Collection) => {
    const isActive = activeId === sub.id;
    const isOver = dropIndicator?.id === sub.id;
    const isDragged = draggedId === sub.id;

    return (
      <div
        key={sub.id}
        id={`sidebar-subrow-${sub.id}`}
        draggable
        onDragStart={(e) => handleDragStart(e, sub.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, sub.id, false)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, sub.id)}
        onClick={() => setActiveId(sub.id)}
        className={`group relative flex items-center justify-between pl-2 pr-2 py-1 rounded-md cursor-pointer transition-all select-none text-[12px] ${
          isActive
            ? 'bg-gray-200/70 font-semibold text-gray-900 shadow-sm'
            : 'text-gray-600 hover:bg-gray-100/90 hover:text-gray-900'
        } ${isDragged ? 'opacity-40' : ''}`}
      >
        {/* Drop Indicator */}
        {isOver && dropIndicator?.position === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" />
        )}

        {/* Content */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          <span
            style={{ color: sub.iconColor }}
            className="flex items-center justify-center shrink-0 w-3.5 h-3.5"
          >
            <LucideIcon name={sub.icon} size={12.5} style={{ color: sub.iconColor }} />
          </span>
          <span className="truncate tracking-tight leading-normal" id={`subcol-name-${sub.id}`}>
            {sub.name}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className="text-[10.5px] text-gray-400 group-hover:text-gray-500 font-medium">
            {sub.tabs.length}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: getStatusColor(sub.status) }}
            title={sub.status}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStarCollection(sub.id);
            }}
            className={`p-0.5 rounded transition-all hover:scale-110 cursor-pointer focus:outline-none flex items-center justify-center ${
              sub.starred
                ? 'text-amber-400 hover:text-amber-500'
                : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
            title={sub.starred ? "Remove favorite" : "Star subcollection"}
          >
            <Star size={10.5} className={sub.starred ? 'fill-amber-400' : ''} />
          </button>
        </div>

        {isOver && dropIndicator?.position === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" />
        )}
      </div>
    );
  };

  // Render Root Collection with optional 1-layer deep subcollections
  const renderRootCollectionItem = (rootCol: Collection, filteredSubs: Collection[]) => {
    const isActive = activeId === rootCol.id;
    const isOver = dropIndicator?.id === rootCol.id;
    const isDragged = draggedId === rootCol.id;
    const allSubs = getSubcollections(rootCol.id);
    const hasSubs = allSubs.length > 0;
    const isCollapsed = !!collapsedMap[rootCol.id];
    const isDropInside = isOver && dropIndicator?.position === 'inside';

    return (
      <div key={rootCol.id} className="space-y-0.5">
        {/* Parent Collection Row */}
        <div
          id={`sidebar-row-${rootCol.id}`}
          draggable
          onDragStart={(e) => handleDragStart(e, rootCol.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, rootCol.id, true)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, rootCol.id)}
          onClick={() => setActiveId(rootCol.id)}
          className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all select-none ${
            isDropInside
              ? 'bg-blue-50/90 text-blue-900 ring-2 ring-blue-500/60 ring-inset shadow-sm'
              : isActive
              ? 'bg-gray-200/60 font-semibold text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          } ${isDragged ? 'opacity-40' : ''}`}
        >
          {/* Top Drop Indicator (for reordering above) */}
          {isOver && dropIndicator?.position === 'before' && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" id="drop-indicator-top" />
          )}

          {/* Left Icon + Expand Arrow + Title */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0" id="row-media-title-wrapper">
            {/* Expand / Collapse Chevron */}
            {hasSubs ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(e, rootCol.id)}
                className="p-0.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200/60 transition-colors shrink-0"
                title={isCollapsed ? "Expand subcollections" : "Collapse subcollections"}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            <span
              id="row-icon-span"
              style={{ color: rootCol.iconColor }}
              className="flex items-center justify-center shrink-0 w-4 h-4"
            >
              <LucideIcon name={rootCol.icon} size={14} style={{ color: rootCol.iconColor }} />
            </span>
            <span className="truncate text-[12.5px] tracking-tight leading-normal py-0.5" id="row-collection-name">
              {rootCol.name}
            </span>
          </div>

          {/* Right Meta (Tab count, + Add Subcollection on hover, Status dot, Star) */}
          <div className="flex items-center gap-1 shrink-0 ml-1.5" id="row-meta-indicators">
            {/* Quick Add Subcollection Button on Hover */}
            <button
              type="button"
              id={`add-subcol-quick-btn-${rootCol.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddSubcollection(rootCol.id);
              }}
              className="p-0.5 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-200/70 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Add Subcollection"
            >
              <Plus size={12} />
            </button>

            <span className="text-[11px] text-gray-400 group-hover:text-gray-500 font-medium" id="row-tab-counter">
              {rootCol.tabs.length}
            </span>

            <span
              id="row-status-dot"
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: getStatusColor(rootCol.status) }}
              title={rootCol.status}
            />

            <button
              type="button"
              id={`toggle-star-btn-${rootCol.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStarCollection(rootCol.id);
              }}
              className={`p-0.5 rounded-md transition-all hover:scale-110 cursor-pointer focus:outline-none flex items-center justify-center ${
                rootCol.starred
                  ? 'text-amber-400 hover:text-amber-500'
                  : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
              }`}
              title={rootCol.starred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={11.5} className={rootCol.starred ? 'fill-amber-400' : ''} />
            </button>
          </div>

          {/* Bottom Drop Indicator */}
          {isOver && dropIndicator?.position === 'after' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" id="drop-indicator-bottom" />
          )}
        </div>

        {/* 1-Layer Deep Subcollections Tree branch */}
        {hasSubs && !isCollapsed && (
          <div className="ml-3 pl-2 border-l border-gray-200/80 space-y-0.5 my-0.5" id={`subcollections-branch-${rootCol.id}`}>
            {filteredSubs.map(renderSubcollectionRow)}
            {filteredSubs.length === 0 && selectedStatus !== 'All' && (
              <div className="pl-2 py-0.5 text-[10.5px] text-gray-400 italic">
                No {selectedStatus.toLowerCase()} subcollections
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Group into Starred and Non-Starred root items
  const processedRootItems = rootCollections.map((rootCol) => ({
    rootCol,
    filterResult: filterRootCollection(rootCol),
  })).filter((item) => item.filterResult.include);

  const starredItems = processedRootItems.filter(
    (item) => item.rootCol.starred || item.filterResult.subs.some((s) => s.starred)
  );

  const regularItems = processedRootItems.filter(
    (item) => !item.rootCol.starred && !item.filterResult.subs.some((s) => s.starred)
  );

  return (
    <div
      id="sidebar-container"
      className="w-[210px] bg-[#F7F7F5] h-screen flex flex-col shrink-0 border-r border-[#E5E5E0] text-[13px] overflow-hidden"
    >
      {/* Brand Header */}
      <div className="h-13 px-4 flex items-center justify-between border-b border-[#EBEBEB] shrink-0" id="sidebar-brand-header">
        <div className="flex items-center gap-2">
          {/* Custom Mini Folder Stack Logomark - Always identical in light & dark */}
          <div 
            id="foldr-logo-container"
            className="w-6 h-6 rounded-md bg-black flex items-center justify-center shadow-sm relative overflow-hidden"
          >
            <svg
              viewBox="0 0 100 100"
              className="w-4.5 h-4.5 fill-white"
              id="foldr-logo-svg"
            >
              {/* Top Wedge */}
              <path d="M 72.5 15.75 A 45.5 45.5 0 0 0 26.5 61.25 L 72.5 61.25 Z" />
              {/* Bottom Wedge */}
              <path d="M 26.5 61.25 A 23 23 0 0 1 49.5 84.25 L 26.5 84.25 Z" />
            </svg>
          </div>
          <span className="font-extrabold text-[15px] text-gray-900 tracking-tight" id="brand-name">
            Foldr
          </span>
        </div>

        {/* Light / Dark Mode Toggle Button on right side */}
        <button
          type="button"
          id="theme-mode-toggle-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 transition-colors cursor-pointer focus:outline-none"
        >
          {theme === 'dark' ? (
            <Sun size={14} className="text-amber-400 transition-transform duration-200 hover:rotate-45" />
          ) : (
            <Moon size={14} className="text-gray-600 transition-transform duration-200 hover:-rotate-12" />
          )}
        </button>
      </div>

      {/* Solid Black Top New Collection Button as requested */}
      <div className="h-[68px] px-3 flex items-center border-b border-[#EBEBEB] shrink-0" id="sidebar-top-new-collection-container">
        <button
          type="button"
          id="add-collection-top-btn"
          onClick={onAddCollection}
          className="w-full flex items-center justify-center py-2 px-3 bg-[#1A1A1C] hover:bg-black active:bg-gray-900 text-white rounded-lg text-[12.5px] font-semibold tracking-wide transition-all cursor-pointer focus:outline-none shadow-sm"
        >
          <span>+ New Collection</span>
        </button>
      </div>

      {/* Status Filter Component */}
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1" id="status-filter-wrapper">
        <span id="status-filter-header" className="px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
          Status Filters
        </span>
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-gray-200/50 rounded-lg text-center" id="status-filter-grid">
          {(['All', 'Active', 'Parked', 'Done'] as const).map((st) => (
            <button
              key={st}
              id={`filter-pill-${st.toLowerCase()}`}
              onClick={() => setSelectedStatus(st)}
              className={`py-1 text-[11.5px] font-medium rounded-md transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-2 h-px bg-[#EBEBEB]" id="sidebar-divider-status-to-lists" />

      {/* Starred section and collections lists */}
      <div
        className="flex-1 overflow-y-auto px-2 py-3 space-y-4"
        id="sidebar-lists-area"
        onDragOver={handleEmptyListDragOver}
        onDrop={handleEmptyListDrop}
      >
        {/* Starred Section */}
        <div className="space-y-1" id="starred-collections-section">
          <div id="starred-section-header" className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Star size={10} className="fill-gray-400 text-gray-400" />
            <span>Starred</span>
          </div>
          <div className="space-y-0.5" id="starred-rows-list">
            {starredItems.map((item) => renderRootCollectionItem(item.rootCol, item.filterResult.subs))}
            {starredItems.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-gray-400 italic" id="no-starred-placeholder">
                No starred collections
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-[#EBEBEB]" id="sidebar-section-divider" />

        {/* Regular Collections Section */}
        <div className="space-y-1" id="general-collections-section">
          <span id="collections-section-header" className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Collections
          </span>
          <div className="space-y-0.5" id="regular-rows-list">
            {regularItems.map((item) => renderRootCollectionItem(item.rootCol, item.filterResult.subs))}
            {regularItems.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-gray-400 italic" id="no-regular-placeholder">
                No other collections
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Status & Backup utilities */}
      <div className="px-3.5 py-3 bg-[#F9F9F8] border-t border-[#EBEBEB] flex flex-col gap-2 shrink-0 select-none" id="sidebar-storage-section">
        <div className="flex items-center justify-between text-[9.5px] font-bold text-gray-400 uppercase tracking-widest" id="storage-status-header">
          <span>Storage State</span>
          <button
            type="button"
            onClick={onRequestHarden}
            id="storage-durability-pill"
            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none transition-all cursor-pointer hover:scale-105 active:scale-95 duration-150 focus:outline-none ${
              isPersisted
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/40'
                : 'bg-amber-50 text-amber-100/10 border border-amber-400 bg-amber-500 text-amber-950 animate-pulse'
            }`}
            title={isPersisted ? "Hardened: Browser guarantees protection from automatic storage resets or disk clearing." : "Temporary: Browser cookies/private browsing settings may wipe local storage on exit. Click here to secure and lock storage!"}
          >
            {isPersisted ? 'Hardened ✓' : 'Temporary ⚠'}
          </button>
        </div>
        {!isPersisted && (
          <button
            type="button"
            onClick={onRequestHarden}
            id="secure-storage-action-link"
            className="text-[10px] text-left text-amber-700 hover:text-amber-800 font-bold underline transition-all focus:outline-none cursor-pointer mt-0.5"
            title="Lock database storage from browser cleanup"
          >
            → Click to lock & harden storage
          </button>
        )}
        <div className="grid grid-cols-2 gap-1.5 text-center" id="storage-actions-grid">
          <button
            type="button"
            id="export-backup-btn"
            onClick={onExportBackup}
            title="Download a complete JSON file with all your collections and tabs"
            className="py-1 px-2 border border-gray-200/80 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 rounded-md text-[11px] font-semibold tracking-tight transition-all cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] flex items-center justify-center gap-1 focus:outline-none"
          >
            Export
          </button>
          <label
            id="import-backup-label"
            title="Import collections and bookmarks from a saved JSON backup file"
            className="py-1 px-2 border border-gray-200/80 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 rounded-md text-[11px] font-semibold tracking-tight transition-all cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] flex items-center justify-center gap-1 focus:outline-none"
          >
            Import
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
