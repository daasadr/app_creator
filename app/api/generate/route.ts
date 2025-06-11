import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Validace konfigurace
    if (!config.appName || !config.pages || !config.pages.length) {
      return NextResponse.json(
        { success: false, error: 'Chybí název aplikace nebo stránky' },
        { status: 400 }
      )
    }

    // Zavolej server pro generování aplikace
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Chyba při generování aplikace' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      buildId: result.buildId
    })

  } catch (error) {
    console.error('Error generating app:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
} 