"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminBlock } from "./blocks-panel";
import type { AdminAppointment } from "./dashboard";
import { addDays, formatDate, isPastTime, timeToMinutes, weekday, type DaySchedule } from "@/lib/booking";

type Column = { key: string; id: number | null; name: string; items: AdminAppointment[] };
type Props = { appointments: AdminAppointment[]; barbers: { id: number; name: string; active: boolean }[]; blocks: AdminBlock[]; schedule: DaySchedule[]; today: string };

const ROW = 40; // pixels for each half hour in the day view
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const payment = (item: AdminAppointment) => (item.depositAmount === 0 ? "none" : item.depositPaid ? "paid" : item.hasReceipt ? "review" : "due");
const overlaps = (item: AdminAppointment, from: number, to: number) => timeToMinutes(item.time) < to && from < timeToMinutes(item.time) + item.duration;
const covers = (block: AdminBlock, from: number, to: number) => !block.startTime || !block.endTime || (timeToMinutes(block.startTime) < to && from < timeToMinutes(block.endTime));

/** The hours blocked by hand that keep one barber from working on one day. */
function blocksOn(blocks: AdminBlock[], column: Column, date: string) {
  return blocks.filter((block) => (block.barberId === null || block.barberId === column.id) && block.startDate <= date && date <= block.endDate);
}

/** How many half-hour spaces a barber still has open that day. Hours already gone, taken or blocked do not count. */
function freeSpaces(day: DaySchedule | undefined, items: AdminAppointment[], closed: AdminBlock[], date: string) {
  if (!day?.open) return 0;
  let free = 0;
  for (let start = timeToMinutes(day.start); start + 30 <= timeToMinutes(day.end); start += 30) {
    const taken = items.some((item) => overlaps(item, start, start + 30)) || closed.some((block) => covers(block, start, start + 30));
    if (!taken && !isPastTime(date, clock(start))) free += 1;
  }
  return free;
}

function DayView({ columns, blocks, day, date, today }: { columns: Column[]; blocks: AdminBlock[]; day: DaySchedule | undefined; date: string; today: string }) {
  const items = columns.flatMap((column) => column.items);
  if (!day?.open && items.length === 0) return <p className="admin-empty">La barbería está cerrada este día y no hay reservas.</p>;
  // The grid covers the opening hours, stretched if some reservation falls outside them.
  const from = Math.floor(Math.min(day?.open ? timeToMinutes(day.start) : Infinity, ...items.map((item) => timeToMinutes(item.time))) / 30) * 30;
  const to = Math.ceil(Math.max(day?.open ? timeToMinutes(day.end) : 0, ...items.map((item) => timeToMinutes(item.time) + item.duration)) / 30) * 30;
  const height = ((to - from) / 30) * ROW;
  const hours = Array.from({ length: (to - from) / 30 + 1 }, (_, index) => from + index * 30).filter((minutes) => minutes % 60 === 0);

  return (
    <div className="cal-scroll">
      <div className="cal-day" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(150px, 1fr))` }}>
        <div />
        {columns.map((column) => (
          <div className="cal-head" key={column.key}>
            <strong>{column.name}</strong>
            <span>
              {column.items.length === 1 ? "1 reserva" : `${column.items.length} reservas`}
              {date >= today && ` · ${freeSpaces(day, column.items, blocksOn(blocks, column, date), date)} espacios libres`}
            </span>
          </div>
        ))}
        <div className="cal-times" style={{ height }}>
          {hours.map((minutes) => <span key={minutes} style={{ top: ((minutes - from) / 30) * ROW }}>{clock(minutes)}</span>)}
        </div>
        {columns.map((column) => (
          <div className="cal-col" key={column.key} style={{ height, backgroundSize: `100% ${ROW * 2}px` }}>
            {blocksOn(blocks, column, date).map((block) => {
              const start = Math.max(from, block.startTime ? timeToMinutes(block.startTime) : from);
              const end = Math.min(to, block.endTime ? timeToMinutes(block.endTime) : to);
              if (end <= start) return null;
              return (
                <div className="cal-off" key={block.id} style={{ top: ((start - from) / 30) * ROW, height: ((end - start) / 30) * ROW }}>
                  <span>{block.reason || "Bloqueado"} · {block.startTime && block.endTime ? `${block.startTime} – ${block.endTime}` : "todo el día"}</span>
                </div>
              );
            })}
            {column.items.map((item) => {
              const start = timeToMinutes(item.time);
              return (
                <div className={`cal-block ${payment(item)}`} key={item.id} style={{ top: ((start - from) / 30) * ROW + 1, height: Math.max(ROW, (item.duration / 30) * ROW) - 2 }} title={`${item.customerName} · ${item.serviceName} · ${item.customerPhone}`}>
                  <strong>{item.time} – {clock(start + item.duration)}</strong>
                  <span>{item.customerName}</span>
                  <small>{item.serviceName}</small>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ columns, blocks, days, schedule, today, onOpenDay }: { columns: Column[]; blocks: AdminBlock[]; days: string[]; schedule: DaySchedule[]; today: string; onOpenDay: (date: string) => void }) {
  return (
    <div className="cal-scroll">
      <table className="cal-week">
        <thead>
          <tr>
            <th />
            {days.map((date) => (
              <th key={date} className={date === today ? "today" : ""}>
                <button type="button" onClick={() => onOpenDay(date)} title="Ver este día">{formatDate(date, { weekday: "short", day: "numeric" })}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.key}>
              <th scope="row">{column.name}</th>
              {days.map((date) => {
                const day = schedule[weekday(date)];
                const own = column.items.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time));
                const closed = blocksOn(blocks, column, date);
                return (
                  <td key={date} className={date === today ? "today" : ""}>
                    {!day?.open && own.length === 0 ? (
                      <span className="cal-closed">Cerrado</span>
                    ) : (
                      <>
                        {own.map((item) => <span className={`cal-chip ${payment(item)}`} key={item.id} title={`${item.customerName} · ${item.serviceName}`}>{item.time} {item.customerName.split(" ")[0]}</span>)}
                        {closed.map((block) => <span className="cal-chip off" key={block.id} title={block.reason || "Bloqueado"}>{block.startTime && block.endTime ? `${block.startTime}–${block.endTime}` : "Todo el día"} {block.reason || "Bloqueado"}</span>)}
                        {date >= today && <small>{freeSpaces(day, own, closed, date)} libres</small>}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A day or a week at a glance: which barber is taken, what is blocked and where there is still room. */
export default function CalendarPanel({ appointments, barbers, blocks, schedule, today }: Props) {
  const [mode, setMode] = useState<"day" | "week">("day");
  const [date, setDate] = useState(today);
  const monday = addDays(date, -((weekday(date) + 6) % 7));
  const days = mode === "day" ? [date] : Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const items = appointments.filter((item) => item.status !== "cancelled" && days.includes(item.date));
  const team = new Set(barbers.map((barber) => barber.id));
  // One column per barber on the team, then anyone no longer on it who still has a reservation in these days.
  const columns: Column[] = [
    ...barbers.map((barber) => ({ key: `b${barber.id}`, id: barber.id, name: barber.name, active: barber.active, items: items.filter((item) => item.barberId === barber.id) })).filter((column) => column.active || column.items.length > 0),
    ...Array.from(new Set(items.filter((item) => !team.has(item.barberId)).map((item) => item.barberName))).map((name) => ({ key: `n${name}`, id: null, name, items: items.filter((item) => !team.has(item.barberId) && item.barberName === name) })),
  ];
  const title = mode === "day"
    ? formatDate(date, { weekday: "long", day: "numeric", month: "long" })
    : `${formatDate(days[0], { day: "numeric", month: "short" })} – ${formatDate(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
  const move = (by: number) => setDate(addDays(date, by * (mode === "day" ? 1 : 7)));

  return (
    <>
      <div className="cal-toolbar">
        <div className="resv-switch">
          <button type="button" className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>Día</button>
          <button type="button" className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Semana</button>
        </div>
        <div className="cal-nav">
          <button type="button" className="admin-btn" aria-label={mode === "day" ? "Día anterior" : "Semana anterior"} onClick={() => move(-1)}><ChevronLeft size={15} /></button>
          <strong className="cal-title">{title}</strong>
          <button type="button" className="admin-btn" aria-label={mode === "day" ? "Día siguiente" : "Semana siguiente"} onClick={() => move(1)}><ChevronRight size={15} /></button>
        </div>
        <div className="cal-jump">
          {date !== today && <button type="button" className="admin-btn" onClick={() => setDate(today)}>Hoy</button>}
          <input type="date" className="resv-filter" aria-label="Ir a una fecha" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} />
        </div>
      </div>
      {columns.length === 0 ? (
        <p className="admin-empty">Agrega barberos para ver su calendario.</p>
      ) : mode === "day" ? (
        <DayView columns={columns} blocks={blocks} day={schedule[weekday(date)]} date={date} today={today} />
      ) : (
        <WeekView columns={columns} blocks={blocks} days={days} schedule={schedule} today={today} onOpenDay={(day) => { setDate(day); setMode("day"); }} />
      )}
      <p className="cal-legend">
        <span className="paid">Abono recibido</span><span className="review">Comprobante por revisar</span><span className="due">Abono pendiente</span><span className="none">Sin abono</span><span className="off">Bloqueado</span>
        <em>Cada espacio libre son 30 minutos. Las reservas canceladas no se muestran.</em>
      </p>
    </>
  );
}
