"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { adminCall } from "./api";
import type { PanelProps } from "./dashboard";
import { formatDate } from "@/lib/booking";

export type AdminReview = { id: number; name: string; rating: number; comment: string; status: string; date: string };

const FILTERS = [["all", "Todas"], ["pending", "Por revisar"], ["shown", "En la página"], ["hidden", "Ocultas"]] as const;
const BADGE: Record<string, [string, string]> = { pending: ["due", "Por revisar"], shown: ["paid", "En la página"], hidden: ["off", "Oculta"] };

/** Every review customers have sent. The owner decides which ones appear on the site. */
export default function ReviewsPanel({ reviews, run, pending }: PanelProps & { reviews: AdminReview[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const list = reviews.filter((review) => filter === "all" || review.status === filter);
  const waiting = reviews.filter((review) => review.status === "pending").length;
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const setStatus = (id: number, status: string, message: string) => run(() => adminCall("setReviewStatus", { id, status }), message);

  return (
    <>
      {waiting > 0 && <p className="admin-warning">{waiting === 1 ? "Hay 1 reseña nueva por revisar." : `Hay ${waiting} reseñas nuevas por revisar.`} No aparecen en la página hasta que elijas mostrarlas.</p>}
      <div className="resv-toolbar">
        <div className="resv-switch">
          {FILTERS.map(([id, label]) => <button type="button" key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        {reviews.length > 0 && <span className="admin-hint">Promedio de las {reviews.length} recibidas: {average.toFixed(1).replace(".", ",")} de 5</span>}
      </div>
      {list.length === 0 && <p className="admin-empty">{reviews.length === 0 ? "Todavía no llega ninguna reseña. Los clientes pueden dejarla desde la página." : "No hay reseñas en este grupo."}</p>}
      {list.map((review) => {
        const [tone, label] = BADGE[review.status] ?? BADGE.pending;
        return (
          <article className="admin-card review-row" key={review.id}>
            <div>
              <div className="review-row-head">
                <span className="review-stars" role="img" aria-label={`${review.rating} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= review.rating ? "currentColor" : "none"} />)}
                </span>
                <strong>{review.name}</strong>
                <small>{formatDate(review.date.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</small>
                <span className={`badge ${tone}`}>{label}</span>
              </div>
              <p>{review.comment}</p>
            </div>
            <div className="admin-foot-actions">
              {review.status === "shown"
                ? <button type="button" className="admin-btn" disabled={pending} onClick={() => setStatus(review.id, "hidden", "La reseña ya no se muestra en la página.")}>Ocultar</button>
                : <button type="button" className="admin-btn primary" disabled={pending} onClick={() => setStatus(review.id, "shown", "La reseña ya se muestra en la página.")}>Mostrar en la página</button>}
              <button
                type="button"
                className="admin-btn danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`¿Eliminar la reseña de ${review.name}? No se puede deshacer.`)) run(() => adminCall("deleteReview", { id: review.id }), "Reseña eliminada.");
                }}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}
