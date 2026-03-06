"use client";

import React from 'react';
import { Sparkles, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

const SuggestionFinder = () => {
    const suggestions = [
        {
            id: 1,
            text: '田中様のモニタリング報告書作成',
            type: 'urgent',
            description: '期限まであと2日です。早めの着手をお勧めします。',
            icon: <AlertCircle className="w-4 h-4" />
        },
        {
            id: 2,
            text: '佐藤様のサービス担当者会議調整',
            type: 'normal',
            description: 'カレンダーに空き時間があります。候補日を送付しませんか？',
            icon: <Clock className="w-4 h-4" />
        },
        {
            id: 3,
            text: '11月の実績入力',
            type: 'deadline',
            description: '月末の集計作業です。予定の最終確認をお願いします。',
            icon: <CheckCircle2 className="w-4 h-4" />
        },
    ];

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'urgent': return 'from-rose-50 to-rose-100/50 text-rose-700 border-rose-200 shadow-rose-100/50';
            case 'deadline': return 'from-amber-50 to-amber-100/50 text-amber-700 border-amber-200 shadow-amber-100/50';
            default: return 'from-sky-50 to-sky-100/50 text-sky-700 border-sky-200 shadow-sky-100/50';
        }
    };

    const getIconContainerStyles = (type: string) => {
        switch (type) {
            case 'urgent': return 'bg-rose-500 text-white';
            case 'deadline': return 'bg-amber-500 text-white';
            default: return 'bg-sky-500 text-white';
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-1.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100">
                    <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">AI アシスタント</h3>
            </div>

            <div className="flex-grow overflow-auto pr-2 space-y-3 custom-scrollbar">
                {suggestions.map((item) => (
                    <div
                        key={item.id}
                        className={`group p-4 rounded-2xl border bg-gradient-to-br ${getTypeStyles(item.type)} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer relative overflow-hidden`}
                    >
                        <div className="flex items-start gap-3 relative z-10">
                            <div className={`mt-0.5 p-2 rounded-xl ${getIconContainerStyles(item.type)} shadow-md transition-transform group-hover:rotate-12`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm leading-tight mb-1 truncate">{item.text}</div>
                                <div className="text-[11px] opacity-70 leading-relaxed line-clamp-2 italic">{item.description}</div>
                            </div>
                            <div className="mt-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/20 rounded-full blur-2xl group-hover:bg-white/40 transition-colors" />
                    </div>
                ))}
            </div>

            <button className="mt-4 w-full py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                もっと見る
            </button>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default SuggestionFinder;