"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Star } from "lucide-react";
import type { Texts } from "@/lib/texts";

export type PublicReview = { id: number; name: string; rating: number; comment: string };

const FIVE = [1, 2, 3, 4, 5];

/** The reviews the owner chose to show, and the form for customers to leave their own. */
export default function Reviews({ reviews, texts: t }: { reviews: PublicReview[]; texts: Texts }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      setError("Elige cuántas estrellas le das.");
      return;
    }
    setStatus("sending");
    setError("");
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rating, comment, website }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    if (!response?.ok) {
      setStatus("idle");
      setError(data?.error || (response ? `No pudimos enviar tu reseña (código ${response.status}). Inténtalo de nuevo.` : "No hay conexión. Revisa tu internet e inténtalo de nuevo."));
      return;
    }
    setStatus("sent");
  }

  return (
    <section className="reviews section-light" id="resenas">
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker"><span>04</span> / {t.reviewsKicker} <i /></p>
            <h2>{t.reviewsTitle1 && <>{t.reviewsTitle1}<br /></>}<em>{t.reviewsTitle2}</em></h2>
          </div>
          <div className="section-heading-aside">
            {t.reviewsText && <p>{t.reviewsText}</p>}
            {status !== "sent" && !open && <button type="button" className="button button-dark" onClick={() => setOpen(true)}>{t.reviewsButton} <ArrowUpRight size={16} /></button>}
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="review-grid">
            {reviews.map((review) => (
              <figure className="review-card" key={review.id}>
                <span className="review-stars" role="img" aria-label={`${review.rating} de 5 estrellas`}>
                  {FIVE.map((n) => <Star key={n} size={15} fill={n <= review.rating ? "currentColor" : "none"} />)}
                </span>
                <blockquote>{review.comment}</blockquote>
                <figcaption>{review.name}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          t.reviewsEmpty && <p className="site-empty">{t.reviewsEmpty}</p>
        )}

        {status === "sent" ? (
          <p className="review-thanks" role="status">{t.reviewThanks}</p>
        ) : (
          open && (
            <form className="review-form" onSubmit={submit}>
              {t.reviewFormTitle && <h3>{t.reviewFormTitle}</h3>}
              <fieldset className="review-rating">
                <legend>{t.reviewRatingLabel}</legend>
                {FIVE.map((n) => (
                  <button type="button" key={n} className={n <= rating ? "on" : ""} aria-label={`${n} de 5 estrellas`} aria-pressed={rating === n} onClick={() => { setRating(n); setError(""); }}>
                    <Star size={27} fill={n <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </fieldset>
              <label>{t.reviewNameLabel}
                <input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>{t.reviewCommentLabel}
                <textarea required minLength={5} maxLength={600} value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              {/* Hidden from people; only automated form-fillers complete it, and the server then discards the review. */}
              <input className="review-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(event) => setWebsite(event.target.value)} />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-dark" disabled={status === "sending"}>{status === "sending" ? "ENVIANDO..." : t.reviewSubmit} <ArrowUpRight size={16} /></button>
            </form>
          )
        )}
      </div>
    </section>
  );
}
