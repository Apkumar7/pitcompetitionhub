import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h]
        if (val == null) return ''
        const str = Array.isArray(val) ? val.join(';') : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ]
  return lines.join('\n')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const eventId = request.nextUrl.searchParams.get('event')
  if (!eventId) {
    return NextResponse.json({ error: 'event param required' }, { status: 400 })
  }

  const supabase = await createClient()

  let data: Record<string, unknown>[] = []
  let filename = 'export.csv'

  if (type === 'scouting-entries') {
    const { data: rows } = await supabase
      .from('scouting_entries')
      .select('*')
      .eq('event_id', eventId)
    data = rows ?? []
    filename = `scouting-${eventId}.csv`
  } else if (type === 'pit-scouting') {
    const { data: rows } = await supabase
      .from('pit_scouting')
      .select('*')
      .eq('event_id', eventId)
    data = rows ?? []
    filename = `pit-scouting-${eventId}.csv`
  } else if (type === 'picklists') {
    const { data: rows } = await supabase
      .from('picklists')
      .select('*')
      .eq('event_id', eventId)
    data = rows ?? []
    filename = `picklists-${eventId}.csv`
  } else {
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  const csv = toCSV(data)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
