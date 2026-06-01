/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Collection, Tab, StatusType } from './types';
import { Sidebar } from './components/Sidebar';
import { MainArea } from './components/MainArea';
import { CollectionModal } from './components/CollectionModal';
import { ConfirmationModal } from './components/ConfirmationModal';

// Local storage key helper
const STORAGE_KEY = 'foldr_archiver_collections_v1';

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'All' | StatusType>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [colToDeleteId, setColToDeleteId] = useState<string | null>(null);

  // Helper to show custom micro-toasts instead of window.alert
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Request storage persistence from browser (guarantees protection from auto-eviction/cleanup on reboot)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then((persisted) => {
        if (persisted) {
          setIsPersisted(true);
        } else {
          navigator.storage.persist().then((granted) => {
            setIsPersisted(granted);
          });
        }
      });
    }
  }, []);

  // Synchronous State Setter + localStorage persistence: COMPLETELY bypasses React 18/19 remount race-conditions
  const updateCollections = (updater: Collection[] | ((prev: Collection[]) => Collection[])) => {
    setCollections((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save collections to localStorage", e);
      }
      return next;
    });
  };

  // 1. Initial Load from localStorage
  useEffect(() => {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (persisted) {
        const parsed = JSON.parse(persisted) as Collection[];
        if (Array.isArray(parsed)) {
          setCollections(parsed);
          if (parsed.length > 0) {
            setActiveCollectionId(parsed[0].id);
          }
          setIsLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse persisted collections", e);
    }

    // Fallback/Default for new users: Start with a clean, empty slate
    setCollections([]);
    setActiveCollectionId(null);
    setIsLoaded(true);
  }, []);

  // Export and Import JSON Backups for absolute physical database portability
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collections, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `foldr_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Backup downloaded successfully!", "success");
    } catch (e) {
      showToast("Export failed: " + (e as Error).message, "error");
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as Collection[];
        if (Array.isArray(parsed)) {
          updateCollections(parsed);
          if (parsed.length > 0) {
            setActiveCollectionId(parsed[0].id);
          } else {
            setActiveCollectionId(null);
          }
          showToast(`Imported ${parsed.length} collections!`, "success");
        } else {
          showToast("Invalid file format. Must be a JSON array of collections.", "error");
        }
      } catch (err) {
        showToast("Parser error: invalid JSON formatting.", "error");
      }
    };
    fileReader.readAsText(file);
    // Reset file input value to allow importing the same file again
    e.target.value = '';
  };

  // Helper: Cycle collection statuses Active -> Parked -> Done -> Active
  const cycleStatus = (status: StatusType): StatusType => {
    if (status === 'Active') return 'Parked';
    if (status === 'Parked') return 'Done';
    return 'Active';
  };

  const handleCycleCollectionStatus = (collectionId: string) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            status: cycleStatus(col.status),
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
  };

  // Helper: Get Active Collection
  const activeCollection = collections.find((col) => col.id === activeCollectionId) || null;

  // Edit action
  const handleEditCollectionClick = (collectionId: string) => {
    const col = collections.find((c) => c.id === collectionId) || null;
    setEditingCollection(col);
    setIsModalOpen(true);
  };

  // Add tab URLs parsing utility inline
  const parseUrl = (input: string): { url: string; title: string; favicon: string } => {
    let cleaned = input.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    
    let title = '';
    let favicon = '';
    try {
      const urlObj = new URL(cleaned);
      let host = urlObj.hostname;
      if (host.startsWith('www.')) host = host.substring(4);
      
      const parts = host.split('.');
      let name = parts[0];
      if (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      
      let path = urlObj.pathname;
      if (path && path !== '/') {
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
          const lastSeg = segments[segments.length - 1];
          if (lastSeg) {
            const cleanSeg = lastSeg.replace(/[-_]/g, ' ');
            name += ` - ${cleanSeg.charAt(0).toUpperCase() + cleanSeg.slice(1)}`;
          }
        }
      }
      
      title = name || host;
      favicon = `https://www.google.com/s2/favicons?domain=${urlObj.protocol}//${urlObj.hostname}&sz=32`;
    } catch (e) {
      title = input;
      favicon = `https://www.google.com/s2/favicons?domain=https://${input}&sz=32`;
    }
    
    return { url: cleaned, title, favicon };
  };

  const handleAddTabs = (collectionId: string, urlsStr: string) => {
    const lines = urlsStr.split('\n').map((l) => l.trim()).filter(Boolean);
    const newTabs: Tab[] = lines.map((line, index) => {
      const parsed = parseUrl(line);
      return {
        id: `tab-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        collectionId,
        url: parsed.url,
        title: parsed.title,
        favicon: parsed.favicon,
        addedAt: new Date().toISOString(),
      };
    });

    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            tabs: [...col.tabs, ...newTabs],
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
    showToast(`Added ${newTabs.length} tab(s) successfully!`, "success");
  };

  const handleDeleteTab = (collectionId: string, tabId: string) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            tabs: col.tabs.filter((t) => t.id !== tabId),
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
  };

  const handleDeleteMultipleTabs = (collectionId: string, tabIds: string[]) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            tabs: col.tabs.filter((t) => !tabIds.includes(t.id)),
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
    showToast(`Removed selected tabs.`, "info");
  };

  // Reorder tabs within a collection (persists in localStorage via updateCollections)
  const handleReorderTabs = (
    collectionId: string,
    sourceTabId: string,
    targetTabId: string,
    position: 'before' | 'after'
  ) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          const indexSource = col.tabs.findIndex((t) => t.id === sourceTabId);
          const indexTarget = col.tabs.findIndex((t) => t.id === targetTabId);
          if (indexSource === -1 || indexTarget === -1) return col;

          const remainingTabs = [...col.tabs];
          const [draggedTab] = remainingTabs.splice(indexSource, 1);
          
          const nextTargetIndex = remainingTabs.findIndex((t) => t.id === targetTabId);
          const insertIndex = position === 'before' ? nextTargetIndex : nextTargetIndex + 1;
          
          remainingTabs.splice(insertIndex, 0, draggedTab);

          return {
            ...col,
            tabs: remainingTabs,
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
  };

  // Drag and drop collections in sidebar to reorder
  const handleReorderCollections = (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => {
    updateCollections((prev) => {
      const indexSource = prev.findIndex((c) => c.id === sourceId);
      const indexTarget = prev.findIndex((c) => c.id === targetId);
      if (indexSource === -1 || indexTarget === -1) return prev;

      const remainingCols = [...prev];
      const [draggedCol] = remainingCols.splice(indexSource, 1);

      const nextTargetIndex = remainingCols.findIndex((c) => c.id === targetId);
      const insertIndex = position === 'before' ? nextTargetIndex : nextTargetIndex + 1;

      remainingCols.splice(insertIndex, 0, draggedCol);
      return remainingCols;
    });
  };

  const handleToggleStarCollection = (collectionId: string) => {
    updateCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId ? { ...col, starred: !col.starred } : col
      )
    );
  };

  const handleDeleteCollection = (collectionId: string) => {
    setColToDeleteId(collectionId);
  };

  const handleConfirmDeleteCollection = () => {
    if (!colToDeleteId) return;
    updateCollections((prev) => {
      const remaining = prev.filter((col) => col.id !== colToDeleteId);
      // Switch active collection
      if (activeCollectionId === colToDeleteId) {
        setActiveCollectionId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
    setColToDeleteId(null);
    showToast("Collection deleted.", "info");
  };

  // Handle modal submit
  const handleSaveCollectionModal = (data: {
    name: string;
    icon: string;
    iconColor: string;
    status: StatusType;
    starred: boolean;
  }) => {
    if (editingCollection) {
      // Edit Mode
      updateCollections((prev) =>
        prev.map((col) => {
          if (col.id === editingCollection.id) {
            return {
              ...col,
              ...data,
              lastOpenedAt: new Date().toISOString(),
            };
          }
          return col;
        })
      );
      showToast("Collection changes saved!", "success");
    } else {
      // Create Mode
      const newColId = `col-${Date.now()}`;
      const newCol: Collection = {
        id: newColId,
        name: data.name,
        icon: data.icon,
        iconColor: data.iconColor,
        status: data.status,
        starred: data.starred,
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        tabs: [],
      };
      
      updateCollections((prev) => [...prev, newCol]);
      setActiveCollectionId(newColId);
      showToast("Created new collection!", "success");
    }

    setIsModalOpen(false);
    setEditingCollection(null);
  };

  return (
    <main className="w-full h-screen overflow-hidden flex relative" id="main-container">
      {/* 210px Left Sidebar */}
      <Sidebar
        collections={collections}
        activeId={activeCollectionId}
        setActiveId={setActiveCollectionId}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onAddCollection={() => {
          setEditingCollection(null);
          setIsModalOpen(true);
        }}
        onReorderCollections={handleReorderCollections}
        onToggleStarCollection={handleToggleStarCollection}
        isPersisted={isPersisted}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Flexible Right Main Content Viewport */}
      <MainArea
        collection={activeCollection}
        allCollections={collections}
        onCycleStatus={handleCycleCollectionStatus}
        onEditCollection={handleEditCollectionClick}
        onDeleteCollection={handleDeleteCollection}
        onAddTabs={handleAddTabs}
        onDeleteTab={handleDeleteTab}
        onDeleteMultipleTabs={handleDeleteMultipleTabs}
        onReorderTabs={handleReorderTabs}
        onSelectCollection={setActiveCollectionId}
      />

      {/* Modular Settings & Creation Modal */}
      <CollectionModal
        isOpen={isModalOpen}
        collection={editingCollection}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCollection(null);
        }}
        onSave={handleSaveCollectionModal}
      />

      {/* Reusable confirmation modal for list deletions */}
      <ConfirmationModal
        isOpen={!!colToDeleteId}
        title="Delete Collection?"
        severity="danger"
        message={
          <span>
            Are you sure you want to delete{' '}
            <strong className="text-gray-900 font-extrabold">
              &ldquo;{collections.find((c) => c.id === colToDeleteId)?.name || 'this collection'}&rdquo;
            </strong>{' '}
            and all of its{' '}
            <strong className="text-gray-900 font-extrabold">
              {collections.find((c) => c.id === colToDeleteId)?.tabs.length || 0}
            </strong>{' '}
            saved bookmark(s)? This action cannot be undone.
          </span>
        }
        confirmText="Delete Collection"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteCollection}
        onClose={() => setColToDeleteId(null)}
      />

      {/* Dynamic Visual Toast Notification (React-Motion Powered) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-xl border text-xs font-semibold bg-white text-gray-850 ${
              toast.type === 'success' ? 'border-green-100 shadow-green-100/5' :
              toast.type === 'error' ? 'border-red-100 shadow-red-100/5' : 'border-gray-200 shadow-gray-150/5'
            }`}
          >
            {toast.type === 'success' && (
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
            {toast.type === 'error' && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
            {toast.type === 'info' && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
