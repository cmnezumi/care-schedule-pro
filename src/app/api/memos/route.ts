import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Memo } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_MEMOS: Memo[] = [
    {
        id: 'memo-welcome',
        title: 'Care Schedule Pro メモへようこそ',
        content: 'このメモ機能は、パソコンやスマホからいつでも利用できるメモ帳です。\n\n【便利な使い方】\n・電話対応や家族からの伝言メモ\n・次回訪問時の確認事項や持ち物リスト\n・ケアマネ間の申し送りや共有事項\n\n入力内容は自動的に保存され、PC・スマホの両方でリアルタイムに同期されます。',
        careManagerId: 'all',
        category: 'general',
        isPinned: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    }
];

// GET: メモ一覧取得
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('data')
            .eq('month', 'system_memos')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const memos = data?.data?.memos || DEFAULT_MEMOS;
        return NextResponse.json(memos);
    } catch (error) {
        console.error('Supabase error reading memos:', error);
        return NextResponse.json({ message: 'Error reading memos' }, { status: 500 });
    }
}

// POST: メモ一覧保存
export async function POST(request: Request) {
    try {
        const payload: { memos: Memo[] } = await request.json();

        const { error } = await supabase
            .from('shifts')
            .upsert({
                month: 'system_memos',
                care_manager_id: 'system',
                data: { memos: payload.memos },
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ message: 'Memos saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Supabase error writing memos:', error);
        return NextResponse.json({ message: 'Error writing memos' }, { status: 500 });
    }
}
