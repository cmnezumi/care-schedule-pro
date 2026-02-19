import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// db.jsonのパス
const dbPath = path.join(process.cwd(), 'data', 'db.json');

// GET: 全てのイベントを取得
export async function GET() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return NextResponse.json(db.events);
  } catch (error) {
    return NextResponse.json({ message: 'Error reading database' }, { status: 500 });
  }
}

// POST: 新しいイベントを追加
export async function POST(request: Request) {
  try {
    const newEvent = await request.json();

    // 簡単なバリデーション
    if (!newEvent.title || !newEvent.start) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);

    // 簡単なID採番
    const newId = db.events.length > 0 ? Math.max(...db.events.map((e: { id: string }) => parseInt(e.id) || 0)) + 1 : 1;
    newEvent.id = newId.toString();

    db.events.push(newEvent);

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error(error); // サーバー側でエラーを確認できるようにログ出力
    return NextResponse.json({ message: 'Error writing to database' }, { status: 500 });
  }
}
