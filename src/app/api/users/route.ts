import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: 全てのユーザーを取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*');

    if (error) throw error;

    const formattedUsers = data.map((u: any) => ({
      id: u.id,
      name: u.name,
      kana: u.kana || '',
      careLevel: u.care_level,
      address: u.address,
      notes: u.notes,
      careManagerId: u.care_manager_id,
      planRenewalDate: u.plan_renewal_date
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
  }
}

// POST: 新しいユーザーを追加
export async function POST(request: Request) {
  try {
    const newUser = await request.json();

    if (!newUser.name) {
      return NextResponse.json({ message: 'User name is required' }, { status: 400 });
    }

    const userWithId = {
      id: newUser.id || Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      kana: newUser.kana || '',
      care_level: newUser.careLevel,
      address: newUser.address,
      notes: newUser.notes,
      care_manager_id: newUser.careManagerId,
      plan_renewal_date: newUser.planRenewalDate
    };

    const { data, error } = await supabase
      .from('clients')
      .upsert(userWithId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
  }
}

// PUT: ユーザー情報を更新
export async function PUT(request: Request) {
  try {
    const updatedUser = await request.json();
    if (!updatedUser.id) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const formattedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      kana: updatedUser.kana || '',
      care_level: updatedUser.careLevel,
      address: updatedUser.address,
      notes: updatedUser.notes,
      care_manager_id: updatedUser.careManagerId,
      plan_renewal_date: updatedUser.planRenewalDate
    };

    const { data, error } = await supabase
      .from('clients')
      .upsert(formattedUser)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
  }
}

// DELETE: ユーザーを削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error deleting from Supabase' }, { status: 500 });
  }
}
