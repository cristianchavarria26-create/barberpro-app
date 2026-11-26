
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Scissors,
  Upload,
  X,
} from "lucide-react";
import {
  savePending,
  type Confirmation,
  type Pending,
} from "@/app/components/pending";
import {
  addDays,
  formatDate,
  formatPrice,
  todayInChile,
  type BarberItem,
  type ServiceItem,
  type SiteSettings,
} from "@/lib/booking";
import { shrinkImage } from "@/lib/shrink-image";
import { fill, type Texts } from "@/lib/texts";

export type Selection = {
  serviceId: number;
  barberId: number | "any";
  date: string;
};

type Slot = {
  time: string;
  available: boolean;
};

type Props = {
  slug: string;
  selection: Selection;
  services: ServiceItem[];
  barbers: BarberItem[];
  settings: SiteSettings;
  texts: Texts;
  resume?: Pending;
  onClose: () => void;
};

type Transfer = {
  reference: string;
  barber: string;
  instructions: string;
  paidToBarber: boolean;
};

export function Dotted({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text.endsWith(".")) return <>{text}</>;
  return (
    <>
      {text.slice(0, -1)}
      <span className={className}>.</span>
    </>
  );
}

function DepositBox({
  t,
  price,
  deposit,
  phone,
  transfer,
}: {
  t: Texts;
  price: number;
  deposit: number;
  phone: string;
  transfer?: Transfer;
}) {
  const values = {
    telefono: phone,
    reserva: transfer?.reference ?? "",
    barbero: transfer?.barber ?? "",
  };

  return (
    <div className="deposit-box">
      <div className="deposit-row">
        <span>{fill(t.depositLabel, values)}</span>
        <strong>{formatPrice(deposit)}</strong>
      </div>

      {price > deposit && (
        <div className="deposit-row rest">
          <span>{t.depositRest}</span>
          <strong>{formatPrice(price - deposit)}</strong>
        </div>
      )}

      {!transfer ? (
        t.depositWait && <p className="deposit-note">{t.depositWait}</p>
      ) : transfer.instructions ? (
        <>
          <p className="deposit-label">{t.depositData}</p>
          <p className="deposit-data">{transfer.instructions}</p>
          {transfer.paidToBarber && t.depositTo && (
            <p className="deposit-note">{fill(t.depositTo, values)}</p>
          )}
          {t.depositReference && (
            <p className="deposit-note">
              {fill(t.depositReference, values)}
            </p>
          )}
        </>
      ) : (
        <p className="deposit-note">{fill(t.depositCallRef, values)}</p>
      )}
    </div>
  );
}

export default function BookingModal({
  slug,
  selection,
  services,
  barbers,
  settings,
  texts: t,
  resume,
  onClose,
}: Props) {
  const resumed = Boolean(resume);

  const [serviceId, setServiceId] = useState(selection.serviceId);
  const [barberId, setBarberId] = useState<number | "any">(
    selection.barberId
  );
  const [date, setDate] = useState(selection.date);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"schedule" | "details" | "success">(
    resume ? "success" : "schedule"
  );
  const [name, setName] = useState(resume?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(
    resume?.confirmation ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const service =
    services.find((item) => item.id === serviceId) ?? services[0];

  // El abono solo existe cuando el negocio lo activa expresamente.
  const deposit =
    service && settings.requireDeposit ? settings.depositAmount : 0;

  const today = todayInChile();
  const brandFull = `${t.brandName.replace(/\.$/, "")} ${t.brandTagline}`.trim();

  const reference = confirmation
    ? String(confirmation.id).padStart(4, "0")
    : "";

  const values = {
    abono: formatPrice(confirmation ? confirmation.deposit : deposit),
    nombre: name.trim().split(" ")[0],
    reserva: reference,
    telefono: settings.phone,
    barbero: confirmation?.barber ?? "",
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();

      if (event.key !== "Tab" || !dialogRef.current) return;

      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]):not([hidden]), select:not([disabled]), a[href]"
        )
      );

      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (resumed) return;

    const controller = new AbortController();

    const params = new URLSearchParams({
      slug,
      date,
      barber: String(barberId),
      service: String(serviceId),
    });

    fetch(`/api/availability?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No pudimos consultar los horarios."
          );
        }

        setSlots(data.slots);
        setClosed(data.closed);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError(
            err.message || "No pudimos consultar los horarios."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, resumed, date, barberId, serviceId, refresh]);

  function resetAvailability() {
    setLoading(true);
    setTime("");
    setSlots([]);
    setClosed(false);
    setError("");
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          serviceId,
          barberId,
          date,
          time,
          name,
          phone,
          email,
          acceptDeposit: accepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          resetAvailability();
          setStep("schedule");
          setRefresh((value) => value + 1);
        }

        throw new Error(
          data.error || "No pudimos guardar tu reserva."
        );
      }

      setConfirmation(data);
      setStep("success");

      if (data.deposit > 0 && data.token) {
        savePending({
          confirmation: data,
          name,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error. Inténtalo nuevamente."
      );
    } finally {
      setSending(false);
    }
  }

  async function uploadReceipt(file?: File) {
    if (!file || !confirmation?.token) return;

    setUploading(true);
    setReceiptError("");

    try {
      const image = await shrinkImage(file).catch(() => file);

      const body = new FormData();
      body.append("id", String(confirmation.id));
      body.append("token", confirmation.token);
      body.append("slug", slug);
      body.append("file", image, "comprobante.jpg");

      const response = await fetch("/api/appointments/receipt", {
        method: "POST",
        body,
      }).catch(() => null);

      if (!response) {
        throw new Error(
          "No hay conexión. Revisa tu internet e inténtalo de nuevo."
        );
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data?.final) savePending(null);

        throw new Error(
          data?.error ||
            `No pudimos subir la imagen (código ${response.status}). Inténtalo de nuevo.`
        );
      }

      savePending(null);
      setReceiptSent(true);
    } catch (err) {
      setReceiptError(
        err instanceof Error
          ? err.message
          : "No pudimos subir la imagen. Inténtalo de nuevo."
      );
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  function downloadCalendar() {
    if (!confirmation) return;

    const day = confirmation.date.replace(/-/g, "");
    const [hours, minutes] = confirmation.time.split(":").map(Number);
    const end = hours * 60 + minutes + confirmation.duration;

    const startTime = `${String(hours).padStart(2, "0")}${String(
      minutes
    ).padStart(2, "0")}00`;

    const endTime = `${String(Math.floor(end / 60)).padStart(
      2,
      "0"
    )}${String(end % 60).padStart(2, "0")}00`;

    const escape = (value: string) =>
      value.replace(/[,;]/g, (mark) => `\\${mark}`);

    const location = escape(
      `${settings.address}, ${settings.commune}, ${settings.city}`
    );

    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BarberPro//ES",
      "BEGIN:VEVENT",
      `UID:reserva-${confirmation.id}@barberpro`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;TZID=America/Santiago:${day}T${startTime}`,
      `DTEND;TZID=America/Santiago:${day}T${endTime}`,
      `SUMMARY:${escape(
        `${confirmation.service} - ${brandFull}`
      )}`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob([calendar], {
        type: "text/calendar;charset=utf-8",
      })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "reserva.ics";
    link.click();

    URL.revokeObjectURL(url);
  }

  const owes = Boolean(
    confirmation && confirmation.deposit > 0
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        ref={dialogRef}
      >
        <div className="modal-topline">
          <span>{brandFull}</span>
          <span>{t.modalTop}</span>
        </div>

        <button
          className="modal-close"
          ref={closeRef}
          onClick={onClose}
          aria-label="Cerrar reserva"
        >
          <X size={20} />
        </button>

        {step !== "success" && service && (
          <>
            <div className="modal-heading">
              {t.modalKicker && (
                <p className="eyebrow dark-eyebrow">
                  <span /> {t.modalKicker}
                </p>
              )}

              <h2 id="booking-modal-title">
                <Dotted text={t.modalTitle} />
              </h2>

              <p>
                {deposit > 0
                  ? fill(t.modalIntroDeposit, values)
                  : t.modalIntro}
              </p>
            </div>

            <div className="modal-steps" aria-label="Pasos de la reserva">
              <div className={step === "schedule" ? "current" : "done"}>
                <span>
                  {step === "details" ? <Check size={13} /> : "01"}
                </span>
                {t.modalStep1}
              </div>

              <div className={step === "details" ? "current" : ""}>
                <span>02</span>
                {deposit > 0 ? t.modalStep2Deposit : t.modalStep2}
              </div>
            </div>
          </>
        )}

        {step === "schedule" && service && (
          <div className="schedule-step">
            <div className="modal-fields">
              <label className="modal-field">
                <span>{t.quickService}</span>
                <div className="modal-input">
                  <Scissors size={17} />
                  <select
                    value={serviceId}
                    onChange={(event) => {
                      resetAvailability();
                      setServiceId(Number(event.target.value));
                    }}
                    aria-label="Servicio"
                  >
                    {services.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {formatPrice(item.price)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="modal-field">
                <span>{t.quickBarber}</span>
                <div className="modal-input">
                  <select
                    value={String(barberId)}
                    onChange={(event) => {
                      resetAvailability();
                      setBarberId(
                        event.target.value === "any"
                          ? "any"
                          : Number(event.target.value)
                      );
                    }}
                    aria-label="Barbero"
                  >
                    <option value="any">{t.modalAnyBarber}</option>
                    {barbers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="modal-field">
                <span>{t.quickDate}</span>
                <div className="modal-input date-modal-input">
                  <CalendarDays size={17} />
                  <input
                    type="date"
                    value={date}
                    min={today}
                    max={addDays(today, 90)}
                    onChange={(event) => {
                      resetAvailability();
                      setDate(event.target.value);
                    }}
                    aria-label="Fecha de la reserva"
                  />
                </div>
              </label>
            </div>

            <div className="slots-heading">
              <div>
                <h3>{t.modalSlots}</h3>
                <p>{formatDate(date)}</p>
              </div>
              <span>
                <Clock3 size={15} /> {service.duration} MIN
              </span>
            </div>

            <div className="slots-area" aria-live="polite">
              {loading ? (
                <p className="slots-message">{t.modalLoading}</p>
              ) : closed ? (
                <p className="slots-message">{t.modalClosed}</p>
              ) : slots.length === 0 ? (
                <p className="slots-message">{t.modalEmpty}</p>
              ) : (
                <div className="slots-grid">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.time}
                      disabled={!slot.available}
                      className={
                        time === slot.time
                          ? "time-slot selected"
                          : "time-slot"
                      }
                      aria-pressed={time === slot.time}
                      onClick={() => {
                        setTime(slot.time);
                        setError("");
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-bottom">
              <div>
                <span>{t.modalTotal}</span>
                <strong>{formatPrice(service.price)}</strong>
                {deposit > 0 && t.modalDepositHint && (
                  <small>{fill(t.modalDepositHint, values)}</small>
                )}
              </div>

              <button
                className="button button-dark"
                disabled={!time || loading}
                onClick={() => {
                  setError("");
                  setStep("details");
                }}
              >
                {t.modalContinue} <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {step === "details" && service && (
          <form onSubmit={submitReservation} className="details-step">
            <button
              type="button"
              className="back-link"
              onClick={() => {
                setError("");
                setStep("schedule");
              }}
            >
              <ArrowLeft size={15} /> {t.modalBack}
            </button>

            <div className="reservation-summary">
              <div className="summary-icon">
                <Scissors size={21} />
              </div>

              <div>
                <strong>{service.name}</strong>
                <span>
                  {formatDate(date)} · {time} hrs
                </span>
                <span>
                  {barberId === "any"
                    ? t.modalFirstBarber
                    : barbers.find((item) => item.id === barberId)?.name}{" "}
                  · {service.duration} min
                </span>
              </div>

              <b>{formatPrice(service.price)}</b>
            </div>

            {t.modalDetailsTitle && <h3>{t.modalDetailsTitle}</h3>}
            {t.modalDetailsText && (
              <p className="details-help">{t.modalDetailsText}</p>
            )}

            <div className="customer-fields">
              <label>
                {t.modalName}
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder={t.modalNameExample}
                  aria-label="Nombre completo"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>

              <label>
                {t.modalPhone}
                <input
                  required
                  type="tel"
                  maxLength={30}
                  placeholder={t.modalPhoneExample}
                  aria-label="Teléfono"
                  value={phone}
              
