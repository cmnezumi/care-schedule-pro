import { CaseloadData, CaseloadEvent, CareManager, CareManagerBaseline } from '@/types';

export interface CaseloadCount {
    care1to5: number;
    support1to2: number;
    changing: number;
    total: number;
    tenouda: number;
    suwa: number;
    home: number;
    totalLocation: number;
}

export interface CaseloadSummary {
    date: string;
    byCareManager: Record<string, CaseloadCount>;
    total: CaseloadCount;
}

export interface MonthlyTrendItem {
    monthStr: string; // YYYY-MM
    label: string;    // e.g. "2026年9月"
    byCareManager: Record<string, CaseloadCount>;
    total: CaseloadCount;
}

// 任意の日付（YYYY-MM-DD）時点での担当件数を計算
export function calculateCaseloadAtDate(
    data: CaseloadData,
    careManagers: CareManager[],
    targetDateStr: string
): CaseloadSummary {
    // 1. 9月基準値（2026-09-01時点）の初期化
    const cmCounts: Record<string, CaseloadCount> = {};

    careManagers.forEach(cm => {
        const base: CareManagerBaseline = data.baseline202609?.[cm.id] || {
            care1to5: 0,
            support1to2: 0,
            tenouda: 0,
            suwa: 0,
            home: 0
        };

        cmCounts[cm.id] = {
            care1to5: Number(base.care1to5) || 0,
            support1to2: Number(base.support1to2) || 0,
            changing: 0,
            total: 0,
            tenouda: Number(base.tenouda) || 0,
            suwa: Number(base.suwa) || 0,
            home: Number(base.home) || 0,
            totalLocation: 0
        };
    });

    // 2. 2026-09-01 以降で targetDateStr 以前の変動イベントを時系列順に適用
    const validEvents = (data.events || [])
        .filter(e => e.date && e.date <= targetDateStr)
        .sort((a, b) => a.date.localeCompare(b.date));

    validEvents.forEach(evt => {
        const counts = cmCounts[evt.careManagerId];
        if (!counts) return;

        if (evt.type === 'new') {
            // 新規担当
            if (evt.careLevelType === 'care') counts.care1to5++;
            else counts.support1to2++;

            if (evt.location === 'tenouda') counts.tenouda++;
            else if (evt.location === 'suwa') counts.suwa++;
            else if (evt.location === 'home') counts.home++;

        } else if (evt.type === 'end') {
            // 担当終了
            if (evt.careLevelType === 'care') counts.care1to5 = Math.max(0, counts.care1to5 - 1);
            else counts.support1to2 = Math.max(0, counts.support1to2 - 1);

            if (evt.location === 'tenouda') counts.tenouda = Math.max(0, counts.tenouda - 1);
            else if (evt.location === 'suwa') counts.suwa = Math.max(0, counts.suwa - 1);
            else if (evt.location === 'home') counts.home = Math.max(0, counts.home - 1);

        } else if (evt.type === 'change_applied') {
            // 区分変更申請
            const isResolvedNow = evt.status === 'resolved' && evt.resolvedDate && evt.resolvedDate <= targetDateStr;

            if (!isResolvedNow) {
                // 申請中（結果待ち）
                if (evt.careLevelType === 'care') counts.care1to5 = Math.max(0, counts.care1to5 - 1);
                else counts.support1to2 = Math.max(0, counts.support1to2 - 1);
                counts.changing++;
            } else {
                // targetDateStr 時点で既に結果確定済み
                // 元の介護度から引いて、新介護度に足す
                if (evt.careLevelType === 'care') counts.care1to5 = Math.max(0, counts.care1to5 - 1);
                else counts.support1to2 = Math.max(0, counts.support1to2 - 1);

                const newType = evt.targetCareLevelType || evt.careLevelType;
                if (newType === 'care') counts.care1to5++;
                else counts.support1to2++;
            }
        }
    });

    // 3. 各ケアマネの合計、および事業所全体の合計を計算
    const grandTotal: CaseloadCount = {
        care1to5: 0,
        support1to2: 0,
        changing: 0,
        total: 0,
        tenouda: 0,
        suwa: 0,
        home: 0,
        totalLocation: 0
    };

    careManagers.forEach(cm => {
        const c = cmCounts[cm.id];
        c.total = c.care1to5 + c.support1to2 + c.changing;
        c.totalLocation = c.tenouda + c.suwa + c.home;

        grandTotal.care1to5 += c.care1to5;
        grandTotal.support1to2 += c.support1to2;
        grandTotal.changing += c.changing;
        grandTotal.total += c.total;
        grandTotal.tenouda += c.tenouda;
        grandTotal.suwa += c.suwa;
        grandTotal.home += c.home;
        grandTotal.totalLocation += c.totalLocation;
    });

    return {
        date: targetDateStr,
        byCareManager: cmCounts,
        total: grandTotal
    };
}

// 2026年9月からの月別推移（各月末時点の件数）を計算
export function calculateMonthlyTrends(
    data: CaseloadData,
    careManagers: CareManager[],
    startMonthStr: string = '2026-09',
    monthCount: number = 6
): MonthlyTrendItem[] {
    const trends: MonthlyTrendItem[] = [];
    const [startYear, startMonth] = startMonthStr.split('-').map(Number);

    for (let i = 0; i < monthCount; i++) {
        const targetDate = new Date(startYear, startMonth - 1 + i + 1, 0); // 各月の月末日
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const monthStr = `${y}-${m}`;

        const summary = calculateCaseloadAtDate(data, careManagers, dateStr);

        trends.push({
            monthStr,
            label: `${y}年${targetDate.getMonth() + 1}月末`,
            byCareManager: summary.byCareManager,
            total: summary.total
        });
    }

    return trends;
}
