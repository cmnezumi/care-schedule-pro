import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Memo } from '@/types';
import { 
    Search, 
    Plus, 
    Pin, 
    Trash2, 
    Copy, 
    Check, 
    ChevronLeft, 
    FileText, 
    Clock, 
    Bold, 
    Highlighter, 
    RotateCcw
} from 'lucide-react';

export default function MemoBoard() {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [copied, setCopied] = useState(false);

    // Mobile: 'list' | 'detail'
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

    // Debounce timer for auto-save
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Helper: strip HTML to get plain text for preview and word count
    const stripHtml = (html: string) => {
        if (!html) return '';
        return html
            .replace(/<style[^>]*>.*<\/style>/gm, '')
            .replace(/<[^>]+>/gm, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Helper: convert plain text with \n to HTML if needed
    const formatToHtml = (content: string) => {
        if (!content) return '';
        if (content.includes('<') && content.includes('>')) {
            return content;
        }
        return content.replace(/\n/g, '<br>');
    };

    // Fetch memos on mount
    useEffect(() => {
        let isMounted = true;
        const fetchMemos = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/memos');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && Array.isArray(data)) {
                        setMemos(data);
                        if (data.length > 0) {
                            setSelectedMemoId(data[0].id);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load memos:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchMemos();
        return () => { isMounted = false; };
    }, []);

    // Currently selected memo
    const selectedMemo = useMemo(() => {
        return memos.find(m => m.id === selectedMemoId) || null;
    }, [memos, selectedMemoId]);

    // When selected memo changes, update editor innerHTML directly
    useEffect(() => {
        if (editorRef.current && selectedMemo) {
            const htmlContent = formatToHtml(selectedMemo.content);
            if (editorRef.current.innerHTML !== htmlContent) {
                editorRef.current.innerHTML = htmlContent;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMemoId]);

    // Save memos to server
    const persistMemos = async (memosToSave: Memo[]) => {
        try {
            setSaveStatus('saving');
            const res = await fetch('/api/memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memos: memosToSave }),
            });
            if (res.ok) {
                setSaveStatus('saved');
            } else {
                setSaveStatus('unsaved');
            }
        } catch (err) {
            console.error('Failed to save memos:', err);
            setSaveStatus('unsaved');
        }
    };

    // Trigger auto-save whenever memos change
    const triggerAutoSave = (updatedMemos: Memo[]) => {
        setSaveStatus('saving');
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
            persistMemos(updatedMemos);
        }, 800);
    };

    // Create a new memo
    const handleCreateMemo = () => {
        const newId = `memo-${Date.now()}`;
        const newMemo: Memo = {
            id: newId,
            title: '',
            content: '',
            isPinned: false,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        const updated = [newMemo, ...memos];
        setMemos(updated);
        setSelectedMemoId(newId);
        setMobileView('detail');
        triggerAutoSave(updated);

        // Clear editor DOM
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
    };

    // Update active memo title
    const handleUpdateTitle = (title: string) => {
        if (!selectedMemoId) return;
        const updated = memos.map(m => {
            if (m.id === selectedMemoId) {
                return {
                    ...m,
                    title,
                    updatedAt: new Date().toISOString(),
                };
            }
            return m;
        });
        setMemos(updated);
        triggerAutoSave(updated);
    };

    // Handle editor HTML input
    const handleEditorInput = () => {
        if (!selectedMemoId || !editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;

        const updated = memos.map(m => {
            if (m.id === selectedMemoId) {
                return {
                    ...m,
                    content: currentHtml,
                    updatedAt: new Date().toISOString(),
                };
            }
            return m;
        });
        setMemos(updated);
        triggerAutoSave(updated);
    };

    // Formatting Commands (Bold, Red text, Highlight, Clear)
    const applyFormat = (command: string, value: string | undefined = undefined) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, value);
        handleEditorInput();
    };

    const handleApplyBold = (e: React.MouseEvent) => {
        e.preventDefault();
        applyFormat('bold');
    };

    const handleApplyRed = (e: React.MouseEvent) => {
        e.preventDefault();
        // Check current text color or apply red
        applyFormat('foreColor', '#ef4444');
    };

    const handleApplyHighlight = (e: React.MouseEvent) => {
        e.preventDefault();
        applyFormat('hiliteColor', '#fef08a');
    };

    const handleClearFormat = (e: React.MouseEvent) => {
        e.preventDefault();
        applyFormat('removeFormat');
        applyFormat('foreColor', '#1e293b');
    };

    // Toggle Pin status
    const handleTogglePin = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const updated = memos.map(m => {
            if (m.id === id) {
                return { ...m, isPinned: !m.isPinned, updatedAt: new Date().toISOString() };
            }
            return m;
        });
        setMemos(updated);
        triggerAutoSave(updated);
    };

    // Delete a memo
    const handleDeleteMemo = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('このメモを削除してもよろしいですか？')) return;

        const updated = memos.filter(m => m.id !== id);
        setMemos(updated);
        triggerAutoSave(updated);

        if (selectedMemoId === id) {
            if (updated.length > 0) {
                setSelectedMemoId(updated[0].id);
            } else {
                setSelectedMemoId(null);
            }
            setMobileView('list');
        }
    };

    // Copy memo text to clipboard (as plain text)
    const handleCopyContent = () => {
        if (!selectedMemo) return;
        const plainBody = stripHtml(selectedMemo.content);
        const textToCopy = `${selectedMemo.title ? selectedMemo.title + '\n\n' : ''}${plainBody}`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filter and sort memos
    const filteredMemos = useMemo(() => {
        return memos
            .filter(m => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const matchTitle = m.title.toLowerCase().includes(q);
                const plainBody = stripHtml(m.content).toLowerCase();
                const matchContent = plainBody.includes(q);
                return matchTitle || matchContent;
            })
            .sort((a, b) => {
                // Pinned first
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // Then by updatedAt desc
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
    }, [memos, searchQuery]);

    // Format date display
    const formatDate = (isoString: string) => {
        try {
            const d = new Date(isoString);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();
            if (isToday) {
                return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            }
            return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
            return '';
        }
    };

    return (
        <div className="flex h-[calc(100dvh-130px)] md:h-[calc(100dvh-180px)] min-h-[450px] w-full rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
            {/* LEFT PANE: MEMO LIST (hidden on mobile if in detail view) */}
            <div className={`flex flex-col border-r border-slate-200 bg-slate-50/70 transition-all ${
                mobileView === 'detail' ? 'hidden md:flex md:w-[320px] lg:w-[360px]' : 'w-full md:w-[320px] lg:w-[360px]'
            }`}>
                {/* Header with Title and New Note Button */}
                <div className="p-3.5 md:p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-sm md:text-base leading-tight">メモ帳</h2>
                            <p className="text-[10px] text-slate-400 font-medium">{filteredMemos.length} 件</p>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateMemo}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={15} />
                        <span>新規メモ</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-2.5 md:p-3 border-b border-slate-200/60 bg-white/50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="メモを検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* Memo Cards List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5 md:p-2 space-y-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                            <Clock className="animate-spin" size={18} />
                            <span>メモを読み込み中...</span>
                        </div>
                    ) : filteredMemos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs text-center p-4">
                            <FileText size={28} className="text-slate-300 mb-2" />
                            <p className="font-bold text-slate-600">メモがありません</p>
                            <p className="text-[11px] text-slate-400 mt-1">「新規メモ」ボタンから作成できます</p>
                        </div>
                    ) : (
                        filteredMemos.map(memo => {
                            const isSelected = memo.id === selectedMemoId;
                            const plainBody = stripHtml(memo.content);
                            const firstLine = memo.title || plainBody.split('\n')[0] || '無題のメモ';
                            const preview = plainBody.replace(memo.title, '').trim() || '本文なし';

                            return (
                                <div
                                    key={memo.id}
                                    onClick={() => {
                                        setSelectedMemoId(memo.id);
                                        setMobileView('detail');
                                    }}
                                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                                        isSelected
                                            ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-300/40'
                                            : 'bg-white/80 hover:bg-white border-transparent hover:border-slate-200/70 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-1.5 mb-1">
                                        <h3 className={`font-bold text-xs md:text-sm line-clamp-1 leading-snug ${
                                            memo.title ? 'text-slate-800' : 'text-slate-400 italic'
                                        }`}>
                                            {firstLine}
                                        </h3>
                                        {memo.isPinned && (
                                            <Pin size={13} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                                        )}
                                    </div>

                                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                                        {preview}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                                        <span>{formatDate(memo.updatedAt)}</span>
                                        <span>{plainBody.length} 文字</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* RIGHT PANE: MEMO EDITOR (hidden on mobile if in list view) */}
            <div className={`flex flex-col flex-1 bg-white h-full transition-all ${
                mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}>
                {selectedMemo ? (
                    <>
                        {/* Editor Action Bar & Formatting Toolbar */}
                        <div className="px-3 md:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                            {/* Left: Mobile Back, Pin, and Rich Text Formatting Tools */}
                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => setMobileView('list')}
                                    className="md:hidden flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                    <span>一覧</span>
                                </button>

                                {/* Pin Button */}
                                <button
                                    onClick={(e) => handleTogglePin(selectedMemo.id, e)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                        selectedMemo.isPinned
                                            ? 'bg-amber-50 text-amber-600 border-amber-300'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title="ピン留め"
                                >
                                    <Pin size={13} className={selectedMemo.isPinned ? 'fill-amber-500' : ''} />
                                    <span className="hidden sm:inline">{selectedMemo.isPinned ? '固定中' : '固定'}</span>
                                </button>

                                <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

                                {/* FORMATTING BUTTONS */}
                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                    {/* Bold Button */}
                                    <button
                                        onMouseDown={handleApplyBold}
                                        type="button"
                                        className="flex items-center justify-center h-7 px-2 rounded hover:bg-slate-100 text-slate-700 active:bg-slate-200 font-extrabold text-xs transition-colors"
                                        title="太字（選択した文字を太字にする）"
                                    >
                                        <Bold size={14} className="stroke-[2.5]" />
                                        <span className="ml-1 text-[11px] hidden sm:inline">太字</span>
                                    </button>

                                    {/* Red Text Button */}
                                    <button
                                        onMouseDown={handleApplyRed}
                                        type="button"
                                        className="flex items-center justify-center h-7 px-2 rounded hover:bg-red-50 text-red-600 active:bg-red-100 font-bold text-xs transition-colors"
                                        title="赤字（選択した文字を赤色にする）"
                                    >
                                        <span className="font-extrabold text-xs border-b-2 border-red-500 leading-none pb-0.5">A</span>
                                        <span className="ml-1 text-[11px] text-red-600 hidden sm:inline">赤字</span>
                                    </button>

                                    {/* Highlight Button */}
                                    <button
                                        onMouseDown={handleApplyHighlight}
                                        type="button"
                                        className="flex items-center justify-center h-7 px-2 rounded hover:bg-amber-50 text-amber-700 active:bg-amber-100 font-bold text-xs transition-colors"
                                        title="黄色マーカー（選択した文字を強調）"
                                    >
                                        <Highlighter size={13} className="text-amber-500" />
                                        <span className="ml-1 text-[11px] hidden sm:inline">蛍光</span>
                                    </button>

                                    {/* Clear Formatting Button */}
                                    <button
                                        onMouseDown={handleClearFormat}
                                        type="button"
                                        className="flex items-center justify-center h-7 px-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                        title="書式を解除して標準色に戻す"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Right: Save Status, Copy, Delete */}
                            <div className="flex items-center gap-1.5 md:gap-2">
                                {/* Save Status Indicator */}
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mr-1">
                                    {saveStatus === 'saving' && (
                                        <>
                                            <Clock size={12} className="animate-spin text-amber-500" />
                                            <span className="hidden sm:inline text-amber-500">保存中...</span>
                                        </>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <>
                                            <Check size={12} className="text-emerald-500" />
                                            <span className="hidden sm:inline text-emerald-600">保存済み</span>
                                        </>
                                    )}
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopyContent}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    title="本文をコピー"
                                >
                                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    <span className="hidden sm:inline">{copied ? 'コピー完了' : 'コピー'}</span>
                                </button>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDeleteMemo(selectedMemo.id, e)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold transition-all"
                                    title="削除"
                                >
                                    <Trash2 size={13} />
                                    <span className="hidden sm:inline">削除</span>
                                </button>
                            </div>
                        </div>

                        {/* Title & Body Inputs */}
                        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                            {/* Title Input */}
                            <input
                                type="text"
                                placeholder="タイトルを入力..."
                                value={selectedMemo.title}
                                onChange={(e) => handleUpdateTitle(e.target.value)}
                                className="w-full text-lg md:text-2xl font-bold text-slate-800 placeholder-slate-300 border-none focus:outline-none focus:ring-0 mb-2 bg-transparent"
                            />

                            {/* Date & Word Count */}
                            <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 pb-2 border-b border-slate-100">
                                <span>最終更新: {new Date(selectedMemo.updatedAt).toLocaleString('ja-JP')}</span>
                                <span>•</span>
                                <span>{stripHtml(selectedMemo.content).length} 文字</span>
                            </div>

                            {/* Rich Text Editable Content Area */}
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={handleEditorInput}
                                data-placeholder="メモの内容を入力してください...&#10;&#10;文字を選択して上のツールバーから「太字」「赤字」「蛍光」で強調できます。"
                                className="w-full flex-1 outline-none text-sm md:text-base text-slate-800 leading-relaxed min-h-[300px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 empty:before:whitespace-pre-wrap select-text focus:ring-0"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="font-bold text-base text-slate-700 mb-1">メモが選択されていません</h3>
                        <p className="text-xs text-slate-400 max-w-sm mb-4">
                            左の一覧からメモを選択するか、新規メモを作成して記録を始めましょう。
                        </p>
                        <button
                            onClick={handleCreateMemo}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                        >
                            <Plus size={16} />
                            <span>新しいメモを作成</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
