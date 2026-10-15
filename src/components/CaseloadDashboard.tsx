"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CareManager, CaseloadData, CaseloadEvent, CareManagerBaseline } from '@/types';
import { calculateCaseloadAtDate, calculateMonthlyTrends, CaseloadSummary } from '@/lib/caseload';
import { Calendar, Users, Plus, CheckCircle2, AlertCircle, Clock, MapPin, Edit3, Trash2, ChevronRight, TrendingUp, Settings } from 'lucide-react';

interface CaseloadDashboardProps {
    careManagers: CareManager[];
    selectedCareManagerId: string;
}

const DEFAULT_BASELINE: CareManagerBaseline = {
    care1to5: 0,
    support1to2: 0,
    tenouda: 0,
    suwa: 0,
    home: 0
};

export default function CaseloadDashboard({ careManagers }: CaseloadDashboardProps) {
    const [caseloadData, setCaseloadData] = useState<CaseloadData>({
        baseline202609: {
            cm1: { ...DEFAULT_BASELINE },
            cm2: { ...DEFAULT_BASELINE },
            cm3: { ...DEFAULT_BASELINE },
        },
        events: []
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 選択された日付（デフォルトは本日）
    const getTodayStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

    // モーダル管理
    const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [selectedPendingEvent, setSelectedPendingEvent] = useState<CaseloadEvent | null>(null);

    // 基準値フォームstate
    const [tempBaseline, setTempBaseline] = useState<CaseloadData['baseline202609']>({
        cm1: { ...DEFAULT_BASELINE },
        cm2: { ...DEFAULT_BASELINE },
        cm3: { ...DEFAULT_BASELINE },
    });

    // 新規イベント登録フォームstate
    const [newEvent, setNewEvent] = useState<{
        careManagerId: string;
        type: 'new' | 'end' | 'change_applied';
        date: string;
        clientName: string;
        location: 'tenouda' | 'suwa' | 'home';
        careLevelType: 'care' | 'support';
        notes: string;
    }>({
        careManagerId: careManagers[0]?.id || 'cm1',
        type: 'new',
        date: getTodayStr(),
        clientName: '',
        location: 'home',
        careLevelType: 'care',
        notes: ''
    });

    // 区分変更結果登録フォームstate
    const [resolveData, setResolveData] = useState<{
        resolvedDate: string;
        targetCareLevelType: 'care' | 'support';
    }>({
        resolvedDate: getTodayStr(),
        targetCareLevelType: 'care'
    });

    // データの読み込み
    const loadCaseload = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/caseload');
            if (res.ok) {
                const data: CaseloadData = await res.json();
                setCaseloadData(data);
                if (data.baseline202609) {
                    setTempBaseline(data.baseline202609);
                }
            }
        } catch (err) {
            console.error('Failed to load caseload:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCaseload();
    }, []);

    // データの保存ヘルパー
    const saveCaseload = async (newData: CaseloadData) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/caseload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (res.ok) {
                setCaseloadData(newData);
            } else {
                alert('保存中にエラーが発生しました');
            }
        } catch (e) {
            console.error('Save error:', e);
            alert('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    // 指定日時点の集計
    const summary: CaseloadSummary = useMemo(() => {
        return calculateCaseloadAtDate(caseloadData, careManagers, selectedDate);
    }, [caseloadData, careManagers, selectedDate]);

    // 9月からの月別推移（6ヶ月分）
    const trends = useMemo(() => {
        return calculateMonthlyTrends(caseloadData, careManagers, '2026-09', 6);
    }, [caseloadData, careManagers]);

    // 現在、区分変更中（結果待ち）の利用者一覧
    const pendingChanges = useMemo(() => {
        return (caseloadData.events || []).filter(e => {
            return e.type === 'change_applied' && e.status !== 'resolved';
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [caseloadData.events]);

    // 基準値保存ハンドラー
    const handleSaveBaseline = async () => {
        const updated: CaseloadData = {
            ...caseloadData,
            baseline202609: tempBaseline
        };
        await saveCaseload(updated);
        setIsBaselineModalOpen(false);
    };

    // 新規イベント登録ハンドラー
    const handleCreateEvent = async () => {
        if (!newEvent.clientName.trim()) {
            alert('利用者名を入力してください');
            return;
        }

        const newId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const createdEvent: CaseloadEvent = {
            id: newId,
            careManagerId: newEvent.careManagerId,
            type: newEvent.type,
            date: newEvent.date,
            clientName: newEvent.clientName.trim(),
            location: newEvent.location,
            careLevelType: newEvent.careLevelType,
            status: newEvent.type === 'change_applied' ? 'pending' : undefined,
            notes: newEvent.notes,
            createdAt: new Date().toISOString()
        };

        const updated: CaseloadData = {
            ...caseloadData,
            events: [createdEvent, ...(caseloadData.events || [])]
        };

        await saveCaseload(updated);
        setIsEventModalOpen(false);
        setNewEvent({
            careManagerId: careManagers[0]?.id || 'cm1',
            type: 'new',
            date: selectedDate,
            clientName: '',
            location: 'home',
            careLevelType: 'care',
            notes: ''
        });
    };

    // 区分変更の結果確定ハンドラー
    const handleResolveChange = async () => {
        if (!selectedPendingEvent) return;

        const updatedEvents = caseloadData.events.map(e => {
            if (e.id === selectedPendingEvent.id) {
                return {
                    ...e,
                    status: 'resolved' as const,
                    resolvedDate: resolveData.resolvedDate,
                    targetCareLevelType: resolveData.targetCareLevelType
                };
            }
            return e;
        });

        const updated: CaseloadData = {
            ...caseloadData,
            events: updatedEvents
        };

        await saveCaseload(updated);
        setIsResolveModalOpen(false);
        setSelectedPendingEvent(null);
    };

    // イベント削除ハンドラー
    const handleDeleteEvent = async (id: string) => {
        if (!confirm('この登録を削除してもよろしいですか？')) return;
        const updated: CaseloadData = {
            ...caseloadData,
            events: caseloadData.events.filter(e => e.id !== id)
        };
        await saveCaseload(updated);
    };

    const locationName = (loc: string) => {
        if (loc === 'tenouda') return '天王田';
        if (loc === 'suwa') return '諏訪';
        return '在宅';
    };

    const locationBadgeColor = (loc: string) => {
        if (loc === 'tenouda') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (loc === 'suwa') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center p-8 bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                <span className="ml-3 text-slate-500 font-bold text-sm">担当件数データを読み込み中...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-100/60 overflow-y-auto p-2 md:p-6 space-y-4 md:space-y-6">
            
            {/* Top Header & Controls */}
            <div className="bg-white rounded-2xl p-3 md:p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Date Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Calendar size={16} className="text-sky-600" />
                        <span className="text-xs font-bold text-slate-600">基準日:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={() => setSelectedDate(getTodayStr())}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 transition-colors"
                    >
                        本日
                    </button>
                    <span className="text-xs text-slate-400 font-medium ml-1">
                        ※指定した日の担当数がリアルタイムに集計されます
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end flex-wrap">
                    <button
                        onClick={() => {
                            setTempBaseline(caseloadData.baseline202609 || {
                                cm1: { ...DEFAULT_BASELINE },
                                cm2: { ...DEFAULT_BASELINE },
                                cm3: { ...DEFAULT_BASELINE },
                            });
                            setIsBaselineModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
                    >
                        <Settings size={14} />
                        <span>9月基準件数の設定</span>
                    </button>
                    <button
                        onClick={() => {
                            setNewEvent(prev => ({ ...prev, date: selectedDate }));
                            setIsEventModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-sky-200"
                    >
                        <Plus size={15} strokeWidth={3} />
                        <span>変動を登録（新規・終了・区変）</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards: 3 Care Managers + Grand Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {careManagers.map((cm) => {
                    const counts = summary.byCareManager[cm.id] || {
                        care1to5: 0,
                        support1to2: 0,
                        changing: 0,
                        total: 0,
                        tenouda: 0,
                        suwa: 0,
                        home: 0,
                        totalLocation: 0
                    };

                    return (
                        <div key={cm.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/90 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                        {cm.name.slice(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">{cm.name}</h3>
                                        <span className="text-[10px] text-slate-400 font-medium">担当ケアマネ</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">合計件数</span>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">{counts.total}<span className="text-xs font-normal text-slate-500 ml-0.5">件</span></span>
                                </div>
                            </div>

                            {/* Care Level Breakdown */}
                            <div className="space-y-2 mb-4 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        要介護 (1〜5)
                                    </span>
                                    <span className="font-black text-slate-800 text-sm">{counts.care1to5} <span className="text-[10px] font-normal text-slate-400">件</span></span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                        要支援 (1〜2)
                                    </span>
                                    <span className="font-black text-slate-800 text-sm">{counts.support1to2} <span className="text-[10px] font-normal text-slate-400">件</span></span>
                                </div>
                                {counts.changing > 0 && (
                                    <div className="flex items-center justify-between text-xs bg-amber-50 p-1 rounded-lg border border-amber-200 text-amber-800">
                                        <span className="font-bold flex items-center gap-1">
                                            <Clock size={12} className="text-amber-600" />
                                            区分変更中
                                        </span>
                                        <span className="font-black text-amber-900 text-sm">{counts.changing} <span className="text-[10px] font-normal text-amber-600">件</span></span>
                                    </div>
                                )}
                            </div>

                            {/* Location Breakdown */}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">拠点・場所別内訳</span>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-1.5">
                                        <span className="block text-[10px] font-bold text-purple-700">天王田</span>
                                        <span className="text-xs font-black text-purple-900">{counts.tenouda}</span>
                                    </div>
                                    <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-1.5">
                                        <span className="block text-[10px] font-bold text-amber-700">諏訪</span>
                                        <span className="text-xs font-black text-amber-900">{counts.suwa}</span>
                                    </div>
                                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-1.5">
                                        <span className="block text-[10px] font-bold text-emerald-700">在宅</span>
                                        <span className="text-xs font-black text-emerald-900">{counts.home}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Grand Total Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-700 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                                    全
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">事業所全体</h3>
                                    <span className="text-[10px] text-slate-400 font-medium">3名合計</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">総担当件数</span>
                                <span className="text-2xl font-black text-sky-400 tracking-tight">{summary.total.total}<span className="text-xs font-normal text-slate-300 ml-0.5">件</span></span>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2 mb-4 bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">要介護:</span>
                                <span className="font-bold text-white">{summary.total.care1to5} 件</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">要支援:</span>
                                <span className="font-bold text-white">{summary.total.support1to2} 件</span>
                            </div>
                            {summary.total.changing > 0 && (
                                <div className="flex items-center justify-between text-amber-300 font-bold">
                                    <span>⏳ 区分変更中:</span>
                                    <span>{summary.total.changing} 件</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Locations */}
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">全拠点合計</span>
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="bg-white/10 rounded-lg p-1.5">
                                <span className="block text-[10px] text-purple-300 font-bold">天王田</span>
                                <span className="text-xs font-black text-white">{summary.total.tenouda}</span>
                            </div>
                            <div className="bg-white/10 rounded-lg p-1.5">
                                <span className="block text-[10px] text-amber-300 font-bold">諏訪</span>
                                <span className="text-xs font-black text-white">{summary.total.suwa}</span>
                            </div>
                            <div className="bg-white/10 rounded-lg p-1.5">
                                <span className="block text-[10px] text-emerald-300 font-bold">在宅</span>
                                <span className="text-xs font-black text-white">{summary.total.home}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending 区分変更 Tracking Section */}
            {pendingChanges.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-amber-600" />
                            <h3 className="font-bold text-sm text-amber-950">
                                区分変更申請中（結果待ち）の利用者一覧 ({pendingChanges.length}件)
                            </h3>
                        </div>
                        <span className="text-xs text-amber-700 font-medium">結果が出たら「結果を入力」で新介護度を反映できます</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {pendingChanges.map(evt => {
                            const cm = careManagers.find(c => c.id === evt.careManagerId);
                            return (
                                <div key={evt.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${locationBadgeColor(evt.location)}`}>
                                                {locationName(evt.location)}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800 truncate">
                                                {evt.clientName} 様
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 space-x-2">
                                            <span>申請日: {evt.date}</span>
                                            <span>(担当: {cm?.name || evt.careManagerId})</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPendingEvent(evt);
                                            setResolveData({
                                                resolvedDate: selectedDate,
                                                targetCareLevelType: 'care'
                                            });
                                            setIsResolveModalOpen(true);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap transition-all"
                                    >
                                        結果を入力
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Monthly Trend Table (2026年9月〜) */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-sky-600" />
                        <h3 className="font-bold text-sm text-slate-800">2026年9月からの担当件数推移（月末時点）</h3>
                    </div>
                    <span className="text-xs text-slate-400">9月基準件数＋変動の累積計算</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <th className="p-2.5">年月</th>
                                {careManagers.map(cm => (
                                    <th key={cm.id} className="p-2.5 text-center border-l border-slate-100">
                                        {cm.name}
                                    </th>
                                ))}
                                <th className="p-2.5 text-center bg-sky-50/50 text-sky-900 border-l border-sky-100">事業所合計</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trends.map(t => (
                                <tr key={t.monthStr} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-2.5 font-bold text-slate-700 whitespace-nowrap">{t.label}</td>
                                    {careManagers.map(cm => {
                                        const c = t.byCareManager[cm.id] || { total: 0, care1to5: 0, support1to2: 0, changing: 0 };
                                        return (
                                            <td key={cm.id} className="p-2.5 text-center border-l border-slate-100">
                                                <span className="font-bold text-slate-800 text-sm">{c.total}</span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    (介{c.care1to5} / 支{c.support1to2}{c.changing > 0 ? ` / 区${c.changing}` : ''})
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2.5 text-center bg-sky-50/30 border-l border-sky-100">
                                        <span className="font-black text-sky-800 text-sm">{t.total.total} 件</span>
                                        <span className="text-[10px] text-sky-600 block">
                                            (介{t.total.care1to5} / 支{t.total.support1to2})
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Event Timeline / History */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-slate-800">9月以降の登録履歴一覧</h3>
                    <span className="text-xs text-slate-400">計 {(caseloadData.events || []).length} 件の変動履歴</span>
                </div>

                {(caseloadData.events || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl">
                        まだ登録された変動はありません。「変動を登録」から追加してください。
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {(caseloadData.events || []).map(e => {
                            const cm = careManagers.find(c => c.id === e.careManagerId);
                            let typeBadge = <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">新規開始</span>;
                            if (e.type === 'end') typeBadge = <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">終了</span>;
                            if (e.type === 'change_applied') {
                                typeBadge = e.status === 'resolved'
                                    ? <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">区変確定済</span>
                                    : <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">区変申請中</span>;
                            }

                            return (
                                <div key={e.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <span className="font-bold text-slate-500 whitespace-nowrap">{e.date}</span>
                                        {typeBadge}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${locationBadgeColor(e.location)}`}>
                                            {locationName(e.location)}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate">{e.clientName} 様</span>
                                        <span className="text-slate-400 text-[11px]">
                                            ({cm?.name || e.careManagerId} / {e.careLevelType === 'care' ? '要介護' : '要支援'})
                                        </span>
                                        {e.notes && <span className="text-slate-400 text-[10px]">({e.notes})</span>}
                                    </div>

                                    <button
                                        onClick={() => handleDeleteEvent(e.id)}
                                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                        title="削除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal 1: 9月基準件数設定モーダル */}
            {isBaselineModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-base text-slate-800">2026年9月 基準件数の設定</h3>
                                <p className="text-xs text-slate-500">9月時点でお持ちだった件数を入力してください（以降の推移の起点になります）</p>
                            </div>
                            <button onClick={() => setIsBaselineModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-6">
                            {careManagers.map(cm => {
                                const current = tempBaseline[cm.id] || { ...DEFAULT_BASELINE };
                                const updateField = (field: keyof CareManagerBaseline, val: number) => {
                                    setTempBaseline({
                                        ...tempBaseline,
                                        [cm.id]: {
                                            ...current,
                                            [field]: val
                                        }
                                    });
                                };

                                return (
                                    <div key={cm.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                                            {cm.name} の9月基準件数
                                        </h4>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">要介護 (1〜5)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={current.care1to5}
                                                    onChange={(e) => updateField('care1to5', Math.max(0, parseInt(e.target.value) || 0))}
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">要支援 (1〜2)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={current.support1to2}
                                                    onChange={(e) => updateField('support1to2', Math.max(0, parseInt(e.target.value) || 0))}
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-purple-700 mb-1">天王田</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={current.tenouda}
                                                    onChange={(e) => updateField('tenouda', Math.max(0, parseInt(e.target.value) || 0))}
                                                    className="w-full p-2 border border-purple-200 rounded-lg text-sm font-bold bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-amber-700 mb-1">諏訪</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={current.suwa}
                                                    onChange={(e) => updateField('suwa', Math.max(0, parseInt(e.target.value) || 0))}
                                                    className="w-full p-2 border border-amber-200 rounded-lg text-sm font-bold bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-emerald-700 mb-1">在宅</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={current.home}
                                                    onChange={(e) => updateField('home', Math.max(0, parseInt(e.target.value) || 0))}
                                                    className="w-full p-2 border border-emerald-200 rounded-lg text-sm font-bold bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setIsBaselineModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveBaseline}
                                disabled={isSaving}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                                {isSaving ? '保存中...' : '基準件数を保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: 変動登録モーダル（新規・終了・区変申請） */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-base text-slate-800">担当の変動を登録</h3>
                            <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* 種別 */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">変動の種別</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, type: 'new' })}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                            newEvent.type === 'new'
                                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        ＋ 新規担当
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, type: 'end' })}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                            newEvent.type === 'end'
                                                ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        − 担当終了
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, type: 'change_applied' })}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                            newEvent.type === 'change_applied'
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        ⏳ 区分変更申請
                                    </button>
                                </div>
                            </div>

                            {/* 日付 & 担当ケアマネ */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {newEvent.type === 'new' ? '開始日' : newEvent.type === 'end' ? '終了日' : '申請日'}
                                    </label>
                                    <input
                                        type="date"
                                        value={newEvent.date}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-xl text-sm font-bold bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">担当ケアマネ</label>
                                    <select
                                        value={newEvent.careManagerId}
                                        onChange={(e) => setNewEvent({ ...newEvent, careManagerId: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-xl text-sm font-bold bg-white"
                                    >
                                        {careManagers.map(cm => (
                                            <option key={cm.id} value={cm.id}>{cm.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 利用者名 */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">利用者名</label>
                                <input
                                    type="text"
                                    placeholder="例: 山田 太郎"
                                    value={newEvent.clientName}
                                    onChange={(e) => setNewEvent({ ...newEvent, clientName: e.target.value })}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                                />
                            </div>

                            {/* 介護度 & 場所 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {newEvent.type === 'change_applied' ? '申請前の介護度' : '介護度'}
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewEvent({ ...newEvent, careLevelType: 'care' })}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                                                newEvent.careLevelType === 'care'
                                                    ? 'bg-blue-500 text-white border-blue-600'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            要介護 (1〜5)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewEvent({ ...newEvent, careLevelType: 'support' })}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                                                newEvent.careLevelType === 'support'
                                                    ? 'bg-teal-500 text-white border-teal-600'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            要支援 (1〜2)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">担当場所（拠点）</label>
                                    <select
                                        value={newEvent.location}
                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value as any })}
                                        className="w-full p-2 border border-slate-300 rounded-xl text-sm font-bold bg-white"
                                    >
                                        <option value="tenouda">天王田</option>
                                        <option value="suwa">諏訪</option>
                                        <option value="home">在宅</option>
                                    </select>
                                </div>
                            </div>

                            {/* メモ */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">メモ（任意）</label>
                                <input
                                    type="text"
                                    placeholder="例: 入院による終了、特養待機など"
                                    value={newEvent.notes}
                                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCreateEvent}
                                disabled={isSaving}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                                {isSaving ? '登録中...' : '登録する'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: 区分変更結果確定モーダル */}
            {isResolveModalOpen && selectedPendingEvent && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-base text-amber-950">区分変更の結果を確定</h3>
                                <p className="text-xs text-amber-700">{selectedPendingEvent.clientName} 様の認定結果</p>
                            </div>
                            <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">結果確定日（認定日）</label>
                                <input
                                    type="date"
                                    value={resolveData.resolvedDate}
                                    onChange={(e) => setResolveData({ ...resolveData, resolvedDate: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-xl text-sm font-bold bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">認定された新区分</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setResolveData({ ...resolveData, targetCareLevelType: 'care' })}
                                        className={`py-3 text-xs font-bold rounded-xl border ${
                                            resolveData.targetCareLevelType === 'care'
                                                ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        要介護 (1〜5)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResolveData({ ...resolveData, targetCareLevelType: 'support' })}
                                        className={`py-3 text-xs font-bold rounded-xl border ${
                                            resolveData.targetCareLevelType === 'support'
                                                ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        要支援 (1〜2)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setIsResolveModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleResolveChange}
                                disabled={isSaving}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                                {isSaving ? '確定中...' : '結果を反映する'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
