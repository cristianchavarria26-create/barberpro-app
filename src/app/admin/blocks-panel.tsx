"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { adminCall } from "./api";
import type { AdminAppointment, PanelProps } from "./dashboard";
import { addDays, formatDate, isBlocked, type BlockItem } from "@/lib/booking";

export type AdminBlock = BlockItem & { id: number; reason: string };
type Props = PanelProps & { blocks: AdminBlock[]; barbers: { id: number; name: string }[]; appointments: AdminAppointment[]; today: string };

/** Upcoming reservations that fall inside a block. Blocking never cancels them: the owner decides what to do with each one. */
function conflictsOf(block: BlockItem, appointments: AdminAppointment[], today: string) {
  return appointments
    .filter((item) => item.status !== "cancelled" && item.date >= today && isBlocked([block], item.barberId, item.date, item.time, item.duration))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function ConflictNote({ items }: { items: AdminAppointment[] }) {
  if (items.length === 0) return null;
  const names = items.slice(0, 3).map((item) => `${item.customerName} (${formatDate(item.date, { weekday: "short", day: "numeric", month: "short" })}, ${item.time})`).join(", ");
  const more = items.length > 3 ? ` y ${items.length - 3} más` : "";
  return (
    <p className="admin-warning">
      {items.length === 1
        ? `Hay 1 reserva en ese horario: ${names}. No se cancela sola: avísale desde Reservas.`
        : `Hay ${items.length} reservas en ese horario: ${names}${more}. No se cancelan solas: avísales desde Reservas.`}
    </p>
  );
}

const days = (block: BlockItem) =>
  block.startDate === block.endDate
    ? formatDate(block.startDate, { weekday: "long", day: "numeric", month: "long" })
    : `${formatDate(block.startDate, { day: "numeric", month: "short" })} – ${formatDate(block.endDate, { day: "numeric", month: "short", year: "numeric" })}`;
const hours = (block: BlockItem) =>
  !block.startTime || !block.endTime ? "Todo el día" : `${block.startTime} – ${block.endTime}${block.startDate === block.endDate ? "" : ", cada día"}`;

/** Hours the owner closes by hand: lunch, an errand, holidays or a day off. Customers cannot reserve inside them. */
export default function BlocksPanel({ blocks, barbers, appointments, today, run, pending }: Props) {
  const [who, setWho] = useState("all");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const [reason, setReason] = useState("");

  const timeProblem = !allDay && start >= end;
  const draft: BlockItem | null =
    from && to && from <= to && !timeProblem
      ? { barberId: who === "all" ? null : Number(who), startDate: from, endDate: to, startTime: allDay ? null : start, endTime: allDay ? null : end }
      : null;
  const list = blocks.filter((block) => block.endDate >= today);
  const nameOf = (id: number | null) => (id === null ? "Toda la barbería" : barbers.find((barber) => barber.id === id)?.name ?? "Barbero");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      () => adminCall("saveBlock", { input: { barberId: who === "all" ? null : Number(who), startDate: from, endDate: to, allDay, startTime: start, endTime: end, reason } }),
      "Horario bloqueado. Ya no se puede reservar en él.",
      () => {
        setWho("all");
        setFrom(today);
        setTo(today);
        setAllDay(false);
        setStart("13:00");
        setEnd("14:00");
        setReason("");
      },
    );
  }

  return (
    <>
      <form className="admin-card block-form" aria-label="Bloquear horario" onSubmit={submit}>
        <h2>Bloquear horario</h2>
        <div className="admin-grid grid-block">
          <label className="admin-field">Quién no atiende
            <select className="resv-filter" value={who} onChange={(event) => setWho(event.target.value)}>
              <option value="all">Toda la barbería</option>
              {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
            </select>
          </label>
          <label className="admin-field">Desde
            <input type="date" required min={today} max={addDays(today, 730)} value={from} onChange={(event) => { setFrom(event.target.value); if (event.target.value > to) setTo(event.target.value); }} />
          </label>
          <label className="admin-field">Hasta
            <input type="date" required min={from || today} max={addDays(today, 730)} value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <div className="block-hours">
          <label className="admin-check"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Todo el día</label>
          {!allDay && (
            <div className="schedule-times">
              <input type="time" required aria-label="Desde las" value={start} onChange={(event) => setStart(event.target.value)} />
              a
              <input type="time" required aria-label="Hasta las" value={end} onChange={(event) => setEnd(event.target.value)} />
              {from !== to && <span>cada día</span>}
            </div>
          )}
        </div>
        <label className="admin-field">Motivo (opcional)
          <input maxLength={120} placeholder="Ej: almuerzo, trámite, vacaciones" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {timeProblem && <p className="form-error" role="alert">La hora de término debe ser posterior a la de inicio.</p>}
        {draft && <ConflictNote items={conflictsOf(draft, appointments, today)} />}
        <div className="admin-foot">
          <span className="admin-hint">Solo tú ves el motivo. Los clientes simplemente no podrán reservar en ese horario.</span>
          <button className="admin-btn primary" disabled={pending || timeProblem}>Bloquear horario</button>
        </div>
      </form>

      <p className="resv-label block-list-title">Bloqueos vigentes y próximos</p>
      {list.length === 0 && <p className="admin-empty">No hay horarios bloqueados. Toda la agenda sigue abierta según tus horarios.</p>}
      {list.map((block) => (
        <article className="admin-card block-row" key={block.id}>
          <div>
            <div className="block-row-head">
              <strong>{nameOf(block.barberId)}</strong>
              <span className={`badge ${block.startDate <= today ? "due" : "off"}`}>{block.startDate <= today ? "En curso" : "Próximo"}</span>
            </div>
            <p>{days(block)} · {hours(block)}</p>
            {block.reason && <p className="admin-hint">{block.reason}</p>}
            <ConflictNote items={conflictsOf(block, appointments, today)} />
          </div>
          <button type="button" className="admin-btn danger" disabled={pending} onClick={() => run(() => adminCall("deleteBlock", { id: block.id }), "Bloqueo quitado. Esas horas vuelven a estar disponibles.")}>
            <Trash2 size={14} /> Quitar bloqueo
          </button>
        </article>
      ))}
    </>
  );
}
