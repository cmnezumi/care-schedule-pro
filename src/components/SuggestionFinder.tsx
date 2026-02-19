"use client";

import React from 'react';

const SuggestionFinder = () => {
    const suggestions = [
        { id: 1, text: '田中様のモニタリング報告書作成', type: 'urgent' },
        { id: 2, text: '佐藤様のサービス担当者会議調整', type: 'normal' },
        { id: 3, text: '11月の実績入力', type: 'deadline' },
    ];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'urgent': return 'bg-rose-100 text-rose-600 border-rose-200';
            case 'deadline': return 'bg-amber-100 text-amber-600 border-amber-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto pr-2 space-y-2">
                {suggestions.map((item) => (
                    <div key={item.id} className={`p-3 rounded-lg border text-sm ${getTypeColor(item.type)}`}>
                        {item.text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestionFinder;