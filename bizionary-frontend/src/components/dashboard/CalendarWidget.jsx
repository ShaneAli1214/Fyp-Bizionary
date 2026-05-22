import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

const CalendarWidget = ({ onChange }) => {
  const [selected, setSelected] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{
    function handleClick(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return ()=> document.removeEventListener('mousedown', handleClick);
  },[]);

  const days = [];
  const first = startOfMonth(viewMonth);
  const last = endOfMonth(viewMonth);
  const startPad = first.getDay();
  for(let i=0;i<startPad;i++) days.push(null);
  for(let d=1; d<= last.getDate(); d++) days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const handleSelect = (day) => {
    if(!day) return;
    setSelected(day);
    setOpen(false);
    if(typeof onChange === 'function') onChange(day.toISOString().split('T')[0]);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-3 bg-surface px-3 py-2 rounded-xl border border-surface/10 shadow-sm hover:shadow-md">
        <div className="p-1 bg-primary/10 rounded">
          <CalendarIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left">
          <div className="text-[13px] font-semibold text-textMain">{selected.toLocaleString(undefined,{month:'short'})} {selected.getDate()}</div>
          <div className="text-[11px] text-textMuted">{selected.toLocaleString(undefined,{weekday:'short'})}</div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface p-3 rounded-xl border border-surface/10 shadow-lg z-50">
          <div className="flex items-center justify-between mb-2">
            <button onClick={()=>setViewMonth(m=>addMonths(m,-1))} className="p-1 rounded hover:bg-surface/50"><ChevronLeft className="w-4 h-4 text-textMuted" /></button>
            <div className="text-sm font-semibold">{viewMonth.toLocaleString(undefined,{month:'long', year:'numeric'})}</div>
            <button onClick={()=>setViewMonth(m=>addMonths(m,1))} className="p-1 rounded hover:bg-surface/50"><ChevronRight className="w-4 h-4 text-textMuted" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-textMuted mb-2">
            {weekdays.map(w=> <div key={w} className="py-1">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => (
              <button key={idx} onClick={()=>handleSelect(d)} disabled={!d} className={`py-2 rounded focus:outline-none ${d ? 'hover:bg-primary/10' : ''} ${d && isSameDay(d, selected) ? 'bg-primary text-white font-bold' : 'text-textMain'}`}>
                {d ? d.getDate() : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarWidget;
