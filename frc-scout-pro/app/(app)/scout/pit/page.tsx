'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PitScoutingSchema, type PitScoutingFormData } from '@/types/scouting.types'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/store/eventStore'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'

const AUTO_ROUTINE_OPTIONS = ['Left', 'Center', 'Right', 'Multi-piece', 'Mobility only', 'Custom']
const ROLES = ['Scorer', 'Defense', 'Feeder', 'Flexible', 'Unknown']
const DRIVETRAINS = ['Swerve', 'Tank', 'Mecanum', 'West Coast', 'H-Drive', 'Other']
const LANGUAGES = ['Java', 'Python', 'C++', 'LabVIEW', 'Kotlin', 'Other']
const VISION_SYSTEMS = ['Limelight', 'PhotonVision', 'OpenCV', 'None', 'Other']

export default function PitScoutPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, setValue, watch, reset } = useForm<PitScoutingFormData, any, PitScoutingFormData>({
    resolver: zodResolver(PitScoutingSchema) as any,
    defaultValues: {
      event_id: activeEvent?.id ?? '',
      team_number: 0,
      scout_id: '',
      auto_routines: [],
      spare_parts: false,
      photo_urls: [],
    },
  })

  const autoRoutines = watch('auto_routines') ?? []

  function toggleRoutine(r: string) {
    if (autoRoutines.includes(r)) {
      setValue('auto_routines', autoRoutines.filter((x) => x !== r))
    } else {
      setValue('auto_routines', [...autoRoutines, r])
    }
  }

  async function onSubmit(data: PitScoutingFormData) {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const entry = { ...data, event_id: activeEvent?.id ?? '', scout_id: user?.id ?? '' }

    const { error } = await supabase.from('pit_scouting').upsert(entry, { onConflict: 'event_id,team_number' })

    if (error) {
      toast.error('Failed to submit: ' + error.message)
    } else {
      toast.success('Pit scouting submitted!')
      reset({ event_id: activeEvent?.id ?? '', team_number: 0, scout_id: '', auto_routines: [], spare_parts: false, photo_urls: [] })
    }
    setSubmitting(false)
  }

  if (!activeEvent) {
    return <div className="p-4 text-center text-slate-500 mt-10">Select an event first.</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-white mb-4">Pit Scouting</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-8">
        {/* Team number */}
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Team Number</Label>
          <Controller
            name="team_number"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                placeholder="e.g. 254"
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white h-14 text-2xl font-bold"
              />
            )}
          />
        </div>

        {/* Robot specs */}
        <div className="space-y-3">
          <h2 className="text-purple-300 font-bold text-sm uppercase tracking-wide border-b border-purple-600/20 pb-1">Robot Specs</h2>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Drivetrain</Label>
            <div className="grid grid-cols-3 gap-2">
              {DRIVETRAINS.map((d) => (
                <Controller key={d} name="drivetrain" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(d)}
                    className={cn('h-11 rounded-lg text-xs font-medium border transition-colors',
                      field.value === d ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    {d}
                  </button>
                )} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs mb-1 block">Weight (lbs)</Label>
              <Controller name="weight_lbs" control={control} render={({ field }) => (
                <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} placeholder="120" className="bg-slate-800 border-slate-700 text-white h-11" />
              )} />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1 block">Width (in)</Label>
              <Controller name="width_in" control={control} render={({ field }) => (
                <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} placeholder="28" className="bg-slate-800 border-slate-700 text-white h-11" />
              )} />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1 block">Length (in)</Label>
              <Controller name="length_in" control={control} render={({ field }) => (
                <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} placeholder="28" className="bg-slate-800 border-slate-700 text-white h-11" />
              )} />
            </div>
          </div>
        </div>

        {/* Software */}
        <div className="space-y-3">
          <h2 className="text-blue-300 font-bold text-sm uppercase tracking-wide border-b border-blue-600/20 pb-1">Software</h2>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Language</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Controller key={l} name="programming_language" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(l)}
                    className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                      field.value === l ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    {l}
                  </button>
                )} />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Vision System</Label>
            <div className="flex flex-wrap gap-2">
              {VISION_SYSTEMS.map((v) => (
                <Controller key={v} name="vision_system" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(v)}
                    className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                      field.value === v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    {v}
                  </button>
                )} />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Auto Routines (select all)</Label>
            <div className="flex flex-wrap gap-2">
              {AUTO_ROUTINE_OPTIONS.map((r) => (
                <button key={r} type="button" onClick={() => toggleRoutine(r)}
                  className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                    autoRoutines.includes(r) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  )}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-3">
          <h2 className="text-emerald-300 font-bold text-sm uppercase tracking-wide border-b border-emerald-600/20 pb-1">Capabilities</h2>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Preferred Role</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Controller key={r} name="preferred_role" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(r)}
                    className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                      field.value === r ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    {r}
                  </button>
                )} />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm mb-1 block">Climb Mechanism</Label>
            <Controller name="climb_mechanism" control={control} render={({ field }) => (
              <Textarea {...field} placeholder="Describe climb mechanism..." rows={2} className="bg-slate-800 border-slate-700 text-white resize-none text-sm" />
            )} />
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-3">
          <h2 className="text-amber-300 font-bold text-sm uppercase tracking-wide border-b border-amber-600/20 pb-1">Condition</h2>

          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Battery Condition</Label>
            <div className="flex gap-2">
              {['Good', 'Fair', 'Poor'].map((b) => (
                <Controller key={b} name="battery_condition" control={control} render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(b)}
                    className={cn('flex-1 h-12 rounded-lg text-sm font-semibold border transition-colors',
                      field.value === b
                        ? b === 'Good' ? 'bg-emerald-600 border-emerald-500 text-white'
                          : b === 'Fair' ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    {b}
                  </button>
                )} />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm mb-1 block">Repair Concerns</Label>
            <Controller name="repair_concerns" control={control} render={({ field }) => (
              <Textarea {...field} placeholder="Any known issues or repairs needed..." rows={2} className="bg-slate-800 border-slate-700 text-white resize-none text-sm" />
            )} />
          </div>

          <Controller name="spare_parts" control={control} render={({ field }) => (
            <button type="button" onClick={() => field.onChange(!field.value)}
              className={cn('w-full h-12 rounded-lg text-sm font-semibold border-2 transition-colors',
                field.value ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              )}>
              {field.value ? 'Has Spare Parts ✓' : 'No Spare Parts Confirmed'}
            </button>
          )} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm mb-1 block">General Notes</Label>
          <Controller name="notes" control={control} render={({ field }) => (
            <Textarea {...field} placeholder="Additional observations..." rows={4} className="bg-slate-800 border-slate-700 text-white resize-none" />
          )} />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base rounded-xl"
        >
          {submitting ? 'Submitting...' : 'Submit Pit Scouting'}
        </Button>
      </form>
    </div>
  )
}
