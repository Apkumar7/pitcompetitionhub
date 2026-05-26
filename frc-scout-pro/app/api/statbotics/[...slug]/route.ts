import { NextRequest, NextResponse } from 'next/server'

const STATBOTICS_BASE = process.env.STATBOTICS_BASE ?? 'https://api.statbotics.io/v3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const path = slug.join('/')
  const { searchParams } = request.nextUrl
  const query = searchParams.toString()
  const url = `${STATBOTICS_BASE}/${path}${query ? `?${query}` : ''}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 600 },
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `Statbotics error: ${res.status}` },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=120' },
  })
}
