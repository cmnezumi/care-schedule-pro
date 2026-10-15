import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface CaseloadEvent {
    id: string;
    careManagerId: string; // 'cm1' | 'cm2' | 'cm3'
    type: 'new' | 'end' | 'change_applied' | 'change_resolved';
    date: string; // YYYY-MM-DD
    clientName: string;
    location: 'tenouda' | 'suwa' | 'home'; // 天王田, 諏訪, 在宅
    careLevelType: 'care' | 'support'; // 要介護, 要支援
    // 区分変更用
    targetCareLevelType?: 'care' | 'support'; // 変更後の介護度
    resolvedDate?: string; // 結果が出た日
    status?: 'pending' | 'resolved'; // 区分変更中か解決済みか
    notes?: string;
    createdAt?: string;
}

export interface CareManagerBaseline {
    care1to5: number;   // 要介護件数
    support1to2: number; // 要支援件数
    tenouda: number;     // 天王田
    suwa: number;        // 諏訪
    home: number;        // 在宅
}

export interface CaseloadData {
    baseline202609: {
        cm1: CareManagerBaseline;
        cm2: CareManagerBaseline;
        cm3: CareManagerBaseline;
    };
    events: CaseloadEvent[];
}

const DEFAULT_CASELOAD_DATA: CaseloadData = {
    baseline202609: {
        cm1: { care1to5: 0, support1to2: 0, tenouda: 0, suwa: 0, home: 0 },
        cm2: { care1to5: 0, support1to2: 0, tenouda: 0, suwa: 0, home: 0 },
        cm3: { care1to5: 0, support1to2: 0, tenouda: 0, suwa: 0, home: 0 },
    },
    events: []
};

// GET: 担当件数データ（9月基準件数＋変動イベント）の取得
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('data')
            .eq('month', 'system_caseload')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const caseloadData = data?.data?.caseload || DEFAULT_CASELOAD_DATA;
        return NextResponse.json(caseloadData);
    } catch (error) {
        console.error('Supabase error reading caseload:', error);
        return NextResponse.json({ message: 'Error reading caseload' }, { status: 500 });
    }
}

// POST: 担当件数データの更新・保存
export async function POST(request: Request) {
    try {
        const payload: CaseloadData = await request.json();

        const { error } = await supabase
            .from('shifts')
            .upsert({
                month: 'system_caseload',
                care_manager_id: 'system',
                data: { caseload: payload },
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ message: 'Caseload saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Supabase error writing caseload:', error);
        return NextResponse.json({ message: 'Error writing caseload' }, { status: 500 });
    }
}
