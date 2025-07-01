import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const packageName = formData.get('packageName') as string

  if (!file || !packageName) {
    return NextResponse.json({ success: false, error: 'Chybí soubor nebo packageName' }, { status: 400 })
  }

  // Cesta, kam uložit soubor (mimo public, např. do server/google-services)
  const saveDir = path.join(process.cwd(), 'server', 'google-services', packageName)
  await fs.mkdir(saveDir, { recursive: true })
  const arrayBuffer = await file.arrayBuffer()
  await fs.writeFile(path.join(saveDir, 'google-services.json'), Buffer.from(arrayBuffer))

  return NextResponse.json({ success: true })
} 