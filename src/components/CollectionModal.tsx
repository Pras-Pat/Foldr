/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, X, Check, Star } from 'lucide-react';
import { Collection, StatusType } from '../types';
import { LucideIcon, ALL_ICONS_LIST } from './LucideIcon';

interface CollectionModalProps {
  isOpen: boolean;
  collection: Collection | null; // null for Create Mode
  onClose: () => void;
  onSave: (data: {
    name: string;
    icon: string;
    iconColor: string;
    status: StatusType;
    starred: boolean;
  }) => void;
}

// 24 vivid, stylish color swatches
const COLOR_SWATCHES = [
  '#F97316', '#EF4444', '#EC4899', '#D946EF', '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9',
  '#06B6D4', '#14B8A6', '#10B981', '#22C55E', '#84CC16', '#EAB308', '#D97706', '#EA580C',
  '#991B1B', '#1E3A8A', '#3730A3', '#5B5BD6', '#065F46', '#111827', '#4B5563', '#9CA3AF'
];

// Helper to convert hex to RGB
const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 91, g: 91, b: 214 }; // Default fallback
};

// Helper to convert RGB to hex
const rgbToHex = (r: number, g: number, b: number) => {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (c: number) => {
    const hex = clamp(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  collection,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<StatusType>('Active');
  const [starred, setStarred] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [iconColor, setIconColor] = useState('#5B5BD6');
  
  // Icon search
  const [iconSearch, setIconSearch] = useState('');

  // RGB states
  const [rgb, setRgb] = useState({ r: 91, g: 91, b: 148 });

  // Load collection details when modal opens / matches collection
  useEffect(() => {
    if (isOpen) {
      if (collection) {
        setName(collection.name);
        setStatus(collection.status);
        setStarred(collection.starred);
        setSelectedIcon(collection.icon);
        const color = collection.iconColor || '#5B5BD6';
        setIconColor(color);
        setRgb(hexToRgb(color));
      } else {
        // Reset to default new states
        setName('');
        setStatus('Active');
        setStarred(false);
        setSelectedIcon('bookmark');
        const defaultColor = '#5B5BD6';
        setIconColor(defaultColor);
        setRgb(hexToRgb(defaultColor));
      }
      setIconSearch('');
    }
  }, [isOpen, collection]);

  // Sync color adjustments
  const handleColorSwatchClick = (hex: string) => {
    setIconColor(hex);
    setRgb(hexToRgb(hex));
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const nextRgb = { ...rgb, [channel]: value };
    setRgb(nextRgb);
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setIconColor(hex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setIconColor(val);
    
    // If it looks like a complete valid hex color, sync RGB
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setRgb(hexToRgb(val));
    }
  };

  if (!isOpen) return null;

  // Filtered icons lists
  const filteredIcons = ALL_ICONS_LIST.filter(icon => {
    const query = iconSearch.toLowerCase();
    return icon.toLowerCase().includes(query);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Clean and validate hex color format
    let finalColor = iconColor.trim();
    if (!finalColor.startsWith('#')) {
      finalColor = '#' + finalColor;
    }
    if (!/^#[0-9A-F]{6}$/i.test(finalColor)) {
      finalColor = '#5B5BD6'; // Fallback
    }

    onSave({
      name: name.trim(),
      icon: selectedIcon,
      iconColor: finalColor,
      status,
      starred,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in">
      <div 
        id="collection-modal-container"
        className="relative w-[360px] max-h-[92vh] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border border-[#EBEBEB] text-[13px] leading-relaxed"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#EBEBEB]" id="modal-header">
          <h2 className="font-bold text-gray-900 text-[14px]">
            {collection ? 'Edit Collection' : 'Create New Collection'}
          </h2>
          <button 
            id="close-modal-btn"
            onClick={onClose} 
            type="button" 
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" id="modal-form-body">
          {/* Collection Name Input */}
          <div className="space-y-1" id="name-field-group">
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Collection Name
            </label>
            <input
              id="collection-name-input"
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Development Tools"
              className="w-full px-3 py-1.5 bg-gray-50 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white text-[13px] transition-all"
            />
          </div>

          {/* Status & Star Row */}
          <div className="grid grid-cols-2 gap-3" id="status-starred-row">
            {/* Status Type Selector */}
            <div className="space-y-1" id="status-field-group">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Status
              </label>
              <div className="flex bg-gray-50 border border-[#EBEBEB] p-0.5 rounded-lg text-xs" id="status-selector-pills">
                {(['Active', 'Parked', 'Done'] as StatusType[]).map((st) => (
                  <button
                    key={st}
                    id={`status-pill-${st.toLowerCase()}`}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                      status === st
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Starred Checkbox Toggle */}
            <div className="space-y-1" id="starred-field-group">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Bookmark Filter
              </label>
              <button
                id="modal-starred-toggle"
                type="button"
                onClick={() => setStarred(!starred)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 border rounded-lg font-medium transition-all ${
                  starred
                    ? 'border-yellow-200 bg-yellow-50/50 text-yellow-700'
                    : 'border-[#EBEBEB] bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <Star size={13} className={starred ? 'fill-yellow-500 text-yellow-600' : ''} />
                <span>Starred</span>
              </button>
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-1.5" id="icon-picker-group">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Select Icon
              </label>
              <span className="text-[10px] font-mono text-gray-400 capitalize" id="selected-icon-label">
                &quot;{selectedIcon}&quot;
              </span>
            </div>
            
            {/* Search Input for Icons */}
            <div className="relative" id="icon-search-box">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                id="icon-search-input"
                type="text"
                placeholder="Search 120 icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-gray-50 border border-[#EBEBEB] rounded-lg focus:outline-none text-[11.5px]"
              />
            </div>

            {/* Icons Grid Container */}
            <div 
              id="icons-grid-scroll-area"
              className="grid grid-cols-8 gap-1.5 p-2 bg-gray-50 border border-[#EBEBEB] rounded-xl max-h-[148px] overflow-y-auto"
            >
              {filteredIcons.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    id={`icon-tile-${iconName}`}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    title={iconName}
                    style={{
                      borderColor: isSelected ? iconColor : '',
                      backgroundColor: isSelected ? `${iconColor}15` : '',
                      color: isSelected ? iconColor : '',
                    }}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 border transition-all ${
                      isSelected
                        ? 'bg-white font-semibold border-[1.5px]'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    <LucideIcon name={iconName} size={15} />
                  </button>
                );
              })}
              {filteredIcons.length === 0 && (
                <div className="col-span-8 text-center text-gray-400 py-6" id="no-icons-found">
                  No matching icons
                </div>
              )}
            </div>
          </div>

          {/* Color Picker Swatches and Inputs */}
          <div className="space-y-2" id="color-picker-group">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Theme Color
              </label>
              <div className="flex items-center gap-1.5 font-mono" id="hex-preview-wrapper">
                <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: iconColor }} />
                <input
                  id="hex-color-input"
                  type="text"
                  value={iconColor}
                  onChange={handleHexInputChange}
                  placeholder="#000000"
                  className="w-18 px-1 text-center bg-gray-50 border border-[#EBEBEB] rounded text-[11px] focus:outline-none"
                />
              </div>
            </div>

            {/* Swatches Grid */}
            <div className="grid grid-cols-8 gap-2" id="color-swatches-grid">
              {COLOR_SWATCHES.map((hex) => {
                const isActive = iconColor.toUpperCase() === hex;
                return (
                  <button
                    key={hex}
                    id={`color-swatch-${hex.replace('#', '')}`}
                    type="button"
                    onClick={() => handleColorSwatchClick(hex)}
                    style={{ backgroundColor: hex }}
                    className="aspect-square rounded-full transition-all hover:scale-110 flex items-center justify-center text-white relative shadow-sm border border-black/5"
                  >
                    {isActive && <Check size={10} className="stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* RGB Sliders */}
            <div className="space-y-1.5 p-2 bg-gray-50 border border-[#EBEBEB] rounded-xl text-[11px]" id="rgb-sliders-container">
              {/* R Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold text-red-600 text-center font-mono">R</span>
                <input
                  id="rgb-r-slider"
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <span className="w-7 text-right font-mono text-gray-500">{rgb.r}</span>
              </div>
              
              {/* G Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold text-green-600 text-center font-mono">G</span>
                <input
                  id="rgb-g-slider"
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <span className="w-7 text-right font-mono text-gray-500">{rgb.g}</span>
              </div>

              {/* B Slider */}
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold text-indigo-600 text-center font-mono">B</span>
                <input
                  id="rgb-b-slider"
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="w-7 text-right font-mono text-gray-500">{rgb.b}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EBEBEB] bg-gray-50/50" id="modal-actions-footer">
          <button
            id="cancel-modal-btn"
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 font-medium border border-[#EBEBEB] rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="save-modal-btn"
            type="submit"
            disabled={!name.trim()}
            onClick={handleSubmit}
            className="px-3.5 py-1.5 font-bold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {collection ? 'Save Changes' : 'Create Collection'}
          </button>
        </div>
      </div>
    </div>
  );
};
