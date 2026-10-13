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
import { getSmartFallbackTitle, fetchUrlMetadata, normalizeUrl, getDomainFavicon } from './utils/urlMetadata';

// Local storage key helpers
const STORAGE_KEY = 'foldr_archiver_collections_v1';
const THEME_STORAGE_KEY = 'foldr_theme_mode_v1';

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'All' | StatusType>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  // Apply theme class and data-theme attribute to documentElement whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore localstorage errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
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
          // Normalize and repair any existing tabs with missing or broken favicons (e.g. YouTube or renamed docs)
          const repaired = parsed.map((col) => ({
            ...col,
            tabs: (col.tabs || []).map((t) => {
              const url = t.url || '';
              const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
              const isGoogleDoc = url.includes('docs.google.com');
              const isCraft = url.includes('craft.do') || url.includes('craft.me');
              
              // If favicon is missing, undefined, or generic google s2 for docs/youtube
              if (
                !t.favicon ||
                t.favicon.includes('undefined') ||
                (isYouTube && (t.favicon.includes('.ico') || t.favicon.includes('f17ec1e9'))) ||
                (isGoogleDoc && t.favicon.includes('google.com/s2/favicons')) ||
                (isCraft && (!t.favicon || t.favicon.includes('google.com/s2/favicons')))
              ) {
                return {
                  ...t,
                  favicon: getDomainFavicon(url),
                };
              }
              return t;
            }),
          }));
          setCollections(repaired);
          if (repaired.length > 0) {
            setActiveCollectionId(repaired[0].id);
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

  const requestHardenedStorage = async () => {
    if (typeof window === 'undefined' || !navigator.storage) {
      showToast("Storage API is not supported in this browser.", "error");
      return;
    }
    
    try {
      const alreadyPersisted = await navigator.storage.persisted();
      if (alreadyPersisted) {
        setIsPersisted(true);
        showToast("Storage state is already fully Hardened!", "success");
        return;
      }

      // Try initial query
      const granted = await navigator.storage.persist();
      if (granted) {
        setIsPersisted(true);
        showToast("Storage state upgraded to Hardened!", "success");
        return;
      }

      // If denied, tell them about browser rules (such as notification auto-grant or bookmark rules)
      if ('Notification' in window) {
        showToast("Opening prompt: grant permission to auto-enable secure storage.", "info");
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const forceGranted = await navigator.storage.persist();
          setIsPersisted(forceGranted);
          if (forceGranted) {
            showToast("Success! Storage state upgraded and Hardened.", "success");
          } else {
            showToast("Permission accepted! Please bookmark this tab to lock it.", "info");
          }
        } else {
          showToast("Permission declined. To harden, please bookmark this tab manually.", "info");
        }
      } else {
        showToast("To complete hardening, please bookmark this tab in your browser.", "info");
      }
    } catch (e) {
      console.error(e);
      showToast("Could not request hardening automatically.", "error");
    }
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

  // Add tabs with instant smart fallback titles and background rich title auto-fetching
  const handleAddTabs = (collectionId: string, urlsStr: string) => {
    const lines = urlsStr.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newTabs: Tab[] = lines.map((line, index) => {
      const cleanUrl = normalizeUrl(line);
      const fallbackTitle = getSmartFallbackTitle(cleanUrl);
      let host = '';
      try {
        host = new URL(cleanUrl).hostname;
      } catch {
        host = cleanUrl;
      }
      return {
        id: `tab-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        collectionId,
        url: cleanUrl,
        title: fallbackTitle,
        favicon: getDomainFavicon(cleanUrl),
        addedAt: new Date().toISOString(),
        isLoadingTitle: true,
      };
    });

    // 1. Instantly append tabs to collection
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
    showToast(`Added ${newTabs.length} bookmark(s)! Fetching titles...`, "info");

    // 2. Fetch rich web titles in the background concurrently
    newTabs.forEach((tab) => {
      fetchUrlMetadata(tab.url)
        .then((meta) => {
          updateCollections((prev) =>
            prev.map((col) => {
              if (col.id === collectionId) {
                return {
                  ...col,
                  tabs: col.tabs.map((t) => {
                    if (t.id === tab.id) {
                      return {
                        ...t,
                        title: t.isCustomTitle ? t.title : (meta.title || t.title),
                        favicon: meta.favicon || t.favicon,
                        isLoadingTitle: false,
                      };
                    }
                    return t;
                  }),
                };
              }
              return col;
            })
          );
        })
        .catch(() => {
          updateCollections((prev) =>
            prev.map((col) => {
              if (col.id === collectionId) {
                return {
                  ...col,
                  tabs: col.tabs.map((t) =>
                    t.id === tab.id ? { ...t, isLoadingTitle: false } : t
                  ),
                };
              }
              return col;
            })
          );
        });
    });
  };

  // Rename or edit an existing tab bookmark
  const handleUpdateTab = (
    collectionId: string,
    tabId: string,
    updates: { title?: string; url?: string; favicon?: string }
  ) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            tabs: col.tabs.map((t) => {
              if (t.id === tabId) {
                return {
                  ...t,
                  ...updates,
                  isCustomTitle: updates.title !== undefined ? true : t.isCustomTitle,
                };
              }
              return t;
            }),
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
    showToast("Bookmark updated successfully!", "success");
  };

  // Refresh or auto-fetch title for a single tab
  const handleRefreshTabTitle = async (collectionId: string, tabId: string) => {
    const targetCol = collections.find((c) => c.id === collectionId);
    const targetTab = targetCol?.tabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    // Set loading indicator
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            tabs: col.tabs.map((t) => (t.id === tabId ? { ...t, isLoadingTitle: true } : t)),
          };
        }
        return col;
      })
    );

    try {
      const meta = await fetchUrlMetadata(targetTab.url);
      updateCollections((prev) =>
        prev.map((col) => {
          if (col.id === collectionId) {
            return {
              ...col,
              tabs: col.tabs.map((t) => {
                if (t.id === tabId) {
                  return {
                    ...t,
                    title: meta.title || t.title,
                    favicon: meta.favicon || t.favicon,
                    isLoadingTitle: false,
                    isCustomTitle: false,
                  };
                }
                return t;
              }),
            };
          }
          return col;
        })
      );
      showToast(`Updated title: "${meta.title}"`, "success");
    } catch {
      updateCollections((prev) =>
        prev.map((col) => {
          if (col.id === collectionId) {
            return {
              ...col,
              tabs: col.tabs.map((t) => (t.id === tabId ? { ...t, isLoadingTitle: false } : t)),
            };
          }
          return col;
        })
      );
      showToast("Could not retrieve web title.", "error");
    }
  };

  // Refresh titles for all tabs in a collection
  const handleRefreshAllTabTitles = async (collectionId: string) => {
    const targetCol = collections.find((c) => c.id === collectionId);
    if (!targetCol || targetCol.tabs.length === 0) return;

    showToast(`Fetching web titles for ${targetCol.tabs.length} bookmark(s)...`, "info");

    targetCol.tabs.forEach((tab) => {
      fetchUrlMetadata(tab.url).then((meta) => {
        updateCollections((prev) =>
          prev.map((col) => {
            if (col.id === collectionId) {
              return {
                ...col,
                tabs: col.tabs.map((t) => {
                  if (t.id === tab.id) {
                    return {
                      ...t,
                      title: meta.title || t.title,
                      favicon: meta.favicon || t.favicon,
                      isLoadingTitle: false,
                    };
                  }
                  return t;
                }),
              };
            }
            return col;
          })
        );
      });
    });
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

  // Update collection-specific notes
  const handleUpdateCollectionNotes = (collectionId: string, notes: string) => {
    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            notes,
            notesUpdatedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );
  };

  // Make a collection into a subcollection of targetParentId (or detach to root if targetParentId is null)
  const handleMoveCollectionToParent = (sourceId: string, targetParentId: string | null) => {
    if (sourceId === targetParentId) return;

    // Check if source has children - strictly 1 layer deep:
    const sourceHasChildren = collections.some((c) => c.parentId === sourceId);
    if (sourceHasChildren && targetParentId !== null) {
      showToast("Cannot nest a collection that already contains subcollections.", "error");
      return;
    }

    // Check if target is already a subcollection - cannot nest into a subcollection (1 layer deep)
    if (targetParentId !== null) {
      const targetCol = collections.find((c) => c.id === targetParentId);
      if (targetCol && targetCol.parentId) {
        showToast("Cannot nest inside a subcollection (strictly 1-layer deep).", "error");
        return;
      }
    }

    updateCollections((prev) =>
      prev.map((col) => {
        if (col.id === sourceId) {
          return {
            ...col,
            parentId: targetParentId,
            lastOpenedAt: new Date().toISOString(),
          };
        }
        return col;
      })
    );

    const sourceCol = collections.find((c) => c.id === sourceId);
    const parentCol = targetParentId ? collections.find((c) => c.id === targetParentId) : null;
    if (parentCol && sourceCol) {
      showToast(`Moved "${sourceCol.name}" into "${parentCol.name}" as a subcollection.`, "success");
    }
  };

  // Drag and drop collections in sidebar to reorder or promote subcollection to root
  const handleReorderCollections = (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => {
    updateCollections((prev) => {
      const sourceCol = prev.find((c) => c.id === sourceId);
      const targetCol = prev.find((c) => c.id === targetId);
      if (!sourceCol || !targetCol) return prev;

      // Determine next parentId:
      // If target is root (parentId is null/undefined), dragging before/after makes source into a root collection as well.
      // If target is a subcollection (parentId !== null), source becomes a subcollection under that same parent.
      let newParentId = targetCol.parentId ?? null;

      // Single-layer rule validation: if source has subcollections of its own, it cannot become a subcollection under any parent
      const sourceHasChildren = prev.some((c) => c.parentId === sourceId);
      if (sourceHasChildren && newParentId !== null) {
        newParentId = null;
      }

      const indexSource = prev.findIndex((c) => c.id === sourceId);
      const remainingCols = [...prev];
      const [draggedCol] = remainingCols.splice(indexSource, 1);

      const updatedDraggedCol = {
        ...draggedCol,
        parentId: newParentId,
        lastOpenedAt: new Date().toISOString(),
      };

      const nextTargetIndex = remainingCols.findIndex((c) => c.id === targetId);
      const insertIndex = position === 'before' ? nextTargetIndex : nextTargetIndex + 1;

      remainingCols.splice(insertIndex, 0, updatedDraggedCol);
      return remainingCols;
    });

    const sourceCol = collections.find((c) => c.id === sourceId);
    const targetCol = collections.find((c) => c.id === targetId);
    if (sourceCol && sourceCol.parentId && targetCol && !targetCol.parentId) {
      showToast(`Promoted "${sourceCol.name}" to top-level collection.`, "success");
    }
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
      // Delete target collection AND any of its subcollections (cascade delete)
      const remaining = prev.filter((col) => col.id !== colToDeleteId && col.parentId !== colToDeleteId);
      // Switch active collection
      if (
        activeCollectionId === colToDeleteId ||
        prev.find((c) => c.id === activeCollectionId)?.parentId === colToDeleteId
      ) {
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
    parentId?: string | null;
  }) => {
    if (editingCollection) {
      // Edit Mode
      updateCollections((prev) =>
        prev.map((col) => {
          if (col.id === editingCollection.id) {
            return {
              ...col,
              ...data,
              parentId: data.parentId ?? null,
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
        parentId: data.parentId ?? null,
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        tabs: [],
      };
      
      updateCollections((prev) => [...prev, newCol]);
      setActiveCollectionId(newColId);
      showToast(data.parentId ? "Created subcollection!" : "Created new collection!", "success");
    }

    setIsModalOpen(false);
    setEditingCollection(null);
    setDefaultParentId(null);
  };

  const handleAddSubcollection = (parentId: string) => {
    setEditingCollection(null);
    setDefaultParentId(parentId);
    setIsModalOpen(true);
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
          setDefaultParentId(null);
          setIsModalOpen(true);
        }}
        onAddSubcollection={handleAddSubcollection}
        onReorderCollections={handleReorderCollections}
        onMoveCollectionToParent={handleMoveCollectionToParent}
        onToggleStarCollection={handleToggleStarCollection}
        isPersisted={isPersisted}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onRequestHarden={requestHardenedStorage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Flexible Right Main Content Viewport */}
      <MainArea
        collection={activeCollection}
        allCollections={collections}
        onCycleStatus={handleCycleCollectionStatus}
        onEditCollection={handleEditCollectionClick}
        onDeleteCollection={handleDeleteCollection}
        onAddSubcollection={handleAddSubcollection}
        onAddTabs={handleAddTabs}
        onDeleteTab={handleDeleteTab}
        onDeleteMultipleTabs={handleDeleteMultipleTabs}
        onReorderTabs={handleReorderTabs}
        onUpdateNotes={handleUpdateCollectionNotes}
        onSelectCollection={setActiveCollectionId}
        onUpdateTab={handleUpdateTab}
        onRefreshTabTitle={handleRefreshTabTitle}
        onRefreshAllTabTitles={handleRefreshAllTabTitles}
      />

      {/* Modular Settings & Creation Modal */}
      <CollectionModal
        isOpen={isModalOpen}
        collection={editingCollection}
        allCollections={collections}
        defaultParentId={defaultParentId}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCollection(null);
          setDefaultParentId(null);
        }}
        onSave={handleSaveCollectionModal}
      />

      {/* Reusable confirmation modal for list deletions */}
      <ConfirmationModal
        isOpen={!!colToDeleteId}
        title="Delete Collection?"
        severity="danger"
        message={
          (() => {
            const targetCol = collections.find((c) => c.id === colToDeleteId);
            const subcollections = collections.filter((c) => c.parentId === colToDeleteId);
            const hasSubs = subcollections.length > 0;
            const totalSubTabs = subcollections.reduce((sum, s) => sum + s.tabs.length, 0);

            return (
              <span>
                Are you sure you want to delete{' '}
                <strong className="text-gray-900 font-extrabold">
                  &ldquo;{targetCol?.name || 'this collection'}&rdquo;
                </strong>
                {hasSubs ? (
                  <>
                    , along with its{' '}
                    <strong className="text-gray-900 font-extrabold">
                      {subcollections.length} subcollection(s)
                    </strong>{' '}
                    and{' '}
                    <strong className="text-gray-900 font-extrabold">
                      {(targetCol?.tabs.length || 0) + totalSubTabs} total bookmark(s)
                    </strong>
                    ?
                  </>
                ) : (
                  <>
                    {' '}and all of its{' '}
                    <strong className="text-gray-900 font-extrabold">
                      {targetCol?.tabs.length || 0}
                    </strong>{' '}
                    saved bookmark(s)?
                  </>
                )}{' '}
                This action cannot be undone.
              </span>
            );
          })()
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
