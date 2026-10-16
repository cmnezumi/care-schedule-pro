"use client";

import React, { useState } from 'react';
import DraggableModal from './DraggableModal';

interface EditChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (choice: 'single' | 'following' | 'all') => void;
    eventTitle?: string;
}

const EditChoiceModal = ({ isOpen, onClose, onConfirm, eventTitle }: EditChoiceModalProps) => {
    const [choice, setChoice] = useState<'single' | 'following' | 'all'>('single');

    if (!isOpen) return null;

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title="繰り返し予定の変更"
            width="max-w-md"
        >
            <div className="flex flex-col gap-6">
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 italic text-sm text-sky-800">
                    「{eventTitle}」は繰り返し予定です。<br />
                    どの範囲を変更しますか？
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {/* この予定のみ */}
                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
                        <input
                            type="radio"
                            name="editChoice"
                            value="single"
                            checked={choice === 'single'}
                            onChange={() => setChoice('single')}
                            className="w-5 h-5 text-sky-500 focus:ring-sky-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-sky-700">📅 この予定のみ変更</div>
                            <div className="text-xs text-slate-500 mt-0.5">選択した日の予定だけを変更し、他の週は変更しません。</div>
                        </div>
                    </label>

                    {/* この日以降をすべて */}
                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                        <input
                            type="radio"
                            name="editChoice"
                            value="following"
                            checked={choice === 'following'}
                            onChange={() => setChoice('following')}
                            className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-amber-700">⏩ この日以降のすべての予定を変更</div>
                            <div className="text-xs text-slate-500 mt-0.5">過去の記録はそのままで、選択した日以降の予定だけを変更します。</div>
                        </div>
                    </label>

                    {/* シリーズ全体 */}
                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-violet-200 hover:bg-violet-50/30 transition-all group">
                        <input
                            type="radio"
                            name="editChoice"
                            value="all"
                            checked={choice === 'all'}
                            onChange={() => setChoice('all')}
                            className="w-5 h-5 text-violet-500 focus:ring-violet-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-violet-700">🔄 すべての予定を変更</div>
                            <div className="text-xs text-slate-500 mt-0.5">この繰り返し予定のすべてを変更します（過去分も含む）。</div>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end items-center gap-4 pt-2 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onConfirm(choice)}
                        className="px-8 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-lg hover:bg-sky-600 shadow-lg shadow-sky-200 active:transform active:scale-95 transition-all"
                    >
                        変更する
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

export default EditChoiceModal;
