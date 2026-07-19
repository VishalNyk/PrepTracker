import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  PenSquare,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { API_URL } from '../config';
import type { Topic, MasteryLevel, TopicNote } from '../types';

interface TopicCategory {
  id: number;
  name: string;
  createdAt: string;
}

const MASTERY_LEVELS: MasteryLevel[] = ['NOT_STARTED', 'LEARNING', 'PRACTICING', 'CONFIDENT', 'MASTERED'];

const MASTERY_METRICS = {
  NOT_STARTED: { level: 1, label: 'Not Started', color: 'bg-slate-700/50', textColor: 'text-slate-400' },
  LEARNING: { level: 2, label: 'Learning', color: 'bg-orange-500', textColor: 'text-orange-400' },
  PRACTICING: { level: 3, label: 'Practicing', color: 'bg-amber-500', textColor: 'text-amber-400' },
  CONFIDENT: { level: 4, label: 'Confident', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  MASTERED: { level: 5, label: 'Mastered', color: 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]', textColor: 'text-accent' }
};

export const Topics: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [newTopicNames, setNewTopicNames] = useState<Record<string, string>>({});
  const [topicSearchQueries, setTopicSearchQueries] = useState<Record<string, string>>({});
  const [topicCreateError, setTopicCreateError] = useState<string | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [isNoteModalMaximized, setIsNoteModalMaximized] = useState(true);
  const [editorLineHeight, setEditorLineHeight] = useState('1.7');
  const [activeFormat, setActiveFormat] = useState<{ bold: boolean; italic: boolean; underline: boolean }>({
    bold: false,
    italic: false,
    underline: false
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [topicDeleteConfirm, setTopicDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editedTopicName, setEditedTopicName] = useState('');
  const [noteOriginal, setNoteOriginal] = useState<{ title: string; content: string } | null>(null);
  const [activeNote, setActiveNote] = useState<{
    topicId: number;
    noteId: number | null;
    title: string;
    content: string;
    isNew: boolean;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<TopicCategory[]>({
    queryKey: ['topicCategories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });

  const { data: topics = [], isLoading: isTopicsLoading } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/topics`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      return res.json();
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create category');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topicCategories'] });
      setCategoryNameInput('');
    }
  });

  const createTopicMutation = useMutation({
    mutationFn: async (topic: { category: string; name: string }) => {
      const res = await fetch(`${API_URL}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topic)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create topic');
      }
      return res.json();
    },
    onSuccess: (createdTopic, variables) => {
      setTopicCreateError(null);
      const topicWithNotes: Topic = {
        ...createdTopic,
        topicNotes: createdTopic.topicNotes ?? []
      } as Topic;

      queryClient.setQueryData<Topic[]>(['topics'], (oldTopics) => {
        if (!oldTopics) return [topicWithNotes];
        if (oldTopics.some(topic => topic.id === topicWithNotes.id)) {
          return oldTopics;
        }
        return [...oldTopics, topicWithNotes];
      });

      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['masteryBreakdown'] });
      setNewTopicNames(prev => ({ ...prev, [variables.category]: '' }));
      setExpandedTopicId(topicWithNotes.id);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create topic';
      setTopicCreateError(message);
      console.error('Create topic failed:', error);
    }
  });

  const updateTopicMutation = useMutation({
    mutationFn: async (updated: { id: number; name?: string; masteryLevel?: MasteryLevel; notes?: string | null; lastPracticed?: string | null }) => {
      const res = await fetch(`${API_URL}/topics/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update topic');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['masteryBreakdown'] });
    }
  });

  const createTopicNoteMutation = useMutation({
    mutationFn: async (payload: { topicId: number; title: string; content?: string }) => {
      const res = await fetch(`${API_URL}/topics/${payload.topicId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, content: payload.content ?? '' })
      });
      if (!res.ok) throw new Error('Failed to create topic note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    }
  });

  const updateTopicNoteMutation = useMutation({
    mutationFn: async (payload: { topicId: number; noteId: number; title: string; content?: string }) => {
      const res = await fetch(`${API_URL}/topics/${payload.topicId}/notes/${payload.noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, content: payload.content })
      });
      if (!res.ok) throw new Error('Failed to update topic note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    }
  });

  const deleteTopicNoteMutation = useMutation({
    mutationFn: async (payload: { topicId: number; noteId: number }) => {
      const res = await fetch(`${API_URL}/topics/${payload.topicId}/notes/${payload.noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete topic note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    }
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/topics/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete topic');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['masteryBreakdown'] });
    }
  });

  const handleCycleMastery = (topic: Topic) => {
    const currentIdx = MASTERY_LEVELS.indexOf(topic.masteryLevel);
    const nextLevel = MASTERY_LEVELS[(currentIdx + 1) % MASTERY_LEVELS.length];
    updateTopicMutation.mutate({
      id: topic.id,
      masteryLevel: nextLevel,
      lastPracticed: new Date().toISOString()
    });
  };

  const handleAddCategory = () => {
    const name = categoryNameInput.trim();
    if (!name) return;
    createCategoryMutation.mutate(name);
  };

  const handleAddTopic = (categoryName: string) => {
    const name = (newTopicNames[categoryName] || '').trim();
    if (!name) return;
    setTopicCreateError(null);
    createTopicMutation.mutate({ category: categoryName, name });
  };

  useEffect(() => {
    if (!noteModalOpen || !activeNote || !editorRef.current) return;
    const nextHtml = activeNote.content || '';
    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [noteModalOpen, activeNote?.noteId, activeNote?.topicId]);

  const syncEditorContent = () => {
    if (!editorRef.current) return;
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    setActiveFormat({
      bold: isBold,
      italic: isItalic,
      underline: isUnderline
    });
    setActiveNote(prev => prev ? { ...prev, content: editorRef.current?.innerHTML || '' } : prev);
  };

  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('styleWithCSS', false, '');
    document.execCommand(command, false, value ?? '');
    syncEditorContent();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    event.preventDefault();

    const clipboardHtml = event.clipboardData.getData('text/html');
    const clipboardText = event.clipboardData.getData('text/plain');
    const sanitizeNode = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.cloneNode(true);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();
      const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li'];
      const sanitizedElement = document.createElement(allowedTags.includes(tag) ? tag : 'span');

      // Preserve bold/italic/underline but force text color to white and strip backgrounds
      const computedStyle = element.getAttribute('style');
      if (computedStyle) {
        const style = element.style;
        const keepStyles: Record<string, string> = {};
        if (style.fontWeight && style.fontWeight !== 'normal') keepStyles.fontWeight = style.fontWeight;
        if (style.fontStyle && style.fontStyle !== 'normal') keepStyles.fontStyle = style.fontStyle;
        if (style.textDecoration && style.textDecoration !== 'none') keepStyles.textDecoration = style.textDecoration;
        Object.entries(keepStyles).forEach(([key, value]) => {
          sanitizedElement.style.setProperty(key, value);
        });
      }
      sanitizedElement.style.setProperty('color', 'white');
      sanitizedElement.style.removeProperty('background');
      sanitizedElement.style.removeProperty('background-color');

      for (const child of Array.from(element.childNodes)) {
        const sanitizedChild = sanitizeNode(child);
        if (sanitizedChild) {
          sanitizedElement.appendChild(sanitizedChild);
        }
      }

      return sanitizedElement;
    };

    if (clipboardHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(clipboardHtml, 'text/html');
      const body = doc.body;
      const fragment = document.createDocumentFragment();
      body.childNodes.forEach(node => {
        const sanitized = sanitizeNode(node);
        if (sanitized) fragment.appendChild(sanitized);
      });
      const div = document.createElement('div');
      div.appendChild(fragment);
      document.execCommand('insertHTML', false, div.innerHTML);
    } else {
      document.execCommand('insertText', false, clipboardText);
    }
    syncEditorContent();
  };

  const applyLineSpacing = (value: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editorRef.current.style.lineHeight = value;
      setEditorLineHeight(value);
      syncEditorContent();
      return;
    }
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer as HTMLElement
      : range.commonAncestorContainer.parentElement;
    const blockTarget = container?.closest('p, li, blockquote, div') as HTMLElement | null;
    if (blockTarget) {
      blockTarget.style.lineHeight = value;
    } else {
      editorRef.current.style.lineHeight = value;
    }
    setEditorLineHeight(value);
    syncEditorContent();
  };

  const openNoteEditor = (topic: Topic, note?: TopicNote) => {
    const initialTitle = note?.title ?? `Note ${Math.max((topic.topicNotes?.length ?? 0) + 1, 1)}`;
    const initialContent = note?.content ?? '';
    setActiveNote({
      topicId: topic.id,
      noteId: note?.id ?? null,
      title: initialTitle,
      content: initialContent,
      isNew: !note
    });
    setNoteOriginal({ title: initialTitle, content: initialContent });
    setSaveStatus('idle');
    setDeleteConfirmOpen(false);
    setExitConfirmOpen(false);
    setIsNoteModalMaximized(true);
    setNoteModalOpen(true);
  };

  const handleCreateNote = async (topic: Topic) => {
    const nextIndex = (topic.topicNotes?.length ?? 0) + 1;
    const created = await createTopicNoteMutation.mutateAsync({
      topicId: topic.id,
      title: `Note ${nextIndex}`,
      content: ''
    });
    const nextNote = {
      topicId: topic.id,
      noteId: created.id,
      title: created.title || `Note ${nextIndex}`,
      content: created.content || '',
      isNew: false
    };
    setActiveNote(nextNote);
    setNoteOriginal({ title: nextNote.title, content: nextNote.content });
    setSaveStatus('idle');
    setDeleteConfirmOpen(false);
    setExitConfirmOpen(false);
    setIsNoteModalMaximized(true);
    setNoteModalOpen(true);
  };

  const openRenameTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditedTopicName(topic.name);
  };

  const cancelRenameTopic = () => {
    setEditingTopicId(null);
    setEditedTopicName('');
  };

  const handleSaveRenameTopic = async (topic: Topic) => {
    const trimmedName = editedTopicName.trim();
    if (!trimmedName || trimmedName === topic.name) {
      cancelRenameTopic();
      return;
    }

    await updateTopicMutation.mutateAsync({ id: topic.id, name: trimmedName });
    cancelRenameTopic();
  };

  const handleDeleteTopic = async () => {
    if (!topicDeleteConfirm) return;
    await deleteTopicMutation.mutateAsync(topicDeleteConfirm.id);
    setTopicDeleteConfirm(null);
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote) return;
    const trimmedTitle = activeNote.title.trim() || `Note ${activeNote.noteId ? activeNote.noteId : 1}`;
    if (activeNote.noteId) {
      await updateTopicNoteMutation.mutateAsync({
        topicId: activeNote.topicId,
        noteId: activeNote.noteId,
        title: trimmedTitle,
        content: activeNote.content
      });
      setNoteOriginal({ title: trimmedTitle, content: activeNote.content });
      setActiveNote(prev => prev ? { ...prev, title: trimmedTitle } : prev);
    } else {
      const created = await createTopicNoteMutation.mutateAsync({
        topicId: activeNote.topicId,
        title: trimmedTitle,
        content: activeNote.content
      });
      const updatedNote = {
        ...activeNote,
        noteId: created.id,
        isNew: false,
        title: created.title || trimmedTitle
      };
      setActiveNote(updatedNote);
      setNoteOriginal({ title: updatedNote.title, content: updatedNote.content });
    }
  };

  const handleDeleteActiveNote = async () => {
    if (!activeNote || !activeNote.noteId) {
      setDeleteConfirmOpen(false);
      setNoteModalOpen(false);
      setActiveNote(null);
      return;
    }
    await deleteTopicNoteMutation.mutateAsync({ topicId: activeNote.topicId, noteId: activeNote.noteId });
    setDeleteConfirmOpen(false);
    setNoteModalOpen(false);
    setActiveNote(null);
  };

  const closeNoteModal = () => {
    setDeleteConfirmOpen(false);
    setExitConfirmOpen(false);
    setSaveStatus('idle');
    setNoteModalOpen(false);
    setActiveNote(null);
    setNoteOriginal(null);
    setIsNoteModalMaximized(false);
  };

  const hasUnsavedChanges = React.useMemo(() => {
    return !!activeNote && !!noteOriginal && (
      activeNote.title !== noteOriginal.title ||
      activeNote.content !== noteOriginal.content
    );
  }, [activeNote, noteOriginal]);

  const handleSaveNoteClick = async () => {
    if (!activeNote) return;
    setSaveStatus('saving');
    try {
      await handleSaveActiveNote();
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      setSaveStatus('error');
      window.setTimeout(() => setSaveStatus('idle'), 2200);
    }
  };

  const handleSetPracticedToday = (id: number) => {
    updateTopicMutation.mutate({
      id,
      lastPracticed: new Date().toISOString()
    });
  };

  const filteredCategories = React.useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(category => category.name.toLowerCase().includes(query));
  }, [categories, categorySearchQuery]);

  const groupedTopics = React.useMemo(() => {
    const groups: Record<string, Topic[]> = {};
    categories.forEach(category => {
      groups[category.name] = [];
    });
    topics.forEach(topic => {
      if (groups[topic.category]) {
        groups[topic.category].push(topic);
      }
    });
    return groups;
  }, [categories, topics]);

  const renderMasteryIndicator = (level: MasteryLevel) => {
    const metric = MASTERY_METRICS[level];
    const totalSegments = 5;

    return (
      <div className="flex items-center gap-3 cursor-pointer select-none group/indicator">
        <div className="flex gap-[3px]">
          {Array.from({ length: totalSegments }).map((_, idx) => {
            const isActive = idx < metric.level;
            return (
              <div
                key={idx}
                className={`w-1.5 h-3.5 rounded-sm transition-all duration-200 ${
                  isActive ? metric.color : 'bg-slate-900 border border-slate-800'
                }`}
              />
            );
          })}
        </div>
        <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${metric.textColor} transition-colors group-hover/indicator:text-accent`}>
          {metric.label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
            TOPICS_MASTERY
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Track domain competency levels and practice history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-400 shadow-sm shadow-black/20">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="search"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder="Search categories"
              className="w-36 bg-transparent outline-none placeholder-slate-600 text-slate-200"
            />
          </label>
          <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-400 shadow-sm shadow-black/20">
            <input
              type="text"
              value={categoryNameInput}
              onChange={(e) => setCategoryNameInput(e.target.value)}
              placeholder="New category"
              className="w-36 bg-transparent outline-none placeholder-slate-600 text-slate-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
              }}
            />
            <button
              onClick={handleAddCategory}
              className="rounded border border-slate-700 bg-slate-800 p-1.5 text-slate-200 transition-colors hover:bg-slate-700"
              title="Create category"
            >
              <Plus className="h-2 w-2" />
            </button>
          </div>
          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded">
            <BookOpen className="w-3.5 h-3.5 text-accent" />
            <span>CYCLES: NOT_STARTED → MASTERED</span>
          </div>
        </div>
      </div>

      {(isCategoriesLoading || isTopicsLoading) ? (
        <div className="text-center font-mono text-[10px] text-slate-600 py-12">
          loading_mastery_data...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-900/30 p-8 text-center font-mono text-[10px] text-slate-600">
          NO_CATEGORIES_FOUND
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {filteredCategories.map(category => {
            const list = groupedTopics[category.name] || [];
            const topicQuery = (topicSearchQueries[category.id] || '').trim().toLowerCase();
            const filteredList = topicQuery
              ? list.filter(topic => topic.name.toLowerCase().includes(topicQuery))
              : list;

            return (
              <div key={category.id} className="bg-panel rounded-lg border border-slate-800 flex flex-col h-[580px]">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
                    {category.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {list.length} topics
                  </span>
                </div>

                <div className="p-3 border-b border-slate-800 bg-slate-900/20">
                  <label className="flex items-center gap-2 rounded border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-400">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="search"
                      value={topicSearchQueries[category.id] || ''}
                      onChange={(e) => setTopicSearchQueries(prev => ({ ...prev, [category.id]: e.target.value }))}
                      placeholder={`Search ${category.name}`}
                      className="w-full bg-transparent outline-none placeholder-slate-600 text-slate-200"
                    />
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {filteredList.length === 0 ? (
                    <div className="text-center font-mono text-[10px] text-slate-600 py-12">
                      {topicQuery ? 'NO_MATCHING_TOPICS' : 'NO_TOPICS_FOUND'}
                    </div>
                  ) : (
                    filteredList.map(topic => {
                      const isExpanded = expandedTopicId === topic.id;

                      return (
                        <div
                          key={topic.id}
                          className="border border-slate-800/80 rounded bg-slate-900/10 hover:border-slate-700/60 transition-colors flex flex-col overflow-hidden"
                        >
                          <div className="p-3 flex items-center justify-between gap-4 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left text-slate-200 hover:text-slate-100"
                            >
                              <span className="text-slate-500 transition-colors group-hover:text-slate-300">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                              <span className="text-xs font-medium select-none truncate">
                                {topic.name}
                              </span>
                            </button>

                            <div onClick={(event) => {
                                event.stopPropagation();
                                handleCycleMastery(topic);
                              }}
                              className="cursor-pointer"
                            >
                              {renderMasteryIndicator(topic.masteryLevel)}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 bg-slate-950/30 border-t border-slate-800/60 space-y-3 font-sans text-xs">
                              <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900 pb-2">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Clock className="w-3 h-3 text-slate-600" />
                                  <span>
                                    Last Practiced: {topic.lastPracticed ? new Date(topic.lastPracticed).toLocaleString() : 'Never'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleSetPracticedToday(topic.id)}
                                  className="text-slate-400 hover:text-accent border border-slate-800 bg-slate-900 hover:bg-slate-850 px-2 py-0.5 rounded transition-all text-[9px]"
                                >
                                  MARK_PRACTICED_TODAY
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-3">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                  Topic name
                                </span>
                                {editingTopicId === topic.id ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="text"
                                      value={editedTopicName}
                                      onChange={(e) => setEditedTopicName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          void handleSaveRenameTopic(topic);
                                        }
                                      }}
                                      className="min-w-[220px] rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                                      placeholder="Rename topic"
                                    />
                                    <button
                                      onClick={() => void handleSaveRenameTopic(topic)}
                                      className="rounded border border-emerald-700/60 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300 transition-colors hover:bg-emerald-900"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelRenameTopic}
                                      className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openRenameTopic(topic)}
                                    className="text-[9px] font-mono text-cyan-500 hover:underline"
                                  >
                                    Rename
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Concept Notes</span>
                                  <button
                                    onClick={() => handleCreateNote(topic)}
                                    className="text-[9px] font-mono text-cyan-500 hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> NEW_NOTE
                                  </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {(topic.topicNotes || []).length > 0 ? (
                                    topic.topicNotes.map((note, index) => (
                                      <button
                                        key={note.id}
                                        onClick={() => openNoteEditor(topic, note)}
                                        className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[10px] font-mono text-slate-200 shadow-sm transition-all hover:border-cyan-500 hover:text-cyan-300"
                                      >
                                        {note.title || `Note ${index + 1}`}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-3 py-2 text-[10px] text-slate-600">
                                      No note cards yet. Create the first one to capture patterns and ideas.
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => setTopicDeleteConfirm({ id: topic.id, name: topic.name })}
                                  className="text-slate-500 hover:text-rose-400 flex items-center gap-1 font-mono text-[9px] transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  DELETE_TOPIC
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex gap-2">
                  <div className="flex flex-col flex-1 gap-2">
                    <input
                      type="text"
                      placeholder="Create new topic..."
                      value={newTopicNames[category.name] || ''}
                      onChange={(e) => setNewTopicNames(prev => ({ ...prev, [category.name]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTopic(category.name);
                      }}
                      className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-650 focus:outline-none focus:border-accent flex-1 font-sans"
                    />
                    {topicCreateError && category.name && (
                      <p className="text-[10px] text-rose-400 font-mono">{topicCreateError}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddTopic(category.name)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-1.5 rounded transition-colors"
                    title="Add Topic"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noteModalOpen && activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className={`relative w-full ${isNoteModalMaximized ? 'max-w-[98vw] h-[97vh]' : 'max-w-[92vw] h-[86vh]'} rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/50 flex flex-col overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <PenSquare className="h-4 w-4 text-cyan-400" />
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => setActiveNote(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  className="bg-transparent text-sm font-mono uppercase tracking-[0.25em] text-slate-100 outline-none"
                  placeholder="Note title"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    void handleSaveNoteClick();
                  }}
                  className="rounded border border-emerald-700/60 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300 transition-colors hover:bg-emerald-900"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsNoteModalMaximized(prev => !prev)}
                  className="rounded border border-slate-700 bg-slate-800/80 p-2 text-slate-300 transition-colors hover:border-cyan-500 hover:text-cyan-300"
                  title={isNoteModalMaximized ? 'Restore view' : 'Maximize'}
                >
                  {isNoteModalMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      setExitConfirmOpen(true);
                      return;
                    }
                    closeNoteModal();
                  }}
                  className="rounded border border-slate-700 bg-slate-800/80 p-2 text-slate-300 transition-colors hover:border-rose-500 hover:text-rose-300"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] p-4">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-inner">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/70 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => applyEditorCommand('bold')}
                    className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors ${activeFormat.bold ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-500 hover:text-cyan-300'}`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEditorCommand('italic')}
                    className={`rounded border px-2.5 py-1 text-[11px] italic transition-colors ${activeFormat.italic ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-500 hover:text-cyan-300'}`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEditorCommand('underline')}
                    className={`rounded border px-2.5 py-1 text-[11px] underline transition-colors ${activeFormat.underline ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-500 hover:text-cyan-300'}`}
                  >
                    U
                  </button>
                  <div className="mx-1 h-4 w-px bg-slate-800" />
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">
                    <span>Line spacing</span>
                    <select
                      value={editorLineHeight}
                      onChange={(e) => applyLineSpacing(e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 outline-none"
                    >
                      <option value="1">1.0</option>
                      <option value="1.3">1.3</option>
                      <option value="1.6">1.6</option>
                      <option value="2">2.0</option>
                    </select>
                  </label>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onPaste={handlePaste}
                  onInput={syncEditorContent}
                  onBlur={syncEditorContent}
                  style={{ lineHeight: editorLineHeight }}
                  className="flex-1 overflow-y-auto px-5 py-5 text-[15px] leading-[1.7] text-slate-100 outline-none [white-space:pre-wrap]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.28em] transition-colors ${
                  saveStatus === 'saving'
                    ? 'border-amber-700/60 bg-amber-950/60 text-amber-300'
                    : saveStatus === 'saved'
                      ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
                      : saveStatus === 'error'
                        ? 'border-rose-800/60 bg-rose-950/60 text-rose-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-500'
                }`}>
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Save failed' : 'Draft ready'}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">
                  {activeNote?.isNew ? 'Unsaved draft' : 'Editing saved note'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="rounded border border-rose-800/60 bg-rose-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300 transition-colors hover:bg-rose-900"
                >
                  Delete
                </button>
              </div>
            </div>

            {deleteConfirmOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl shadow-black/50">
                  <div className="text-sm font-semibold text-slate-100">Delete this note?</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    This will remove the note permanently from this topic.
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        void handleDeleteActiveNote();
                      }}
                      className="rounded border border-rose-800/60 bg-rose-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300 transition-colors hover:bg-rose-900"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            {exitConfirmOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl shadow-black/50">
                  <div className="text-sm font-semibold text-slate-100">Discard changes?</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    You have unsaved changes. Leaving now will discard them.
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setExitConfirmOpen(false)}
                      className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-500"
                    >
                      Stay
                    </button>
                    <button
                      onClick={() => closeNoteModal()}
                      className="rounded border border-rose-800/60 bg-rose-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300 transition-colors hover:bg-rose-900"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {topicDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-100">Delete topic?</div>
                <div className="mt-2 text-xs leading-6 text-slate-400">
                  Are you sure you want to delete <span className="font-semibold text-slate-100">{topicDeleteConfirm.name}</span>? This cannot be undone.
                </div>
              </div>
              <button
                onClick={() => setTopicDeleteConfirm(null)}
                className="rounded border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                aria-label="Close delete confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setTopicDeleteConfirm(null)}
                className="rounded border border-slate-700 bg-slate-900/80 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteTopic()}
                className="rounded border border-rose-700 bg-rose-950/70 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300 transition-colors hover:bg-rose-900"
              >
                Delete topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
