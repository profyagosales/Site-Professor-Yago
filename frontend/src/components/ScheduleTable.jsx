import React from 'react'
import './schedule-table.css'

const SLOTS = [
  { id:1, label:'1º', time:'07:15–08:45' },
  { id:2, label:'2º', time:'09:00–10:30' },
  { id:3, label:'3º', time:'10:45–12:15' },
]
const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta']

export default function ScheduleTable({ schedules=[] }) {
  const map = new Map()
  schedules.forEach(s => map.set(`${s.day}-${s.slot}`, s.label))

  return (
    <div className="st-card">
      <div className="st-grid">
        <div className="st-corner"></div>
        {DAYS.map(d => <div key={d} className="st-head">{d}</div>)}
        {SLOTS.map(s => (
          <React.Fragment key={s.id}>
            <div className="st-slot">{s.label}<span>{s.time}</span></div>
            {DAYS.map(d => (
              <div key={`${d}-${s.id}`} className="st-cell">
                {map.get(`${d}-${s.id}`) ?? '—'}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
