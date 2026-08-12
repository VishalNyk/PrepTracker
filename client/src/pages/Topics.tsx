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
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
  FileText,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { API_URL } from '../config';
import type { Topic, MasteryLevel, TopicNote } from '../types';

const FONTS = [
  { name: 'Inter (Sans)', value: 'Inter' },
  { name: 'IBM Plex Mono', value: 'IBM Plex Mono' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Outfit (Sleek)', value: 'Outfit' }
];

const FONT_SIZES = [
  { name: 'Extra Small', value: '1' },
  { name: 'Small', value: '2' },
  { name: 'Medium (Body)', value: '3' },
  { name: 'Large', value: '4' },
  { name: 'Extra Large', value: '5' },
  { name: 'Heading 2', value: '6' },
  { name: 'Heading 1', value: '7' }
];

const HEADINGS = [
  { name: 'Paragraph', value: 'p' },
  { name: 'Heading 1', value: 'h1' },
  { name: 'Heading 2', value: 'h2' },
  { name: 'Heading 3', value: 'h3' }
];

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
  const [activeFormat, setActiveFormat] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontName: string;
    fontSize: string;
    heading: string;
  }>({
    bold: false,
    italic: false,
    underline: false,
    fontName: 'Inter',
    fontSize: '3',
    heading: 'p'
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
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    
    let fontName = 'Inter';
    try {
      const f = document.queryCommandValue('fontName');
      if (f) fontName = f.replace(/['"]/g, '');
    } catch {}
    
    let fontSize = '3';
    try {
      const s = document.queryCommandValue('fontSize');
      if (s) fontSize = s;
    } catch {}

    let heading = 'p';
    try {
      const block = document.queryCommandValue('formatBlock');
      if (block) heading = block;
    } catch {}

    setActiveFormat({
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      fontName,
      fontSize,
      heading
    });

    setActiveNote(prev => prev ? { ...prev, content: editorRef.current?.innerHTML || '' } : prev);
  };

  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false, value ?? '');
    syncEditorContent();
  };

  const uploadImageToImgBB = async (file: File): Promise<string> => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '9dc3dad08426edd7693cc862c6c8f9b1';
    if (!apiKey || apiKey === '') {
      // Fallback to base64 if key is empty
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const result = await response.json();
    return result.data.url;
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editorRef.current) {
      editorRef.current.focus();
      setSaveStatus('saving');
      try {
        const imageUrl = await uploadImageToImgBB(file);
        const imgHtml = `<img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 0.375rem; display: block; margin: 0.5rem 0;" />`;
        document.execCommand('insertHTML', false, imgHtml);
        syncEditorContent();
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
      } catch (err) {
        console.error('File insert failed:', err);
        setSaveStatus('error');
        window.setTimeout(() => setSaveStatus(prev => prev === 'error' ? 'idle' : prev), 2200);
      }
    }
  };

  const toggleBlockQuote = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    let heading = 'p';
    try {
      const block = document.queryCommandValue('formatBlock');
      if (block) heading = block.toLowerCase();
    } catch {}

    if (heading === 'blockquote') {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
    syncEditorContent();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;

    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode || node;
      }

      const element = node as HTMLElement;
      const blockquote = element.closest('blockquote');
      const pre = element.closest('pre');

      if (blockquote) {
        const currentLineText = range.startContainer.textContent || '';
        
        if (currentLineText.trim() === '') {
          e.preventDefault();
          
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          
          if (blockquote.parentNode) {
            blockquote.parentNode.insertBefore(p, blockquote.nextSibling);
            
            let currentBlockNode = range.startContainer;
            if (currentBlockNode.nodeType === Node.TEXT_NODE) {
              currentBlockNode = currentBlockNode.parentNode || currentBlockNode;
            }
            if (currentBlockNode && currentBlockNode !== blockquote) {
              currentBlockNode.remove();
            } else {
              blockquote.innerHTML = '';
            }

            if (blockquote.textContent === '' || blockquote.innerHTML === '' || blockquote.innerHTML === '<br>') {
              blockquote.remove();
            }

            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            syncEditorContent();
          }
          return;
        }
      } else if (pre) {
        e.preventDefault();
        document.execCommand('insertHTML', false, '\n');
        syncEditorContent();
        return;
      }
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode || node;
      }

      const element = node as HTMLElement;
      const blockquote = element.closest('blockquote');
      
      if (blockquote && (blockquote.textContent === '' || blockquote.innerHTML === '<br>' || blockquote.innerHTML === '')) {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        blockquote.parentNode?.replaceChild(p, blockquote);

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        syncEditorContent();
        return;
      }
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && editorRef.current) {
      const lastChild = editorRef.current.lastChild as HTMLElement | null;
      if (!lastChild || (lastChild.nodeType === Node.ELEMENT_NODE && ['blockquote', 'pre', 'ul', 'ol', 'h1', 'h2', 'h3'].includes(lastChild.tagName.toLowerCase()))) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editorRef.current.appendChild(p);
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        syncEditorContent();
      } else {
        editorRef.current.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    event.preventDefault();

    const items = event.clipboardData.items;
    let containsImage = false;
    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        containsImage = true;
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (containsImage && imageFile) {
      event.preventDefault();
      setSaveStatus('saving');
      try {
        const imageUrl = await uploadImageToImgBB(imageFile);
        const imgHtml = `<img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 0.375rem; display: block; margin: 0.5rem 0;" />`;
        document.execCommand('insertHTML', false, imgHtml);
        syncEditorContent();
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
      } catch (err) {
        console.error('Paste upload failed:', err);
        setSaveStatus('error');
        window.setTimeout(() => setSaveStatus(prev => prev === 'error' ? 'idle' : prev), 2200);
      }
      return;
    }

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

      if (tag === 'img') {
        const imgElement = document.createElement('img');
        const srcAttr = element.getAttribute('src');
        if (srcAttr) {
          imgElement.src = srcAttr;
        }
        imgElement.style.maxWidth = '100%';
        imgElement.style.height = 'auto';
        imgElement.style.borderRadius = '0.375rem';
        imgElement.style.display = 'block';
        imgElement.style.margin = '0.5rem 0';
        return imgElement;
      }

      const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'code', 'a'];
      const sanitizedElement = document.createElement(allowedTags.includes(tag) ? tag : 'span');

      // Preserve formatting
      const computedStyle = element.getAttribute('style');
      if (computedStyle) {
        const style = element.style;
        const keepStyles: Record<string, string> = {};
        if (style.fontWeight && style.fontWeight !== 'normal') keepStyles.fontWeight = style.fontWeight;
        if (style.fontStyle && style.fontStyle !== 'normal') keepStyles.fontStyle = style.fontStyle;
        if (style.textDecoration && style.textDecoration !== 'none') keepStyles.textDecoration = style.textDecoration;
        if (style.fontFamily) keepStyles.fontFamily = style.fontFamily;
        if (style.fontSize) keepStyles.fontSize = style.fontSize;
        Object.entries(keepStyles).forEach(([key, value]) => {
          sanitizedElement.style.setProperty(key, value);
        });
      }
      sanitizedElement.style.setProperty('color', '#f1f5f9');
      sanitizedElement.style.setProperty('background-color', 'transparent', 'important');
      sanitizedElement.style.setProperty('background', 'transparent', 'important');

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
      
      // Remove tags that carry harmful external global styles
      const styles = body.querySelectorAll('style, script, link, meta');
      styles.forEach(s => s.remove());

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

  const handleCreateLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const url = prompt('Enter URL (e.g. https://google.com):');
    if (url) {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      applyEditorCommand('createLink', formattedUrl);
    }
  };

  const handleCodeFormatting = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      document.execCommand('insertHTML', false, '<code class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-xs text-rose-400">code</code>');
      syncEditorContent();
      return;
    }
    const selectedText = selection.toString();
    if (selectedText.includes('\n')) {
      const codeBlockHtml = `<pre class="bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono text-xs my-2 overflow-x-auto text-emerald-400 block"><code style="font-family: inherit;">${selectedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre><p><br></p>`;
      document.execCommand('insertHTML', false, codeBlockHtml);
    } else {
      const inlineCodeHtml = `<code class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-xs text-rose-400">${selectedText}</code>`;
      document.execCommand('insertHTML', false, inlineCodeHtml);
    }
    syncEditorContent();
  };

  const openNoteEditor = (topic: Topic, note?: TopicNote) => {
    setActiveTopicId(topic.id);
    if (note) {
      setActiveNote({
        topicId: topic.id,
        noteId: note.id,
        title: note.title,
        content: note.content ?? '',
        isNew: false
      });
      setNoteOriginal({ title: note.title, content: note.content ?? '' });
    } else {
      if (topic.topicNotes && topic.topicNotes.length > 0) {
        const first = topic.topicNotes[0];
        setActiveNote({
          topicId: topic.id,
          noteId: first.id,
          title: first.title,
          content: first.content ?? '',
          isNew: false
        });
        setNoteOriginal({ title: first.title, content: first.content ?? '' });
      } else {
        setActiveNote(null);
        setNoteOriginal(null);
      }
    }
    setNoteSearchQuery('');
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
    setActiveTopicId(topic.id);
    setActiveNote({
      topicId: topic.id,
      noteId: created.id,
      title: created.title || `Note ${nextIndex}`,
      content: '',
      isNew: false
    });
    setNoteOriginal({ title: created.title || `Note ${nextIndex}`, content: '' });
    setNoteSearchQuery('');
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
    const trimmedTitle = activeNote.title.trim() || 'Untitled Note';
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
    setActiveTopicId(null);
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
      window.setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
    } catch {
      setSaveStatus('error');
      window.setTimeout(() => setSaveStatus(prev => prev === 'error' ? 'idle' : prev), 2000);
    }
  };

  const autosaveTimerRef = useRef<number | null>(null);

  const savePendingChangesImmediate = async () => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (activeNote && noteOriginal) {
      const changed = activeNote.title !== noteOriginal.title || activeNote.content !== noteOriginal.content;
      if (changed) {
        setSaveStatus('saving');
        try {
          await handleSaveActiveNote();
          setSaveStatus('saved');
          window.setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1000);
        } catch (err) {
          console.error('Immediate save error:', err);
          setSaveStatus('error');
          window.setTimeout(() => setSaveStatus(prev => prev === 'error' ? 'idle' : prev), 2000);
        }
      }
    }
  };

  const handleSelectNote = async (note: TopicNote) => {
    await savePendingChangesImmediate();
    setActiveNote({
      topicId: note.topicId,
      noteId: note.id,
      title: note.title,
      content: note.content ?? '',
      isNew: false
    });
    setNoteOriginal({ title: note.title, content: note.content ?? '' });
    setSaveStatus('idle');
  };

  const handleCreateNewNoteInModal = async () => {
    if (!activeTopicId) return;
    await savePendingChangesImmediate();
    const nextIndex = (activeTopic?.topicNotes?.length ?? 0) + 1;
    const created = await createTopicNoteMutation.mutateAsync({
      topicId: activeTopicId,
      title: `Note ${nextIndex}`,
      content: ''
    });
    setActiveNote({
      topicId: activeTopicId,
      noteId: created.id,
      title: created.title || `Note ${nextIndex}`,
      content: '',
      isNew: false
    });
    setNoteOriginal({ title: created.title || `Note ${nextIndex}`, content: '' });
    setSaveStatus('idle');
  };

  const handleCloseModalWithSave = async () => {
    await savePendingChangesImmediate();
    closeNoteModal();
  };

  // Autosave effect
  useEffect(() => {
    if (!noteModalOpen || !activeNote || !noteOriginal) return;

    const changed = activeNote.title !== noteOriginal.title || activeNote.content !== noteOriginal.content;
    if (!changed) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    setSaveStatus('saving');

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        await handleSaveActiveNote();
        setSaveStatus('saved');
        window.setTimeout(() => {
          setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 1500);
      } catch (err) {
        console.error('Autosave error:', err);
        setSaveStatus('error');
        window.setTimeout(() => {
          setSaveStatus(prev => prev === 'error' ? 'idle' : prev);
        }, 2000);
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [activeNote?.title, activeNote?.content, noteOriginal, noteModalOpen]);

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

  const activeTopic = topics.find(t => t.id === activeTopicId);

  const filteredNotes = React.useMemo(() => {
    if (!activeTopic) return [];
    const query = noteSearchQuery.toLowerCase().trim();
    if (!query) return activeTopic.topicNotes || [];
    return (activeTopic.topicNotes || []).filter(note => 
      note.title.toLowerCase().includes(query) || 
      (note.content || '').toLowerCase().includes(query)
    );
  }, [activeTopic, noteSearchQuery]);

  const stripHtmlAndTruncate = (html: string | null | undefined, maxLength = 80) => {
    if (!html) return 'Empty note...';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    if (text.length <= maxLength) return text || 'Empty note...';
    return text.substring(0, maxLength) + '...';
  };

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

      {noteModalOpen && activeTopicId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className={`relative w-full ${isNoteModalMaximized ? 'max-w-[98vw] h-[97vh]' : 'max-w-[92vw] h-[86vh]'} rounded-3xl border border-slate-850 bg-slate-950 shadow-2xl shadow-black/50 flex flex-col overflow-hidden`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 bg-slate-900/60 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-slate-100">
                  Concept Workspace // {activeTopic?.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsNoteModalMaximized(prev => !prev)}
                  className="rounded border border-slate-800 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-cyan-500 hover:text-cyan-300 cursor-pointer"
                  title={isNoteModalMaximized ? 'Restore view' : 'Maximize'}
                >
                  {isNoteModalMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleCloseModalWithSave}
                  className="rounded border border-slate-800 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-rose-500 hover:text-rose-300 cursor-pointer"
                  title="Close and save workspace"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Split Dual-Pane View */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Sidebar: Notes list */}
              <div className="w-80 border-r border-slate-900 bg-slate-950/20 flex flex-col h-full shrink-0">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-900">
                  <label className="flex items-center gap-2 rounded border border-slate-850 bg-slate-900/40 px-2.5 py-1.5 text-xs text-slate-400">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="search"
                      value={noteSearchQuery}
                      onChange={(e) => setNoteSearchQuery(e.target.value)}
                      placeholder="Search notes..."
                      className="w-full bg-transparent outline-none placeholder-slate-700 text-slate-200 text-xs"
                    />
                  </label>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 select-none scrollbar-thin">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center font-mono text-[10px] text-slate-600 py-12">
                      {noteSearchQuery ? 'NO_MATCHING_NOTES' : 'NO_NOTES_FOUND'}
                    </div>
                  ) : (
                    filteredNotes.map((note, index) => {
                      const isSelected = activeNote?.noteId === note.id;
                      return (
                        <div
                          key={note.id}
                          onClick={() => handleSelectNote(note)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 relative group ${
                            isSelected
                              ? 'bg-cyan-950/20 border-cyan-950/50 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.02)]'
                              : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/25 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-xs truncate pr-6">
                            {note.title || 'Untitled Note'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 line-clamp-1 pr-6 font-sans">
                            {stripHtmlAndTruncate(note.content, 60)}
                          </div>
                          <div className="text-[9px] text-slate-650 font-mono mt-1.5 flex items-center justify-between">
                            <span>
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-600 font-sans">
                              Edit Note
                            </span>
                          </div>
                          
                          {/* Trash button on list item */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete note "${note.title || 'Untitled Note'}"?`)) {
                                if (isSelected) {
                                  await deleteTopicNoteMutation.mutateAsync({ topicId: note.topicId, noteId: note.id });
                                  const remaining = (activeTopic?.topicNotes || []).filter(n => n.id !== note.id);
                                  if (remaining.length > 0) {
                                    void handleSelectNote(remaining[0]);
                                  } else {
                                    setActiveNote(null);
                                    setNoteOriginal(null);
                                  }
                                } else {
                                  await deleteTopicNoteMutation.mutateAsync({ topicId: note.topicId, noteId: note.id });
                                }
                              }
                            }}
                            className="absolute top-3 right-3 p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sidebar Footer: Add New Note */}
                <div className="p-3 border-t border-slate-900 bg-slate-900/10">
                  <button
                    onClick={handleCreateNewNoteInModal}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-slate-800 hover:border-cyan-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New note
                  </button>
                </div>
              </div>

              {/* Right Pane: Editor or Empty State */}
              <div className="flex-1 flex flex-col h-full bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.03),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] overflow-hidden">
                {activeNote ? (
                  <div className="flex-1 flex flex-col overflow-hidden h-full">
                    
                    {/* Active Note Title & Info Area */}
                    <div className="px-5 pt-4 pb-2 border-b border-slate-900 bg-slate-950/20 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 shrink-0">
                      <input
                        type="text"
                        value={activeNote.title}
                        onChange={(e) => setActiveNote(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        className="bg-transparent text-lg font-bold text-slate-100 outline-none border-b border-transparent focus:border-slate-850 pb-1 flex-1 placeholder-slate-700"
                        placeholder="Untitled Note"
                      />
                      
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors flex items-center gap-1.5 ${
                          saveStatus === 'saving'
                            ? 'border-amber-700/60 bg-amber-950/60 text-amber-300'
                            : saveStatus === 'saved'
                              ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
                              : saveStatus === 'error'
                                ? 'border-rose-800/60 bg-rose-950/60 text-rose-300'
                                : 'border-slate-900 bg-slate-950/60 text-slate-500'
                        }`}>
                          {saveStatus === 'saving' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
                        </div>
                        
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this note?')) {
                              await handleDeleteActiveNote();
                              const remaining = (activeTopic?.topicNotes || []).filter(n => n.id !== activeNote.noteId);
                              if (remaining.length > 0) {
                                void handleSelectNote(remaining[0]);
                              } else {
                                setActiveNote(null);
                                setNoteOriginal(null);
                              }
                            }
                          }}
                          className="rounded border border-rose-950/40 bg-rose-950/20 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.15em] text-rose-400 transition-colors hover:bg-rose-900/40 hover:border-rose-800 cursor-pointer"
                          title="Delete note"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Editor Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-900 bg-slate-950/40 px-4 py-2 shrink-0">
                      
                      {/* Font Family Selector */}
                      <select
                        value={activeFormat.fontName}
                        onChange={(e) => applyEditorCommand('fontName', e.target.value)}
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 outline-none cursor-pointer"
                        title="Font Family"
                      >
                        {FONTS.map(f => (
                          <option key={f.value} value={f.value}>{f.name}</option>
                        ))}
                      </select>

                      {/* Font Size Selector */}
                      <select
                        value={activeFormat.fontSize}
                        onChange={(e) => applyEditorCommand('fontSize', e.target.value)}
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 outline-none cursor-pointer"
                        title="Font Size"
                      >
                        {FONT_SIZES.map(s => (
                          <option key={s.value} value={s.value}>{s.name}</option>
                        ))}
                      </select>

                      {/* Heading Selector */}
                      <select
                        value={activeFormat.heading}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'p') {
                            applyEditorCommand('formatBlock', '<p>');
                          } else {
                            applyEditorCommand('formatBlock', `<${val}>`);
                          }
                        }}
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 outline-none cursor-pointer"
                        title="Text Format"
                      >
                        {HEADINGS.map(h => (
                          <option key={h.value} value={h.value}>{h.name}</option>
                        ))}
                      </select>

                      <div className="mx-1 h-5 w-px bg-slate-850" />

                      {/* Formatting buttons */}
                      <button
                        type="button"
                        onClick={() => applyEditorCommand('bold')}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.bold ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditorCommand('italic')}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.italic ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditorCommand('underline')}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.underline ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Underline (Ctrl+U)"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="mx-1 h-5 w-px bg-slate-850" />

                      {/* Lists */}
                      <button
                        type="button"
                        onClick={() => applyEditorCommand('insertUnorderedList')}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.heading === 'ul' ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditorCommand('insertOrderedList')}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.heading === 'ol' ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Numbered List"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>

                      <div className="mx-1 h-5 w-px bg-slate-850" />

                      {/* Blockquote */}
                      <button
                        type="button"
                        onClick={toggleBlockQuote}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${activeFormat.heading === 'blockquote' ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300'}`}
                        title="Quote Block"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>

                      {/* Link */}
                      <button
                        type="button"
                        onClick={handleCreateLink}
                        className="p-1.5 rounded border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Insert Hyperlink"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>

                      {/* Code block */}
                      <button
                        type="button"
                        onClick={handleCodeFormatting}
                        className="p-1.5 rounded border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Code Snippet"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>

                      {/* Image upload button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-cyan-500 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Insert Image"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>

                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Scrollable Editor Area */}
                    <div 
                      onClick={handleEditorClick}
                      className="flex-1 overflow-y-auto px-6 py-6 bg-slate-950/20"
                    >
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onPaste={handlePaste}
                        onInput={syncEditorContent}
                        onBlur={syncEditorContent}
                        onKeyDown={handleKeyDown}
                        onKeyUp={syncEditorContent}
                        onMouseUp={syncEditorContent}
                        className="rich-editor w-full min-h-full text-[15px] leading-[1.65] text-slate-100 outline-none pb-24"
                      />
                    </div>

                  </div>
                ) : (
                  /* Empty state on Right Pane */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/10">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-cyan-500/30" />
                    </div>
                    <h3 className="text-slate-200 font-mono text-xs uppercase tracking-[0.2em] font-semibold mb-2">No note selected</h3>
                    <p className="text-slate-500 text-xs max-w-sm mb-6 leading-relaxed">
                      Choose an existing note from the sidebar, or create a new note to start documenting your concept notes, code snippets, and master strategies.
                    </p>
                    <button
                      onClick={handleCreateNewNoteInModal}
                      className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)] cursor-pointer"
                    >
                      + Create first note
                    </button>
                  </div>
                )}
              </div>

            </div>

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
