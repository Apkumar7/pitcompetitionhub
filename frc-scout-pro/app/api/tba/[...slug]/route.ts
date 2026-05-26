import { NextRequest, NextResponse } from 'next/server'

const TBA_BASE = 'https://www.thebluealliance.com/api/v3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const path = slug.join('/')
  const { searchParams } = request.nextUrl
  const query = searchParams.toString()
  const url = `${TBA_BASE}/${path}${query ? `?${query}` : ''}`

  const res = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': process.env.TBA_API_KEY!,
      'Accept': 'application/json',
    },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `TBA error: ${res.status}` },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
  })
}
