/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  StickyNote,
  Edit3, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  ListTodo, 
  List, 
  ListOrdered,
  Bold, 
  Italic,
  Strikethrough,
  Quote, 
  Code,
  Minus,
  Eye,
  EyeOff,
  ExternalLink,
  CheckSquare,
  Square
} from 'lucide-react';
import { Collection } from '../types';

interface CollectionNotesProps {
  collection: Collection;
  onUpdateNotes: (notes: string) => void;
  isOpenTriggered?: boolean;
  onClearTrigger?: () => void;
}

export const CollectionNotes: React.FC<CollectionNotesProps> = ({
  collection,
  onUpdateNotes,
  isOpenTriggered,
  onClearTrigger,
}) => {
  const currentNotes = collection.notes || '';
  const [noteText, setNoteText] = useState(currentNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [cursorTarget, setCursorTarget] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeLineRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when collection changes
  useEffect(() => {
    setNoteText(collection.notes || '');
    setIsEditing(false);
    setActiveLineIndex(null);
  }, [collection.id]);

  // When triggered from header (Notes button), ensure expanded and focus
  useEffect(() => {
    if (isOpenTriggered) {
      setIsCollapsed(false);
      setIsEditing(true);
      const lines = (collection.notes || '').split('\n');
      const targetIdx = Math.max(0, lines.length - 1);
      setActiveLineIndex(targetIdx);
      setCursorTarget(lines[targetIdx]?.length || 0);
      onClearTrigger?.();
    }
  }, [isOpenTriggered, onClearTrigger, collection.notes]);

  // Auto-resize active line textarea in Obsidian live preview mode
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.style.height = 'auto';
      activeLineRef.current.style.height = `${Math.max(22, activeLineRef.current.scrollHeight)}px`;
      if (cursorTarget !== null) {
        activeLineRef.current.focus();
        activeLineRef.current.setSelectionRange(cursorTarget, cursorTarget);
        setCursorTarget(null);
      }
    }
  }, [activeLineIndex, noteText, cursorTarget]);

  // Auto-resize source textarea in raw mode
  useEffect(() => {
    if (isEditing && !showLivePreview && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(100, textareaRef.current.scrollHeight)}px`;
    }
  }, [isEditing, showLivePreview, noteText]);

  // Handle source-mode textarea change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);
    onUpdateNotes(val);

    setJustSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setJustSaved(false);
    }, 1500);
  };

  // Keyboard controls in raw source-mode textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      setActiveLineIndex(null);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setActiveLineIndex(null);
    }
  };

  // Handle active line text change in Live Preview mode
  const handleLineChange = (lineIndex: number, val: string) => {
    const lines = noteText ? noteText.split('\n') : [''];
    if (val.includes('\n')) {
      const insertedLines = val.split('\n');
      lines.splice(lineIndex, 1, ...insertedLines);
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setActiveLineIndex(lineIndex + insertedLines.length - 1);
      setCursorTarget(insertedLines[insertedLines.length - 1].length);
    } else {
      lines[lineIndex] = val;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
    }

    setJustSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setJustSaved(false);
    }, 1500);
  };

  // Keyboard navigation & list auto-continuation for active line
  const handleLineKeyDown = (idx: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const lines = noteText ? noteText.split('\n') : [''];
    const start = e.currentTarget.selectionStart;
    const currentLine = lines[idx] || '';

    // Ctrl+Enter or Cmd+Enter: Finish editing that line / close edit mode
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      setActiveLineIndex(null);
      setIsEditing(false);
      return;
    }

    // Escape: Exit active line editing to formatted preview
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveLineIndex(null);
      return;
    }

    // Enter: Obsidian-style split line & continue lists
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const leftPart = currentLine.slice(0, start);
      const rightPart = currentLine.slice(start);

      // Check task checkbox: - [ ] or - [x]
      const taskMatch = currentLine.match(/^(\s*-\s*\[[ xX]\]\s*)/);
      // Check numbered list: 1. 
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);
      // Check bullet list: - or * or +
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)/);

      // If user presses enter on an empty checklist item, exit the checklist
      if (taskMatch && (currentLine.trim() === '- [ ]' || currentLine.trim() === '- [x]')) {
        lines[idx] = '';
        const newText = lines.join('\n');
        setNoteText(newText);
        onUpdateNotes(newText);
        setCursorTarget(0);
        return;
      }

      // If user presses enter on an empty numbered item, exit the list
      if (numMatch && currentLine.trim().match(/^\d+\.$/)) {
        lines[idx] = '';
        const newText = lines.join('\n');
        setNoteText(newText);
        onUpdateNotes(newText);
        setCursorTarget(0);
        return;
      }

      // If user presses enter on an empty bullet, exit the list
      if (bulletMatch && (currentLine.trim() === '-' || currentLine.trim() === '*' || currentLine.trim() === '+')) {
        lines[idx] = '';
        const newText = lines.join('\n');
        setNoteText(newText);
        onUpdateNotes(newText);
        setCursorTarget(0);
        return;
      }

      let nextPrefix = '';
      if (taskMatch) {
        nextPrefix = '- [ ] ';
      } else if (numMatch) {
        const nextNum = parseInt(numMatch[2], 10) + 1;
        nextPrefix = `${numMatch[1]}${nextNum}. `;
      } else if (bulletMatch) {
        nextPrefix = bulletMatch[1];
      }

      lines[idx] = leftPart;
      lines.splice(idx + 1, 0, nextPrefix + rightPart.trimStart());
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setActiveLineIndex(idx + 1);
      setCursorTarget(nextPrefix.length);
      return;
    }

    // Backspace at position 0: Merge with previous line
    if (e.key === 'Backspace' && start === 0 && e.currentTarget.selectionEnd === 0) {
      if (idx > 0) {
        e.preventDefault();
        const prevLine = lines[idx - 1];
        lines[idx - 1] = prevLine + currentLine;
        lines.splice(idx, 1);
        const newText = lines.join('\n');
        setNoteText(newText);
        onUpdateNotes(newText);
        setActiveLineIndex(idx - 1);
        setCursorTarget(prevLine.length);
        return;
      }
    }

    // ArrowUp at top/beginning: Move to previous line
    if (e.key === 'ArrowUp') {
      if (idx > 0 && start === 0) {
        e.preventDefault();
        setActiveLineIndex(idx - 1);
        setCursorTarget(lines[idx - 1].length);
        return;
      }
    }

    // ArrowDown at bottom/end: Move to next line
    if (e.key === 'ArrowDown') {
      if (idx < lines.length - 1 && start === currentLine.length) {
        e.preventDefault();
        setActiveLineIndex(idx + 1);
        setCursorTarget(0);
        return;
      }
    }
  };

  // Insert or toggle heading level on current line (H1, H2, H3, H4)
  const insertHeading = (level: 1 | 2 | 3 | 4) => {
    const targetPrefix = `${'#'.repeat(level)} `;

    if (showLivePreview && isEditing && activeLineIndex !== null) {
      const lines = noteText ? noteText.split('\n') : [''];
      const currentLine = lines[activeLineIndex] || '';
      let newLine: string;
      const headingMatch = currentLine.match(/^(#{1,6})\s*/);
      if (headingMatch) {
        if (headingMatch[1].length === level) {
          newLine = currentLine.replace(/^(#{1,6})\s*/, '');
        } else {
          newLine = currentLine.replace(/^(#{1,6})\s*/, targetPrefix);
        }
      } else {
        const cleanLine = currentLine.replace(/^(\s*[-*+]\s*(\[[ xX]\]\s*)?|\s*\d+\.\s+)/, '');
        newLine = targetPrefix + cleanLine;
      }
      lines[activeLineIndex] = newLine;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setCursorTarget(newLine.length);
      return;
    }

    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const lineStart = noteText.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = noteText.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = noteText.length;

    const currentLine = noteText.substring(lineStart, lineEnd);
    let newLine: string;
    const headingMatch = currentLine.match(/^(#{1,6})\s*/);

    if (headingMatch) {
      if (headingMatch[1].length === level) {
        newLine = currentLine.replace(/^(#{1,6})\s*/, '');
      } else {
        newLine = currentLine.replace(/^(#{1,6})\s*/, targetPrefix);
      }
    } else {
      const cleanLine = currentLine.replace(/^(\s*[-*+]\s*(\[[ xX]\]\s*)?|\s*\d+\.\s+)/, '');
      newLine = targetPrefix + cleanLine;
    }

    const newText = noteText.substring(0, lineStart) + newLine + noteText.substring(lineEnd);
    setNoteText(newText);
    onUpdateNotes(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = lineStart + newLine.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Toggle list type on current line
  const insertList = (type: 'task' | 'bullet' | 'number') => {
    let targetPrefix = '- ';
    if (type === 'task') targetPrefix = '- [ ] ';
    if (type === 'number') targetPrefix = '1. ';

    if (showLivePreview && isEditing && activeLineIndex !== null) {
      const lines = noteText ? noteText.split('\n') : [''];
      const currentLine = lines[activeLineIndex] || '';
      let newLine: string;
      if (currentLine.startsWith(targetPrefix)) {
        newLine = currentLine.substring(targetPrefix.length);
      } else {
        const cleanLine = currentLine.replace(/^(#{1,6}\s+|-\s*\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/, '');
        newLine = targetPrefix + cleanLine;
      }
      lines[activeLineIndex] = newLine;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setCursorTarget(newLine.length);
      return;
    }

    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const lineStart = noteText.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = noteText.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = noteText.length;

    const currentLine = noteText.substring(lineStart, lineEnd);
    let newLine: string;
    if (currentLine.startsWith(targetPrefix)) {
      newLine = currentLine.substring(targetPrefix.length);
    } else {
      const cleanLine = currentLine.replace(/^(#{1,6}\s+|-\s*\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/, '');
      newLine = targetPrefix + cleanLine;
    }

    const newText = noteText.substring(0, lineStart) + newLine + noteText.substring(lineEnd);
    setNoteText(newText);
    onUpdateNotes(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = lineStart + newLine.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Insert inline formatting or wrap selected text
  const insertInline = (prefix: string, suffix: string, placeholder = 'text') => {
    if (showLivePreview && isEditing && activeLineIndex !== null && activeLineRef.current) {
      const textarea = activeLineRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lines = noteText ? noteText.split('\n') : [''];
      const currentLine = lines[activeLineIndex] || '';
      const selected = currentLine.substring(start, end);
      const content = selected || placeholder;
      const replacement = `${prefix}${content}${suffix}`;
      const newLine = currentLine.substring(0, start) + replacement + currentLine.substring(end);
      lines[activeLineIndex] = newLine;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setCursorTarget(selected ? start + prefix.length + selected.length : start + prefix.length + placeholder.length);
      return;
    }

    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = noteText.substring(start, end);

    const content = selected || placeholder;
    const replacement = `${prefix}${content}${suffix}`;
    const newText = noteText.substring(0, start) + replacement + noteText.substring(end);
    setNoteText(newText);
    onUpdateNotes(newText);

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      }
    }, 10);
  };

  // Insert raw snippet at cursor
  const insertSnippet = (snippet: string) => {
    if (showLivePreview && isEditing && activeLineIndex !== null && activeLineRef.current) {
      const textarea = activeLineRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lines = noteText ? noteText.split('\n') : [''];
      const currentLine = lines[activeLineIndex] || '';
      const newLine = currentLine.substring(0, start) + snippet + currentLine.substring(end);
      lines[activeLineIndex] = newLine;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
      setCursorTarget(start + snippet.length);
      return;
    }

    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = noteText.substring(0, start) + snippet + noteText.substring(end);
    setNoteText(newText);
    onUpdateNotes(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + snippet.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Copy note text
  const handleCopy = () => {
    if (!noteText.trim()) return;
    navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear note text
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all notes for this collection?')) {
      setNoteText('');
      onUpdateNotes('');
      setIsEditing(false);
    }
  };

  // Interactive Checklist Click handler: toggles [ ] <-> [x] directly from preview mode
  const handleToggleChecklistLine = (lineIndex: number) => {
    const lines = noteText.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    const checkedMatch = line.match(/^(\s*-\s*\[)([ xX])(\]\s*.*)$/);
    if (checkedMatch) {
      const isCurrentlyChecked = checkedMatch[2].toLowerCase() === 'x';
      const newMarker = isCurrentlyChecked ? ' ' : 'x';
      lines[lineIndex] = `${checkedMatch[1]}${newMarker}${checkedMatch[3]}`;
      const newText = lines.join('\n');
      setNoteText(newText);
      onUpdateNotes(newText);
    }
  };

  // Checklist Statistics calculation
  const checklistStats = React.useMemo(() => {
    if (!noteText) return { total: 0, completed: 0, percent: 0 };
    const lines = noteText.split('\n');
    let total = 0;
    let completed = 0;
    lines.forEach((line) => {
      const match = line.match(/^\s*-\s*\[([ xX])\]/);
      if (match) {
        total++;
        if (match[1].toLowerCase() === 'x') completed++;
      }
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [noteText]);

  // Format last edited time helper
  const formatUpdatedTime = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  // Helper to parse text with inline markdown (bold, italic, strikethrough, code, highlight, links)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    // Matches URLs, bold (** or __), strikethrough (~~), highlight (==), inline code (`), italic (* or _)
    const combinedRegex = /(https?:\/\/[^\s]+|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|==[^=]+==|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;

    const parts = text.split(combinedRegex);
    return parts.map((part, index) => {
      if (!part) return null;

      // URL link
      if (/^https?:\/\/[^\s]+$/.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5 break-all font-medium"
          >
            <span>{part.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <ExternalLink size={10} className="inline opacity-70 shrink-0" />
          </a>
        );
      }

      // Bold (**text** or __text__)
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        const inner = part.slice(2, -2);
        return (
          <strong key={index} className="font-extrabold text-gray-900">
            {renderInlineMarkdown(inner)}
          </strong>
        );
      }

      // Strikethrough (~~text~~)
      if (part.startsWith('~~') && part.endsWith('~~')) {
        const inner = part.slice(2, -2);
        return (
          <span key={index} className="line-through text-gray-400">
            {renderInlineMarkdown(inner)}
          </span>
        );
      }

      // Highlight (==text==)
      if (part.startsWith('==') && part.endsWith('==')) {
        const inner = part.slice(2, -2);
        return (
          <mark key={index} className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-medium">
            {renderInlineMarkdown(inner)}
          </mark>
        );
      }

      // Inline code (`text`)
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return (
          <code key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded font-mono text-[11px] border border-gray-200/60">
            {inner}
          </code>
        );
      }

      // Italic (*text* or _text_)
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        const inner = part.slice(1, -1);
        return (
          <em key={index} className="italic text-gray-800">
            {renderInlineMarkdown(inner)}
          </em>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Helper: check if the user is selecting text (so we don't interrupt multi-line selection on mouseup)
  const isTextSelected = () => {
    const sel = window.getSelection();
    return sel && sel.toString().length > 0;
  };

  // Render an individual markdown line in preview mode (clickable to edit)
  const renderFormattedLine = (line: string, idx: number) => {
    // Interactive Checkbox line: - [ ] or - [x] or * [ ]
    const checkMatch = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isChecked = checkMatch[2].toLowerCase() === 'x';
      const content = checkMatch[3];
      return (
        <div
          key={idx}
          className="flex items-start gap-2 group/task py-0.5 transition-colors cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(line.length);
          }}
        >
          <button
            type="button"
            className="mt-0.5 text-gray-400 group-hover/task:text-gray-700 transition-colors shrink-0 cursor-pointer"
            title={isChecked ? 'Mark incomplete' : 'Mark completed'}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleChecklistLine(idx);
            }}
          >
            {isChecked ? (
              <CheckSquare size={14} className="text-emerald-600 fill-emerald-50" />
            ) : (
              <Square size={14} className="text-gray-400 hover:text-gray-600" />
            )}
          </button>
          <span
            className={`flex-1 min-w-0 transition-all ${
              isChecked ? 'line-through text-gray-400 opacity-75' : 'text-gray-800'
            }`}
          >
            {renderInlineMarkdown(content)}
          </span>
        </div>
      );
    }

    // Headings H1, H2, H3, H4 (handles # Title, # Title #, ### Section, etc.)
    const headingMatch = line.match(/^(\s*)(#{1,4})\s*(.*?)(?:\s+#+)?$/);
    if (headingMatch && headingMatch[3].trim()) {
      const level = headingMatch[2].length;
      const content = headingMatch[3].trim();

      if (level === 1) {
        return (
          <h1
            key={idx}
            onClick={() => {
              if (isTextSelected()) return;
              setIsEditing(true);
              setActiveLineIndex(idx);
              setCursorTarget(line.length);
            }}
            className="font-black text-[18px] text-gray-900 pt-2 pb-0.5 tracking-tight border-b border-gray-100/90 leading-snug cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
          >
            {renderInlineMarkdown(content)}
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2
            key={idx}
            onClick={() => {
              if (isTextSelected()) return;
              setIsEditing(true);
              setActiveLineIndex(idx);
              setCursorTarget(line.length);
            }}
            className="font-extrabold text-[15px] text-gray-850 pt-1.5 pb-0.5 tracking-tight leading-snug cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
          >
            {renderInlineMarkdown(content)}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3
            key={idx}
            onClick={() => {
              if (isTextSelected()) return;
              setIsEditing(true);
              setActiveLineIndex(idx);
              setCursorTarget(line.length);
            }}
            className="font-bold text-[13.5px] text-gray-800 pt-1 pb-0.5 tracking-tight leading-normal cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
          >
            {renderInlineMarkdown(content)}
          </h3>
        );
      }
      if (level === 4) {
        return (
          <h4
            key={idx}
            onClick={() => {
              if (isTextSelected()) return;
              setIsEditing(true);
              setActiveLineIndex(idx);
              setCursorTarget(line.length);
            }}
            className="font-bold text-[12px] text-gray-700 pt-0.5 pb-0.5 leading-normal cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
          >
            {renderInlineMarkdown(content)}
          </h4>
        );
      }
    }

    // Numbered list item: 1. or 2.
    const numListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      const indent = numListMatch[1].length;
      const num = numListMatch[2];
      const content = numListMatch[3];
      return (
        <div
          key={idx}
          style={{ paddingLeft: `${indent * 8}px` }}
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(line.length);
          }}
          className="flex items-start gap-2 py-0.5 cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
        >
          <span className="font-mono font-bold text-[11.5px] text-gray-500 shrink-0 min-w-[18px] text-right mt-0.5 select-none">
            {num}.
          </span>
          <span className="flex-1 min-w-0 text-gray-800">{renderInlineMarkdown(content)}</span>
        </div>
      );
    }

    // Bullet list line: - or * or +
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const content = bulletMatch[2];
      return (
        <div
          key={idx}
          style={{ paddingLeft: `${indent * 8}px` }}
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(line.length);
          }}
          className="flex items-start gap-2 py-0.5 cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-2" />
          <span className="flex-1 min-w-0 text-gray-800">{renderInlineMarkdown(content)}</span>
        </div>
      );
    }

    // Blockquote line: >
    if (line.startsWith('> ')) {
      return (
        <div
          key={idx}
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(line.length);
          }}
          className="border-l-3 border-gray-300 pl-3 py-1 text-gray-600 italic bg-gray-50/70 rounded-r text-[12px] my-0.5 cursor-pointer hover:bg-gray-100/70"
        >
          {renderInlineMarkdown(line.slice(2))}
        </div>
      );
    }

    // Horizontal divider line: --- or *** or ___
    if (line.match(/^(\s*[-*_]{3,}\s*)$/)) {
      return (
        <div
          key={idx}
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(line.length);
          }}
          className="py-1 cursor-pointer hover:bg-gray-50/60 rounded"
        >
          <hr className="my-1 border-t border-gray-300" />
        </div>
      );
    }

    // Empty line / line break
    if (!line.trim()) {
      return (
        <div
          key={idx}
          onClick={() => {
            if (isTextSelected()) return;
            setIsEditing(true);
            setActiveLineIndex(idx);
            setCursorTarget(0);
          }}
          className="h-4 py-0.5 cursor-text hover:bg-gray-100/40 rounded transition-colors"
        />
      );
    }

    // Standard paragraph line
    return (
      <p
        key={idx}
        onClick={() => {
          if (isTextSelected()) return;
          setIsEditing(true);
          setActiveLineIndex(idx);
          setCursorTarget(line.length);
        }}
        className="text-gray-800 py-0.5 cursor-pointer hover:bg-gray-50/60 rounded px-1 -mx-1"
      >
        {renderInlineMarkdown(line)}
      </p>
    );
  };

  // Render full markdown preview for all lines
  const renderFormattedPreview = () => {
    if (!noteText.trim()) {
      return (
        <div className="text-gray-400 italic text-[12px] py-1">
          No notes added yet. Click to add notes...
        </div>
      );
    }
    const lines = noteText.split('\n');

    return (
      <div className="space-y-0.5 text-[12.5px] leading-relaxed text-gray-700 select-text">
        {lines.map((line, idx) => renderFormattedLine(line, idx))}
      </div>
    );
  };

  const hasNotes = !!noteText.trim();

  // If there are NO notes yet and not editing: Show clean, welcoming prompt bar
  if (!hasNotes && !isEditing) {
    return (
      <div
        id="collection-notes-empty-prompt"
        onClick={() => {
          setIsEditing(true);
          setActiveLineIndex(0);
          setCursorTarget(0);
        }}
        className="group relative flex items-center justify-between px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-100/70 border border-dashed border-gray-200 hover:border-gray-300 rounded-xl cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
      >
        <div className="flex items-center gap-2.5 text-gray-600 group-hover:text-gray-900 transition-colors">
          <div
            style={{
              backgroundColor: `${collection.iconColor}15`,
              borderColor: `${collection.iconColor}30`,
              color: collection.iconColor,
            }}
            className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs"
          >
            <StickyNote size={12.5} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-gray-800 group-hover:text-gray-900">
              Notes & Tasks
            </span>
            <span className="text-gray-300 font-light">·</span>
            <span className="text-[12px] font-normal text-gray-500 group-hover:text-gray-700">
              Add notes, ideas, or task checklists for this collection...
            </span>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-bold text-gray-700 group-hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs transition-all"
        >
          <Plus size={11} />
          <span>Add Note</span>
        </button>
      </div>
    );
  }

  // Active Notes Card View
  return (
    <div
      id="collection-notes-card"
      className="bg-white border border-[#EBEBEB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_-2px_rgba(0,0,0,0.03)] overflow-hidden transition-all text-[12.5px]"
    >
      {/* Notes Card Header */}
      <div
        className="px-3.5 py-2 bg-gray-50/80 border-b border-[#EBEBEB] flex items-center justify-between gap-3 select-none"
        id="collection-notes-header"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{
              backgroundColor: `${collection.iconColor}15`,
              borderColor: `${collection.iconColor}30`,
              color: collection.iconColor,
            }}
            className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs"
          >
            <StickyNote size={12.5} />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[12.5px] text-gray-800 tracking-tight leading-none">
              Notes & Tasks
            </span>

            {/* Checklist progress pill */}
            {checklistStats.total > 0 && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-gray-600 border border-gray-200 shadow-2xs"
                title={`${checklistStats.completed} of ${checklistStats.total} tasks completed`}
              >
                <span>
                  {checklistStats.completed}/{checklistStats.total} done
                </span>
                <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${checklistStats.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Saved Indicator */}
            {justSaved && (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 animate-fadeIn">
                <Check size={11} />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls right-side */}
        <div className="flex items-center gap-1 shrink-0" id="collection-notes-controls">
          {isEditing ? (
            <button
              type="button"
              id="done-editing-notes-btn"
              onClick={() => {
                setIsEditing(false);
                setActiveLineIndex(null);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-white bg-gray-900 hover:bg-black px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-xs"
              title="Finish Editing (Ctrl+Enter or Esc)"
            >
              <Check size={11} />
              <span>Done</span>
            </button>
          ) : (
            <>
              {hasNotes && (
                <button
                  type="button"
                  id="copy-notes-btn"
                  onClick={handleCopy}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                  title={copied ? 'Copied to clipboard!' : 'Copy notes'}
                >
                  {copied ? <Check size={12.5} className="text-emerald-600" /> : <Copy size={12.5} />}
                </button>
              )}

              <button
                type="button"
                id="edit-notes-btn"
                onClick={() => {
                  setIsEditing(true);
                  setIsCollapsed(false);
                  const lines = noteText ? noteText.split('\n') : [''];
                  const targetIdx = Math.max(0, lines.length - 1);
                  setActiveLineIndex(targetIdx);
                  setCursorTarget(lines[targetIdx]?.length || 0);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 px-2 py-1 rounded-md transition-all cursor-pointer"
                title="Edit notes"
              >
                <Edit3 size={11} />
                <span>Edit</span>
              </button>

              <button
                type="button"
                id="collapse-notes-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand notes' : 'Collapse notes'}
              >
                {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapsed Snippet State */}
      {isCollapsed && !isEditing && (
        <div
          onClick={() => setIsCollapsed(false)}
          className="px-3.5 py-2 text-[11.5px] text-gray-500 bg-white hover:bg-gray-50/50 cursor-pointer flex items-center justify-between gap-2"
        >
          <span className="truncate italic">
            {noteText.split('\n')[0] || 'Click to expand notes...'}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0 font-medium">
            Click to expand ({noteText.split('\n').length} lines)
          </span>
        </div>
      )}

      {/* Expanded Content View (Obsidian-Style Inline Live Preview) */}
      {!isCollapsed && (
        <div className="p-3.5 bg-white">
          {isEditing ? (
            <div className="space-y-2.5">
              {/* Formatting Helper Toolbar */}
              <div
                className="flex flex-wrap items-center justify-between pb-2 border-b border-gray-100 gap-2 text-gray-600 select-none"
                id="notes-formatting-toolbar"
              >
                {/* Left: All formatting action buttons */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* Headings Group (H1, H2, H3, H4) */}
                  <div className="flex items-center bg-gray-100/90 p-0.5 rounded-md gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertHeading(1)}
                      className="px-1.5 py-0.5 hover:bg-white hover:text-black rounded text-[11px] font-black cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      title="Heading 1 (# Title)"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHeading(2)}
                      className="px-1.5 py-0.5 hover:bg-white hover:text-black rounded text-[10.5px] font-extrabold cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      title="Heading 2 (## Subtitle)"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHeading(3)}
                      className="px-1.5 py-0.5 hover:bg-white hover:text-black rounded text-[10px] font-bold cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      title="Heading 3 (### Section)"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHeading(4)}
                      className="px-1.5 py-0.5 hover:bg-white hover:text-black rounded text-[9.5px] font-semibold text-gray-600 hover:text-black cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                      title="Heading 4 (#### Sub-section)"
                    >
                      H4
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-gray-300 mx-0.5" />

                  {/* Inline styling group: Bold, Italic, Strikethrough, Code */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertInline('**', '**', 'bold text')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Bold (**text**)"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertInline('*', '*', 'italic text')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Italic (*text*)"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertInline('~~', '~~', 'strikethrough')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Strikethrough (~~text~~)"
                    >
                      <Strikethrough size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertInline('`', '`', 'code')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Inline Code (`code`)"
                    >
                      <Code size={13} />
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-gray-300 mx-0.5" />

                  {/* Lists & blocks group: Tasks, Ordered, Bullets, Quote, Divider */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertList('task')}
                      className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors text-emerald-600"
                      title="Checklist Task (- [ ])"
                    >
                      <ListTodo size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertList('number')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Numbered List (1. )"
                    >
                      <ListOrdered size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertList('bullet')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Bullet List (- )"
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('> ')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Quote (> )"
                    >
                      <Quote size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('\n---\n')}
                      className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      title="Horizontal Divider (---)"
                    >
                      <Minus size={13} />
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview toggle & shortcuts */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showLivePreview;
                      setShowLivePreview(next);
                      if (next && activeLineIndex === null) {
                        const lines = noteText ? noteText.split('\n') : [''];
                        setActiveLineIndex(lines.length - 1);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all cursor-pointer ${
                      showLivePreview 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs' 
                        : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                    }`}
                    title={showLivePreview ? 'Switch to Full Raw Source Textarea' : 'Switch to Obsidian Live Preview (inline formatted)'}
                  >
                    {showLivePreview ? <Eye size={11} /> : <EyeOff size={11} />}
                    <span>{showLivePreview ? 'Live Preview On' : 'Source Mode'}</span>
                  </button>

                  <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                    Ctrl+Enter: Done
                  </span>

                  {hasNotes && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Clear all notes"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Unified Notes Content Section */}
              {showLivePreview ? (
                /* Obsidian-Style Live Preview: Active line is raw Markdown, all other lines formatted in-place */
                <div
                  className="space-y-0.5 min-h-[100px] cursor-text py-0.5"
                  onClick={(e) => {
                    // If clicked on blank padding area below lines, activate/append last line
                    if (e.target === e.currentTarget) {
                      if (isTextSelected()) return;
                      const lines = noteText ? noteText.split('\n') : [''];
                      if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
                        setActiveLineIndex(0);
                        setCursorTarget(0);
                      } else {
                        const lastIdx = lines.length - 1;
                        if (lines[lastIdx].trim() !== '') {
                          const newLines = [...lines, ''];
                          const newText = newLines.join('\n');
                          setNoteText(newText);
                          onUpdateNotes(newText);
                          setActiveLineIndex(newLines.length - 1);
                          setCursorTarget(0);
                        } else {
                          setActiveLineIndex(lastIdx);
                          setCursorTarget(0);
                        }
                      }
                    }
                  }}
                >
                  {(noteText ? noteText.split('\n') : ['']).map((line, idx) => {
                    if (idx === activeLineIndex) {
                      return (
                        <div
                          key={idx}
                          className="relative flex items-start bg-blue-50/20 border-l-2 border-blue-500 pl-2 py-0.5 -ml-2 rounded-r transition-all"
                        >
                          <textarea
                            ref={activeLineRef}
                            value={line}
                            onChange={(e) => handleLineChange(idx, e.target.value)}
                            onKeyDown={(e) => handleLineKeyDown(idx, e)}
                            placeholder={idx === 0 && !line ? "Type here in Markdown... (H1-H4, - [ ], lists, *italics*)" : ""}
                            rows={1}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-[12.5px] leading-relaxed text-gray-900 font-mono resize-none p-0"
                            autoFocus
                          />
                        </div>
                      );
                    }

                    return renderFormattedLine(line, idx);
                  })}
                </div>
              ) : (
                /* Raw Markdown Source Mode */
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your notes in raw Markdown here..."
                  className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-[12.5px] leading-relaxed text-gray-800 placeholder-gray-400 resize-none font-mono min-h-[120px]"
                  rows={Math.max(5, noteText.split('\n').length)}
                />
              )}
            </div>
          ) : (
            <div
              onClick={() => {
                if (isTextSelected()) return;
                setIsEditing(true);
                const lines = noteText ? noteText.split('\n') : [''];
                const targetIdx = Math.max(0, lines.length - 1);
                setActiveLineIndex(targetIdx);
                setCursorTarget(lines[targetIdx]?.length || 0);
              }}
              title="Click anywhere to edit notes"
              className="cursor-text"
            >
              {renderFormattedPreview()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
