/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Star, Folder } from 'lucide-react';
import { Collection, StatusType } from '../types';
import { LucideIcon } from './LucideIcon';

interface SidebarProps {
  collections: Collection[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  selectedStatus: 'All' | StatusType;
  setSelectedStatus: (status: 'All' | StatusType) => void;
  onAddCollection: () => void;
  onReorderCollections: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onToggleStarCollection: (id: string) => void;
  isPersisted: boolean;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestHarden: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  activeId,
  setActiveId,
  selectedStatus,
  setSelectedStatus,
  onAddCollection,
  onReorderCollections,
  onToggleStarCollection,
  isPersisted,
  onExportBackup,
  onImportBackup,
  onRequestHarden,
}) => {
  // Drag states local to sidebar item
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  // Filter collections by status
  const filterByStatus = (cols: Collection[]) => {
    if (selectedStatus === 'All') return cols;
    return cols.filter((c) => c.status === selectedStatus);
  };

  // Get active subset
  const filtered = filterByStatus(collections);

  // Group into Starred and Non-Starred (while respecting status filter)
  const starredCollections = filtered.filter((c) => c.starred);
  const regularCollections = filtered.filter((c) => !c.starred);

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Visual drag preview
    const target = e.currentTarget;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedId(null);
    setDropIndicator(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (draggedId === id) return;
    e.preventDefault();
    
    // Determine if cursor is upper half or lower half of element height
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const position: 'before' | 'after' = relativeY < rect.height / 2 ? 'before' : 'after';

    setDropIndicator({ id, position });
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId && dropIndicator) {
      onReorderCollections(sourceId, targetId, dropIndicator.position);
    }
    setDropIndicator(null);
  };

  // Sidebar Row Renderer
  const renderRow = (col: Collection) => {
    const isActive = activeId === col.id;
    const isOver = dropIndicator?.id === col.id;
    const isDragged = draggedId === col.id;

    return (
      <div
        key={col.id}
        id={`sidebar-row-${col.id}`}
        draggable
        onDragStart={(e) => handleDragStart(e, col.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, col.id)}
        onClick={() => setActiveId(col.id)}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all select-none ${
          isActive
            ? 'bg-gray-200/60 font-semibold text-gray-900'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${isDragged ? 'opacity-40' : ''}`}
      >
        {/* Top Drop Indicator Line */}
        {isOver && dropIndicator?.position === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" id="drop-indicator-top" />
        )}

        {/* Content of the Item */}
        <div className="flex items-center gap-2 overflow-hidden flex-1" id="row-media-title-wrapper">
          <span
            id="row-icon-span"
            style={{ color: col.iconColor }}
            className="flex items-center justify-center shrink-0 w-4 h-4"
          >
            <LucideIcon name={col.icon} size={14} />
          </span>
          <span className="truncate text-[12.5px] tracking-tight leading-normal py-0.5" id="row-collection-name">
            {col.name}
          </span>
        </div>

        {/* Status Dot, Star & Badge Counts */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1.5" id="row-meta-indicators">
          <span className="text-[11px] text-gray-400 group-hover:text-gray-500 font-medium" id="row-tab-counter">
            {col.tabs.length}
          </span>
          <span
            id="row-status-dot"
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: getStatusColor(col.status) }}
            title={col.status}
          />
          <button
            type="button"
            id={`toggle-star-btn-${col.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStarCollection(col.id);
            }}
            className={`p-0.5 rounded-md transition-all hover:scale-110 cursor-pointer focus:outline-none flex items-center justify-center ${
              col.starred
                ? 'text-amber-400 hover:text-amber-500'
                : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
            title={col.starred ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={11.5} className={col.starred ? 'fill-amber-400' : ''} />
          </button>
        </div>

        {/* Bottom Drop Indicator Line */}
        {isOver && dropIndicator?.position === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 animate-pulse" id="drop-indicator-bottom" />
        )}
      </div>
    );
  };

  return (
    <div
      id="sidebar-container"
      className="w-[210px] bg-[#F7F7F5] h-screen flex flex-col shrink-0 border-r border-[#E5E5E0] text-[13px] overflow-hidden"
    >
      {/* Brand Header */}
      <div className="h-13 px-4 flex items-center gap-2 border-b border-[#EBEBEB] shrink-0" id="sidebar-brand-header">
        {/* Custom Mini Folder Stack Logomark */}
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
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4" id="sidebar-lists-area">
        {/* Starred Section */}
        <div className="space-y-1" id="starred-collections-section">
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Star size={10} className="fill-gray-400 text-gray-400" />
            <span>Starred</span>
          </div>
          <div className="space-y-0.5" id="starred-rows-list">
            {starredCollections.map(renderRow)}
            {starredCollections.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-gray-400 italic" id="no-starred-placeholder">
                No starred collections
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-[#EBEBEB]" id="sidebar-section-divider" />

        {/* Regular Collections Section */}
        <div className="space-y-1" id="general-collections-section">
          <span className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Collections
          </span>
          <div className="space-y-0.5" id="regular-rows-list">
            {regularCollections.map(renderRow)}
            {regularCollections.length === 0 && (
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
