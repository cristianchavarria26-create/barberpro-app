"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminQuery } from "./api";
import { formatPrice } from "@/lib/booking";

type Stats = { month: string; reservations: number; cancelled: number; revenue: number; depositsPaid: number; newCustomers: number; services: { name: string; count: number }[] };

const shift = (month: string, by: number) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + by, 1)).toISOString().slice(0, 7);
};
const monthName = (month: string) => new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

/** The month's figures, calculated on the server from every reservation. */
export default function StatsPanel({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  // What is on screen belongs to another month until the new answer arrives.
  const current = stats?.month === month ? stats : null;

  useEffect(() => {
    let active = true;
    adminQuery<Stats>("stats", { month }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setStats(result.data);
        setError("");
      } else {
        setError(result.error);
      }
    });
    return () => {
      active = false;
    };
  }, [month]);

  const most = Math.max(1, ...(current?.services.map((service) => service.count) ?? []));

  return (
    <>
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="admin-btn" aria-label="Mes anterior" onClick={() => setMonth(shift(month, -1))}><ChevronLeft size={15} /></button>
          <strong className="cal-title">{monthName(month)}</strong>
          <button type="button" className="admin-btn" aria-label="Mes siguiente" onClick={() => setMonth(shift(month, 1))}><ChevronRight size={15} /></button>
        </div>
        {month !== today.slice(0, 7) && <button type="button" className="admin-btn" onClick={() => setMonth(today.slice(0, 7))}>Este mes</button>}
      </div>
      {error && <p className="admin-notice-inline" role="alert">{error}</p>}
      {!current && !error && <p className="admin-empty">Calculando las cifras del mes…</p>}
      {current && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span>Reservas del mes</span><strong>{current.reservations}</strong><small>Sin contar las canceladas</small></div>
            <div className="stat-card"><span>Ingresos estimados</span><strong>{formatPrice(current.revenue)}</strong><small>Abonos ya recibidos: {formatPrice(current.depositsPaid)}</small></div>
            <div className="stat-card"><span>Clientes nuevos</span><strong>{current.newCustomers}</strong><small>Su primera reserva fue este mes</small></div>
            <div className="stat-card"><span>Cancelaciones</span><strong>{current.cancelled}</strong><small>Reservas canceladas del mes</small></div>
          </div>
          <div className="admin-card">
            <h2>Servicios más solicitados</h2>
            {current.services.length === 0 && <p className="admin-hint">Todavía no hay reservas en este mes.</p>}
            <ol className="stat-bars">
              {current.services.map((service) => (
                <li key={service.name}>
                  <span>{service.name}</span>
                  <i><b style={{ width: `${(service.count / most) * 100}%` }} /></i>
                  <strong>{service.count}</strong>
                </li>
              ))}
            </ol>
          </div>
          <p className="admin-hint stat-note">
            Las cifras cuentan las reservas cuya fecha cae en el mes. Los ingresos son una estimación: suman el precio de cada reserva no cancelada,
            como si todos asistieran y pagaran completo. Un cliente se reconoce por su número de teléfono.
          </p>
        </>
      )}
    </>
  );
}
