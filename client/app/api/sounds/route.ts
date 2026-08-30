import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const PREFIXES = ['sheep', 'mermaid', 'tiger', 'rabbit', 'card'] as const;
type Prefix = (typeof PREFIXES)[number];

export async function GET() {
  const soundsDir = path.join(process.cwd(), 'public', 'sounds');
  const manifest: Record<Prefix, string[]> = {
    sheep: [],
    mermaid: [],
    tiger: [],
    rabbit: [],
    card: [],
  };

  let files: string[] = [];
  try {
    files = fs.readdirSync(soundsDir);
  } catch {
    // sounds 폴더가 아직 없으면 빈 매니페스트 반환
    return NextResponse.json(manifest);
  }

  for (const file of files) {
    const prefix = PREFIXES.find(p => file.startsWith(`${p}_`));
    if (prefix) manifest[prefix].push(`/sounds/${file}`);
  }

  return NextResponse.json(manifest);
}
