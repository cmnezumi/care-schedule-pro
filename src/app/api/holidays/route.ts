import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 全ての休日を取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
  }
}

// POST: 新しい休日を追加
export async function POST(request: Request) {
  try {
    const { date, name } = await request.json();
    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('holidays')
      .upsert({ date, name })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, date: data.date }, { status: 201 });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
  }
}

// DELETE: 休日を削除
export async function DELETE(request: Request) {
  try {
    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('date', date);

    if (error) throw error;

    return NextResponse.json({ success: true, date });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error deleting from Supabase' }, { status: 500 });
  }
}
