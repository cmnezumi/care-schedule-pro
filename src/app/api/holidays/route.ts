import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

// GET: 全ての休日を取得
export async function GET() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return NextResponse.json(db.holidays || []);
  } catch (error) {
    return NextResponse.json({ message: 'Error reading database' }, { status: 500 });
  }
}

// POST: 新しい休日を追加
export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }

    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);

    if (!db.holidays.includes(date)) {
      db.holidays.push(date);
      await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    }

    return NextResponse.json({ success: true, date }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error writing to database' }, { status: 500 });
  }
}

// DELETE: 休日を削除
export async function DELETE(request: Request) {
    try {
      const { date } = await request.json();
      if (!date) {
        return NextResponse.json({ message: 'Date is required' }, { status: 400 });
      }

      const data = await fs.readFile(dbPath, 'utf-8');
      const db = JSON.parse(data);

      const initialLength = db.holidays.length;
      db.holidays = db.holidays.filter((holiday: string) => holiday !== date);

      if (db.holidays.length < initialLength) {
        await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
      }

      return NextResponse.json({ success: true, date });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Error writing to database' }, { status: 500 });
    }
  }
