"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Ban, CalendarDays, Camera, Clock3, ExternalLink, LayoutGrid, LogOut, MapPin, Palette, Pencil, Plus, Scissors, Star, Trash2, TrendingUp, Users } from "lucide-react";
import { adminCall, getToken, setToken, type Result } from "./api";
import BlocksPanel, { type AdminBlock } from "./blocks-panel";
import BrandPanel from "./brand-panel";
import CalendarPanel from "./calendar-panel";
import { PhotoPicker } from "./photo-picker";
import ReviewsPanel, { type AdminReview } from "./reviews-panel";
import StatsPanel from "./stats-panel";
import WhatsAppLinks from "./whatsapp-links";
import { DAY_NAMES, DEFAULT_PHOTOS, WEEK_ORDER, formatDate, formatPrice, type DaySchedule, type SiteSettings } from "@/lib/booking";
import { TEXT_FIELDS, TEXT_GROUPS, cleanText, resolveTexts } from "@/lib/texts";

export type Run = (action: () => Promise<Result>, success: string, after?: () => void) => void;
export type PanelProps = { run: Run; pending: boolean };
type AdminService = { id: number; name: string; description: string; duration: number; price: number; active: boolean };
type AdminBarber = { id: number; name: string; role: string; photo: string; paymentInstructions: string; email: string; active: boolean };
export type AdminAppointment = {
  id: number;
  serviceName: string;
  barberName: string;
  barberId: number;
  date: string;
  time: string;
  duration: number;
  price: number;
  depositAmount: number;
  depositPaid: boolean;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  hasReceipt: boolean;
  customerNotice: string | null;
  barberNotice: string | null;
};
export type AdminData = { email: string; settings: SiteSettings; services: AdminService[]; barbers: AdminBarber[]; appointments: AdminAppointment[]; today: string; notify: { email: boolean; sms: boolean }; reviews: AdminReview[]; blocks: AdminBlock[] };

const saveService = (input: object) => adminCall("saveService", { input });
const deleteService = (id: number) => adminCall("deleteService", { id });
const saveBarber = (input: object) => adminCall("saveBarber", { input });
const deleteBarber = (id: number) => adminCall("deleteBarber", { id });
const saveSettings = (input: object) => adminCall("saveSettings", { input });
const saveSchedule = (schedule: DaySchedule[]) => adminCall("saveSchedule", { schedule });
const saveSitePhoto = (slot: string, url: string) => adminCall("saveSitePhoto", { slot, url });
const setDepositPaid = (id: number, paid: boolean) => adminCall("setDepositPaid", { id, paid });
const cancelAppointment = (id: number) => adminCall("cancelAppointment", { id });
const saveTexts = (input: object) => adminCall("saveTexts", { input });

const TABS = [
  { id: "reservas", label: "Reservas", icon: CalendarDays, help: "Cada reserva con su barbero, el cliente y el estado del abono. Desde aquí puedes escribirle por WhatsApp con el mensaje ya listo." },
  { id: "calendario", label: "Calendario", icon: LayoutGrid, help: "El día o la semana de un vistazo: qué barbero está ocupado, qué está bloqueado y dónde queda espacio." },
  { id: "bloqueos", label: "Bloqueos", icon: Ban, help: "Cierra horas en las que no se atiende: almuerzo, un trámite, vacaciones o un día libre. Nadie podrá reservar en ellas." },
  { id: "estadisticas", label: "Estadísticas", icon: TrendingUp, help: "Cómo va el mes: reservas, ingresos estimados, clientes nuevos y cancelaciones." },
  { id: "servicios", label: "Servicios y precios", icon: Scissors, help: "Cambia nombres, precios y duración. Los cambios se ven en el sitio al guardar." },
  { id: "barberos", label: "Barberos", icon: Users, help: "Agrega, edita o quita a las personas del equipo, sus fotos y la cuenta donde cada uno recibe su abono." },
  { id: "horarios", label: "Horarios", icon: Clock3, help: "Define qué días abres y a qué hora. Las horas para reservar se ajustan solas." },
  { id: "local", label: "Dirección y abono", icon: MapPin, help: "Los datos de contacto del local y cómo deben pagar el abono tus clientes." },
  { id: "fotos", label: "Fotos", icon: Camera, help: "Las fotos principales del sitio. Las de cada barbero se cambian en Barberos." },
  { id: "textos", label: "Textos", icon: Pencil, help: "Todo lo que se lee en el sitio. Cambia lo que quieras y guarda; un texto vacío simplemente no se muestra." },
  { id: "resenas", label: "Reseñas", icon: Star, help: "Lo que escriben tus clientes. Tú eliges cuáles se muestran en la página." },
  { id: "apariencia", label: "Apariencia", icon: Palette, help: "Colores, tipografías, forma de los botones y logo del sitio, con vista previa." },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SITE_PHOTOS = [
  { slot: "heroImage", title: "Portada", help: "La imagen grande al entrar al sitio.", action: "Cambiar portada" },
  { slot: "aboutImage", title: "El club", help: "Acompaña la sección sobre la barbería.", action: "Cambiar foto del club" },
  { slot: "visitImage", title: "El local", help: "Se muestra junto a la dirección.", action: "Cambiar foto del local" },
] as const;

const BLANK_SERVICE = { name: "", description: "", duration: "45", price: "", active: true };
const CUSTOMER_NOTICE: Record<string, string> = { email: "Reserva enviada a su correo", sms: "Reserva enviada por SMS", failed: "No se le pudo enviar la reserva", none: "Sin aviso al cliente" };
const BARBER_NOTICE: Record<string, string> = { email: "Avisado por correo", failed: "No se pudo avisar al barbero", none: "Barbero sin aviso por correo" };
const BLANK_BARBER = { name: "", role: "", photo: "", paymentInstructions: "", email: "", active: true };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

function Reservations({ appointments, today, mailOn, settings, run, pending, onError }: PanelProps & { appointments: AdminAppointment[]; today: string; mailOn: boolean; settings: SiteSettings; onError: (text: string) => void }) {
  const siteTexts = resolveTexts(settings.texts);
  const brand = `${siteTexts.brandName.replace(/\.$/, "")} ${siteTexts.brandTagline}`.trim();
  const address = `${settings.address}, ${settings.commune}, ${settings.city}`;
  const [receipt, setReceipt] = useState<{ url: string; title: string } | null>(null);
  const [opening, setOpening] = useState(0);

  // Receipts are private: they are fetched with the session and shown from memory, never from a public address.
  async function openReceipt(item: AdminAppointment) {
    setOpening(item.id);
    try {
      const response = await fetch("/api/admin/receipt", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: getToken(), id: item.id }) }).catch(() => null);
      if (!response) throw new Error("No hay conexión. Revisa tu internet e inténtalo de nuevo.");
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `No pudimos abrir el comprobante (código ${response.status}).`);
      }
      setReceipt({ url: URL.createObjectURL(await response.blob()), title: `Comprobante de ${item.customerName} · reserva Nº ${String(item.id).padStart(4, "0")}` });
    } catch (error) {
      onError(error instanceof Error ? error.message : "No pudimos abrir el comprobante.");
    } finally {
      setOpening(0);
    }
  }

  function closeReceipt() {
    if (receipt) URL.revokeObjectURL(receipt.url);
    setReceipt(null);
  }

  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [barber, setBarber] = useState("all");
  const names = Array.from(new Set(appointments.map((item) => item.barberName))).sort();
  const upcoming = appointments.filter((item) => item.date >= today);
  const owing = upcoming.filter((item) => item.status !== "cancelled" && !item.depositPaid && item.depositAmount > 0);
  const toReview = owing.filter((item) => item.hasReceipt).length;
  const waiting = owing.length - toReview;
  const direction = view === "upcoming" ? 1 : -1;
  const list = (view === "upcoming" ? upcoming : appointments.filter((item) => item.date < today))
    .filter((item) => barber === "all" || item.barberName === barber)
    .sort((a, b) => direction * `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <>
      {!mailOn && <p className="admin-warning">Los avisos por correo están apagados: todavía no hay una cuenta de correo conectada al sitio. En Dirección y abono está lo que falta.</p>}
      {owing.length > 0 && (
        <p className="admin-warning">
          {toReview > 0 && (toReview === 1 ? "Hay 1 comprobante por revisar: ábrelo y, si el pago está bien, marca el abono como recibido. " : `Hay ${toReview} comprobantes por revisar: ábrelos y, si el pago está bien, marca cada abono como recibido. `)}
          {waiting > 0 && (waiting === 1 ? "1 reserva próxima todavía no envía su comprobante." : `${waiting} reservas próximas todavía no envían su comprobante.`)}
        </p>
      )}
      <div className="resv-toolbar">
        <div className="resv-switch">
          <button type="button" className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")}>Próximas</button>
          <button type="button" className={view === "past" ? "active" : ""} onClick={() => setView("past")}>Anteriores</button>
        </div>
        <select className="resv-filter" aria-label="Filtrar por barbero" value={barber} onChange={(event) => setBarber(event.target.value)}>
          <option value="all">Todos los barberos</option>
          {names.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      {list.length === 0 && (
        <p className="admin-empty">{view === "upcoming" ? "No hay reservas próximas. Cuando alguien reserve en el sitio, aparecerá aquí." : "Todavía no hay reservas anteriores."}</p>
      )}
      {list.map((item) => {
        const cancelled = item.status === "cancelled";
        return (
          <article className={`resv ${cancelled ? "is-cancelled" : ""}`} key={item.id}>
            <div className="resv-when">
              <strong>{item.time}</strong>
              <span>{formatDate(item.date, { weekday: "short", day: "numeric", month: "short" })}</span>
              <small>Nº {String(item.id).padStart(4, "0")}</small>
            </div>
            <div className="resv-col">
              <span className="resv-label">Barbero</span>
              <strong>{item.barberName}</strong>
              <span>{item.serviceName} · {item.duration} min</span>
              {item.barberNotice && <span className="resv-note">{BARBER_NOTICE[item.barberNotice] ?? ""}</span>}
            </div>
            <div className="resv-col">
              <span className="resv-label">Cliente</span>
              <strong>{item.customerName}</strong>
              <a href={`tel:${item.customerPhone.replace(/[^\d+]/g, "")}`}>{item.customerPhone}</a>
              {item.customerEmail && <a href={`mailto:${item.customerEmail}`}>{item.customerEmail}</a>}
              {item.customerNotice && <span className="resv-note">{CUSTOMER_NOTICE[item.customerNotice] ?? ""}</span>}
            </div>
            <div className="resv-col">
              <span className="resv-label">Pago</span>
              <strong>{formatPrice(item.price)}</strong>
              <span>Abono {formatPrice(item.depositAmount)}</span>
              {cancelled ? <span className="badge off">Cancelada</span> : item.depositAmount === 0 ? <span className="badge off">Sin abono</span> : item.depositPaid ? <span className="badge paid">Abono recibido</span> : item.hasReceipt ? <span className="badge review">Comprobante por revisar</span> : <span className="badge due">Abono pendiente</span>}
              {item.hasReceipt && <button type="button" className="resv-receipt" disabled={opening === item.id} onClick={() => openReceipt(item)}>{opening === item.id ? "Abriendo..." : "Ver comprobante"}</button>}
            </div>
            {!cancelled && (
              <div className="resv-actions">
                <WhatsAppLinks item={item} texts={siteTexts} brand={brand} address={address} />
                {item.depositAmount > 0 && (
                  <button type="button" className="admin-btn" disabled={pending} onClick={() => run(() => setDepositPaid(item.id, !item.depositPaid), item.depositPaid ? "Abono marcado como pendiente." : "Abono marcado como recibido.")}>
                    {item.depositPaid ? "Marcar pendiente" : "Marcar abono recibido"}
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn danger"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`¿Cancelar la reserva de ${item.customerName}? La hora volverá a quedar disponible y no se puede deshacer.`)) {
                      run(() => cancelAppointment(item.id), "Reserva cancelada. La hora volvió a quedar disponible.");
                    }
                  }}
                >
                  Cancelar reserva
                </button>
              </div>
            )}
          </article>
        );
      })}
    {receipt && (
        <div className="receipt-viewer" role="dialog" aria-modal="true" aria-label={receipt.title} onClick={closeReceipt} onKeyDown={(event) => { if (event.key === "Escape") closeReceipt(); }}>
          <div className="receipt-frame" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-bar"><strong>{receipt.title}</strong><button type="button" className="admin-btn" autoFocus onClick={closeReceipt}>Cerrar</button></div>
            {/* eslint-disable-next-line @next/next/no-img-element -- a private image held in memory, not a public address */}
            <img src={receipt.url} alt={receipt.title} />
          </div>
        </div>
      )}
    </>
  );
}

function ServiceForm({ service, run, pending }: PanelProps & { service?: AdminService }) {
  const [form, setForm] = useState(
    service ? { name: service.name, description: service.description, duration: String(service.duration), price: String(service.price), active: service.active } : BLANK_SERVICE,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      () => saveService({ id: service?.id, name: form.name, description: form.description, duration: Number(form.duration), price: Number(form.price), active: form.active }),
      service ? "Servicio actualizado." : "Servicio agregado.",
      service ? undefined : () => setForm(BLANK_SERVICE),
    );
  }

  return (
    <form className={`admin-card ${service ? "" : "is-new"}`} aria-label={service ? `Servicio ${service.name}` : "Agregar servicio"} onSubmit={submit}>
      {!service && <h2>Agregar servicio</h2>}
      <div className="admin-grid grid-service">
        <label className="admin-field">Nombre
          <input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="admin-field">Descripción
          <input maxLength={200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="admin-field">Duración (min)
          <input type="number" required min={10} max={240} step={5} value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
        </label>
        <label className="admin-field">Precio (CLP)
          <input type="number" required min={0} max={10000000} step={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        </label>
      </div>
      <div className="admin-foot">
        <label className="admin-check">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Visible en el sitio
        </label>
        <div className="admin-foot-actions">
          {service && (
            <button
              type="button"
              className="admin-btn danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`¿Quitar "${service.name}"? Dejará de ofrecerse en el sitio.`)) run(() => deleteService(service.id), "Servicio quitado.");
              }}
            >
              <Trash2 size={14} /> Quitar
            </button>
          )}
          <button className="admin-btn primary" disabled={pending}>{service ? "Guardar" : <><Plus size={14} /> Agregar</>}</button>
        </div>
      </div>
    </form>
  );
}

function BarberForm({ barber, run, pending, onError }: PanelProps & { barber?: AdminBarber; onError: (text: string) => void }) {
  const [form, setForm] = useState(barber ? { name: barber.name, role: barber.role, photo: barber.photo, paymentInstructions: barber.paymentInstructions, email: barber.email, active: barber.active } : BLANK_BARBER);

  // For someone already on the team a photo change is saved straight away, so it cannot be forgotten.
  function changePhoto(photo: string) {
    setForm({ ...form, photo });
    if (barber) run(() => saveBarber({ id: barber.id, ...form, photo }), photo ? "Foto actualizada." : "Foto quitada.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() => saveBarber({ id: barber?.id, ...form }), barber ? "Barbero actualizado." : "Barbero agregado.", barber ? undefined : () => setForm(BLANK_BARBER));
  }

  return (
    <form className={`admin-card ${barber ? "" : "is-new"}`} aria-label={barber ? `Barbero ${barber.name}` : "Agregar barbero"} onSubmit={submit}>
      {!barber && <h2>Agregar barbero</h2>}
      <div className="barber-row">
        <div className="admin-photo">
          {form.photo ? <Image src={form.photo} alt="" width={192} height={240} unoptimized /> : initials(form.name) || <Users size={26} />}
        </div>
        <div>
          <div className="admin-grid grid-barber">
            <label className="admin-field">Nombre
              <input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="admin-field">Especialidad
              <input maxLength={80} placeholder="Ej: Especialista en fade" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
            </label>
            <label className="admin-field">Correo para sus avisos
              <input type="email" maxLength={160} placeholder="Recibe aquí sus reservas y pantallazos" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="admin-field wide">Datos para transferirle el abono
              <textarea maxLength={1000} placeholder={"Banco, tipo y número de cuenta\nNombre y RUT del titular\nCorreo para el comprobante"} value={form.paymentInstructions} onChange={(event) => setForm({ ...form, paymentInstructions: event.target.value })} />
            </label>
          </div>
          <div className="admin-foot-actions photo-actions">
            <PhotoPicker label={form.photo ? "Cambiar foto" : "Subir foto"} disabled={pending} onUploaded={changePhoto} onError={onError} />
            {form.photo && <button type="button" className="admin-btn" disabled={pending} onClick={() => changePhoto("")}>Quitar foto</button>}
          </div>
        </div>
      </div>
      <div className="admin-foot">
        <label className="admin-check">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Visible en el sitio
        </label>
        <div className="admin-foot-actions">
          {barber && (
            <button
              type="button"
              className="admin-btn danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`¿Quitar a ${barber.name} del equipo?`)) run(() => deleteBarber(barber.id), "Barbero quitado.");
              }}
            >
              <Trash2 size={14} /> Quitar
            </button>
          )}
          <button className="admin-btn primary" disabled={pending}>{barber ? "Guardar" : <><Plus size={14} /> Agregar</>}</button>
        </div>
      </div>
    </form>
  );
}

function ScheduleForm({ schedule, run, pending }: PanelProps & { schedule: DaySchedule[] }) {
  const [days, setDays] = useState<DaySchedule[]>(() => DAY_NAMES.map((_, index) => schedule[index] ?? { open: false, start: "10:00", end: "19:00" }));
  const update = (index: number, patch: Partial<DaySchedule>) => setDays((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));

  return (
    <form className="admin-card" aria-label="Horarios" onSubmit={(event) => { event.preventDefault(); run(() => saveSchedule(days), "Horarios actualizados."); }}>
      {WEEK_ORDER.map((index) => {
        const day = days[index];
        const name = DAY_NAMES[index];
        return (
          <div className="schedule-row" key={index}>
            <strong>{name}</strong>
            <label className="admin-check">
              <input type="checkbox" aria-label={`${name} abierto`} checked={day.open} onChange={(event) => update(index, { open: event.target.checked })} /> Abierto
            </label>
            {day.open ? (
              <div className="schedule-times">
                <input type="time" required aria-label={`${name}, hora de apertura`} value={day.start} onChange={(event) => update(index, { start: event.target.value })} />
                a
                <input type="time" required aria-label={`${name}, hora de cierre`} value={day.end} onChange={(event) => update(index, { end: event.target.value })} />
              </div>
            ) : (
              <span className="schedule-closed">Cerrado</span>
            )}
          </div>
        );
      })}
      <div className="admin-foot"><span /><button className="admin-btn primary" disabled={pending}>Guardar horarios</button></div>
    </form>
  );
}

function SettingsForm({ settings, barbers, notify, run, pending }: PanelProps & { settings: SiteSettings; barbers: AdminBarber[]; notify: AdminData["notify"] }) {
  const [form, setForm] = useState({
    address: settings.address,
    commune: settings.commune,
    city: settings.city,
    phone: settings.phone,
    email: settings.email,
    depositAmount: String(settings.depositAmount),
    paymentInstructions: settings.paymentInstructions,
  });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  // Barbers shown on the site who have no account of their own; they rely on the general one below.
  const missing = barbers.filter((barber) => barber.active && !barber.paymentInstructions.trim()).map((barber) => barber.name);
  const noEmail = barbers.filter((barber) => barber.active && !barber.email.trim()).map((barber) => barber.name);

  return (
    <form aria-label="Dirección y abono" onSubmit={(event) => { event.preventDefault(); run(() => saveSettings({ ...form, depositAmount: Number(form.depositAmount) }), "Datos actualizados."); }}>
      {Number(form.depositAmount) > 0 && !form.paymentInstructions.trim() && missing.length > 0 && (
        <p className="admin-warning">
          Sin datos para recibir el abono: {missing.join(", ")}. A sus clientes se les pedirá llamar al local para pagarlo. Agrega la cuenta de cada uno en Barberos, o escribe aquí unos datos generales.
        </p>
      )}
      <div className="admin-card">
        <h2>Dirección y contacto</h2>
        <div className="admin-grid grid-settings">
          <label className="admin-field">Dirección<input required maxLength={160} value={form.address} onChange={set("address")} /></label>
          <label className="admin-field">Comuna<input required maxLength={80} value={form.commune} onChange={set("commune")} /></label>
          <label className="admin-field">Ciudad<input required maxLength={80} value={form.city} onChange={set("city")} /></label>
          <label className="admin-field">Teléfono<input required type="tel" maxLength={30} value={form.phone} onChange={set("phone")} /></label>
          <label className="admin-field">Correo de contacto<input required type="email" maxLength={160} value={form.email} onChange={set("email")} /></label>
        </div>
      </div>
      <div className="admin-card">
        <h2>Abono para reservar</h2>
        <div className="admin-grid grid-settings">
          <label className="admin-field">Monto del abono (CLP)
            <input type="number" required min={0} max={1000000} step={1} value={form.depositAmount} onChange={set("depositAmount")} />
          </label>
          <label className="admin-field wide">Datos generales para transferir el abono
            <textarea maxLength={1000} placeholder={"Banco, tipo y número de cuenta\nNombre y RUT del titular\nCorreo para el comprobante"} value={form.paymentInstructions} onChange={set("paymentInstructions")} />
          </label>
        </div>
        <div className="admin-foot">
          <span className="admin-hint">Se usan cuando el barbero no tiene sus propios datos (se agregan en Barberos). Es el mismo monto para todos los servicios; con 0 no se pide abono.</span>
          <button className="admin-btn primary" disabled={pending}>Guardar datos</button>
        </div>
      </div>
    <div className="admin-card">
        <h2>Avisos por correo y SMS</h2>
        <ul className="notify-list">
          <li className={notify.email ? "on" : "off"}>
            <strong>Correo: {notify.email ? "conectado" : "sin conectar"}.</strong>{" "}
            {notify.email
              ? "El cliente recibe su reserva por correo y cada barbero recibe el pantallazo del abono en el suyo."
              : "Hoy no se envía ningún correo. Para activarlo hay que agregar a la configuración del sitio una cuenta de correo, con las variables SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS."}
          </li>
          <li className={notify.sms ? "on" : "off"}>
            <strong>SMS: {notify.sms ? "conectado" : "sin conectar"}.</strong>{" "}
            {notify.sms
              ? "El cliente que no deja correo recibe su reserva por SMS."
              : "Los clientes que no dejan correo no reciben aviso. Para activarlo se necesita una cuenta de Twilio, con las variables TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM."}
          </li>
        </ul>
        {noEmail.length > 0 && <p className="admin-hint">Barberos sin correo para sus avisos: {noEmail.join(", ")}. Agrégalo en Barberos.</p>}
      </div>
    </form>
  );
}

function SitePhotos({ settings, run, pending, onError }: PanelProps & { settings: SiteSettings; onError: (text: string) => void }) {
  return (
    <div className="photo-grid">
      {SITE_PHOTOS.map(({ slot, title, help, action }) => (
        <div className="admin-card photo-card" key={slot}>
          <div className="admin-photo"><Image src={settings[slot]} alt={`Foto actual: ${title}`} width={480} height={300} unoptimized /></div>
          <h2>{title}</h2>
          <p>{help}</p>
          <div className="admin-foot-actions">
            <PhotoPicker label={action} disabled={pending} onUploaded={(url) => run(() => saveSitePhoto(slot, url), "Foto actualizada.")} onError={onError} />
            {settings[slot] !== DEFAULT_PHOTOS[slot] && (
              <button type="button" className="admin-btn" disabled={pending} onClick={() => run(() => saveSitePhoto(slot, ""), "Foto original restaurada.")}>Quitar y volver a la original</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextsForm({ saved, run, pending }: PanelProps & { saved: Record<string, string> }) {
  const stored: Record<string, string> = resolveTexts(saved);
  const [values, setValues] = useState<Record<string, string>>(() => resolveTexts(saved));
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const unsaved = TEXT_FIELDS.filter((field) => cleanText(values[field.key] ?? "") !== stored[field.key]).length;
  const groups = TEXT_GROUPS.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => !needle || field.label.toLowerCase().includes(needle) || (values[field.key] ?? "").toLowerCase().includes(needle)),
  })).filter((group) => group.fields.length > 0);

  return (
    <form aria-label="Textos del sitio" onSubmit={(event) => { event.preventDefault(); run(() => saveTexts(values), "Textos actualizados. Ya se ven en el sitio."); }}>
      <div className="texts-toolbar">
        <input type="search" className="resv-filter texts-search" placeholder="Buscar un texto…" aria-label="Buscar un texto" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
        <span className={`texts-status ${unsaved ? "dirty" : ""}`}>{unsaved === 0 ? "Todo guardado" : unsaved === 1 ? "1 texto sin guardar" : `${unsaved} textos sin guardar`}</span>
        <button className="admin-btn primary" disabled={pending || unsaved === 0}>Guardar textos</button>
      </div>
      {groups.length === 0 && <p className="admin-empty">Ningún texto coincide con “{query.trim()}”.</p>}
      {groups.map((group) => (
        <section className="admin-card" key={group.id}>
          <h2>{group.title}</h2>
          {group.help && <p className="texts-help">{group.help}</p>}
          <div className="admin-grid grid-texts">
            {group.fields.map((field) => {
              const id = `text-${field.key}`;
              const value = values[field.key] ?? "";
              const change = (next: string) => setValues((current) => ({ ...current, [field.key]: next }));
              return (
                <div className={`admin-field ${field.multiline ? "wide" : ""}`} key={field.key}>
                  <div className="texts-label">
                    <label htmlFor={id}>{field.label}</label>
                    {cleanText(value) !== field.text && <button type="button" className="texts-reset" onClick={() => change(field.text)}>Volver al original</button>}
                  </div>
                  {field.multiline
                    ? <textarea id={id} maxLength={600} required={field.required} value={value} onChange={(event) => change(event.target.value)} />
                    : <input id={id} maxLength={160} required={field.required} value={value} onChange={(event) => change(event.target.value)} />}
                  {field.hint && <small className="texts-hint">{field.hint}</small>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </form>
  );
}

export default function Dashboard({ data, onReload, onExpired }: { data: AdminData; onReload: () => void; onExpired: () => void }) {
  const { email, settings, services, barbers, appointments, today } = data;
  const [tab, setTab] = useState<TabId>("reservas");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const current = TABS.find((item) => item.id === tab) ?? TABS[0];
  const showError = (text: string) => setNotice({ ok: false, text });
  const brandName = resolveTexts(settings.texts).brandName;

  const run: Run = (action, success, after) => {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setNotice({ ok: false, text: result.error });
          if (result.expired) onExpired();
          return;
        }
        setNotice({ ok: true, text: success });
        after?.();
        onReload();
      } catch {
        setNotice({ ok: false, text: "No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo." });
      }
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-shell admin-header-inner">
          <span className="brand"><span className="brand-symbol"><Scissors size={24} strokeWidth={1.8} /><i /></span><span className="brand-words"><strong>{brandName.endsWith(".") ? <>{brandName.slice(0, -1)}<span>.</span></> : brandName}</strong><small>ADMINISTRACIÓN</small></span></span>
          <div className="admin-header-actions">
            <span className="admin-user">{email}</span>
            <Link href="/" className="admin-btn"><ExternalLink size={14} /> Ver sitio</Link>
            <button type="button" className="admin-btn" disabled={pending} onClick={() => startTransition(async () => { await adminCall("logout"); setToken(""); onReload(); })}><LogOut size={14} /> Salir</button>
          </div>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Secciones del panel">
        <div className="admin-shell admin-tabs-inner">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={`admin-tab ${tab === id ? "active" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setNotice(null); }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </nav>
      <main className="admin-shell admin-main">
        <div className="admin-title"><div><h1>{current.label}</h1><p>{current.help}</p></div></div>
        {tab === "reservas" && <Reservations appointments={appointments} today={today} mailOn={data.notify.email} settings={settings} run={run} pending={pending} onError={showError} />}
        {tab === "servicios" && (
          <>
            {services.map((service) => <ServiceForm key={service.id} service={service} run={run} pending={pending} />)}
            <ServiceForm run={run} pending={pending} />
          </>
        )}
        {tab === "barberos" && (
          <>
            {barbers.map((barber) => <BarberForm key={barber.id} barber={barber} run={run} pending={pending} onError={showError} />)}
            <BarberForm run={run} pending={pending} onError={showError} />
          </>
        )}
        {tab === "horarios" && <ScheduleForm schedule={settings.schedule} run={run} pending={pending} />}
        {tab === "local" && <SettingsForm settings={settings} barbers={barbers} notify={data.notify} run={run} pending={pending} />}
        {tab === "fotos" && <SitePhotos settings={settings} run={run} pending={pending} onError={showError} />}
        {tab === "textos" && <TextsForm saved={settings.texts} run={run} pending={pending} />}
        {tab === "calendario" && <CalendarPanel appointments={appointments} barbers={barbers} blocks={data.blocks} schedule={settings.schedule} today={today} />}
        {tab === "bloqueos" && <BlocksPanel blocks={data.blocks} barbers={barbers} appointments={appointments} today={today} run={run} pending={pending} />}
        {tab === "estadisticas" && <StatsPanel today={today} />}
        {tab === "resenas" && <ReviewsPanel reviews={data.reviews} run={run} pending={pending} />}
        {tab === "apariencia" && <BrandPanel saved={settings.theme} brandName={brandName} brandTagline={resolveTexts(settings.texts).brandTagline} run={run} pending={pending} onError={showError} />}
      </main>
      {notice && <p className={`admin-notice ${notice.ok ? "ok" : "error"}`} role="status">{notice.text}</p>}
    </div>
  );
}
