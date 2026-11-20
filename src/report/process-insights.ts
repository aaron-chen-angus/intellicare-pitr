import { SUBJECTS, subjectOf, secondsLabel } from '../process'
import type { DrawingSubject, FillOperation, StrokeRecord } from '../types'

/** Retained non-eraser intervals only. A span is not time spent; fills have no duration. */
export function processInsights(strokes: StrokeRecord[], fills: FillOperation[], startTime: number) {
  const marks = strokes.filter((s) => s.tool !== 'eraser').sort((a, b) => a.start - b.start)
  const elapsed = (t: number) => Math.max(0, (t - startTime) / 1000)
  const seconds = (s: StrokeRecord) => Number.isFinite(s.start) && Number.isFinite(s.end) ? Math.max(0, (s.end - s.start) / 1000) : 0
  const totalSeconds = marks.reduce((n, s) => n + seconds(s), 0)
  const runs: Array<{ id: DrawingSubject; start: number }> = []
  for (const mark of marks) if (runs.at(-1)?.id !== subjectOf(mark)) runs.push({ id: subjectOf(mark), start: mark.start })
  const groups = SUBJECTS.map((item) => {
    const retained = marks.filter((s) => subjectOf(s) === item.id)
    const activeSeconds = retained.reduce((n, s) => n + seconds(s), 0)
    const timestamps = retained.flatMap((s) => [s.start, s.end]).filter(Number.isFinite)
    return { ...item, activeSeconds, share: totalSeconds ? activeSeconds / totalSeconds * 100 : 0, count: retained.length,
      first: timestamps.length ? elapsed(Math.min(...timestamps)) : null,
      last: timestamps.length ? elapsed(Math.max(...timestamps)) : null,
      returns: Math.max(0, runs.filter((run) => run.id === item.id).length - 1),
      fillCount: fills.filter((f) => subjectOf(f) === item.id).length }
  })
  const unlabelled = groups.find((g) => g.id === 'unlabelled')!
  const labelledCount = marks.length - unlabelled.count
  const coverage = marks.length ? labelledCount / marks.length * 100 : 0
  const order = groups.filter((g) => g.id !== 'unlabelled' && g.first !== null).sort((a, b) => a.first! - b.first!).map((g) => ({ id: g.id, label: g.label, first: g.first! }))
  const focus = groups.filter((g) => g.id !== 'unlabelled' && g.activeSeconds > 0).sort((a, b) => b.activeSeconds - a.activeSeconds)[0]
  const focusQuestions: Record<DrawingSubject, string> = {
    person: 'What were you trying to show about this character?', umbrella: 'What kind of protection did you want this shelter to offer?',
    rain: 'What role does the weather play in your story?', scene: 'Which surrounding detail matters most to your story?', unlabelled: 'Which parts do these marks belong to?',
  }
  const guidance = !marks.length ? {
    observation: 'No retained drawing strokes are available for a time breakdown.',
    question: 'What detail would you like to explore in your drawing?', action: 'Choose a feeling in the activities below, then pick one support you can use.',
  } : !focus ? {
    observation: totalSeconds ? 'The recorded drawing time is not yet linked to named elements.' : 'These retained strokes have no positive recorded duration.',
    question: 'Which marks belong to the person, umbrella or rain?', action: 'Label a region below to reveal its sequence. Then choose a feeling and one practical next step.',
  } : {
    observation: `${focus.label} has the largest labelled active-time share (${Math.round(focus.share)}% of all retained drawing pen-time).${unlabelled.count ? ` ${unlabelled.count} strokes remain unlabelled.` : ''}`,
    question: focusQuestions[focus.id],
    action: 'Name the feeling that fits today. Match it to a colour, then choose an available support and a when/then action.',
  }
  const revisited = groups.filter((g) => g.id !== 'unlabelled' && g.returns > 0)
  return { groups, totalSeconds, count: marks.length, labelledCount, coverage, unlabelledSeconds: unlabelled.activeSeconds, order,
    sequence: order.map((g) => `${g.label} ${secondsLabel(g.first)}`).join(' → '),
    revisits: revisited.map((g) => `${g.label}: ${g.returns} ${g.returns === 1 ? 'return' : 'returns'}`).join(' · '), guidance,
    measure: 'Share of retained non-eraser pen-down time. Includes unlabelled strokes; excludes fills. Not page area or session time.',
  }
}
export type ProcessInsights = ReturnType<typeof processInsights>
