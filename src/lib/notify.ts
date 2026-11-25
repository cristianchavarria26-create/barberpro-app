import nodemailer, { type Transporter } from "nodemailer";
import { formatDate, formatPrice, toMobile } from "@/lib/booking";

// Email goes out through any SMTP account (Gmail, Outlook, a hosting mailbox...) and SMS through
// Twilio. Both are configured with environment variables; while they are missing nothing is sent,
// and every reservation records honestly that no notice went out.
//   Email: SMTP_HOST, SMTP_PORT (587 by default), SMTP_USER, SMTP_PASS, MAIL_FROM (optional)
//   SMS:   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID

/** How a person was told about a reservation: by email, by SMS, an attempt that failed, or nothing to send with. */
export type Notice = "email" | "sms" | "failed" | "none";
type Outcome = "sent" | "failed" | "off";

export type Booking = {
  id: number;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  deposit: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  /** Where to transfer the deposit; empty when neither the barber nor the shop has an account loaded. */
  instructions: string;
};
export type Shop = { brand: string; address: string; phone: string };
type Attachment = { filename: string; content: Buffer; contentType: string };

const env = (name: string) => process.env[name]?.trim() ?? "";
const reference = (id: number) => String(id).padStart(4, "0");
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function mailReady() {
  return Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS"));
}

export function smsReady() {
  return Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && (env("TWILIO_FROM") || env("TWILIO_MESSAGING_SERVICE_SID")));
}

// Reservations are open to anyone, so the number of messages per hour is capped: a flood of fake
// reservations cannot turn the shop's mail account into a spam source or run up an SMS bill.
const recent: Record<"mail" | "sms", number[]> = { mail: [], sms: [] };
function underLimit(kind: "mail" | "sms", max: number) {
  const cutoff = Date.now() - 60 * 60 * 1000;
  recent[kind] = recent[kind].filter((time) => time > cutoff);
  if (recent[kind].length >= max) return false;
  recent[kind].push(Date.now());
  return true;
}

let transporter: Transporter | null = null;
function mailer() {
  if (!transporter) {
    const port = Number(env("SMTP_PORT")) || 587;
    transporter = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port,
      secure: port === 465,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

async function sendMail(to: string, subject: string, text: string, attachment?: Attachment): Promise<Outcome> {
  if (!mailReady()) return "off";
  if (!underLimit("mail", 120)) {
    console.error("Mail not sent: hourly limit reached");
    return "failed";
  }
  try {
    await mailer().sendMail({
      from: env("MAIL_FROM") || env("SMTP_USER"),
      // Passed as a single address object so nothing typed by a customer can add extra recipients.
      to: { name: "", address: to },
      subject: oneLine(subject).slice(0, 200),
      text,
      attachments: attachment ? [attachment] : undefined,
    });
    return "sent";
  } catch (error) {
    console.error("Mail error:", error instanceof Error ? error.message : error);
    return "failed";
  }
}

async function sendSms(phone: string, body: string): Promise<Outcome> {
  if (!smsReady()) return "off";
  const to = toMobile(phone);
  if (!to) return "failed";
  if (!underLimit("sms", 40)) {
    console.error("SMS not sent: hourly limit reached");
    return "failed";
  }
  const sid = env("TWILIO_ACCOUNT_SID");
  const form = new URLSearchParams({ To: to, Body: body });
  if (env("TWILIO_MESSAGING_SERVICE_SID")) form.set("MessagingServiceSid", env("TWILIO_MESSAGING_SERVICE_SID"));
  else form.set("From", env("TWILIO_FROM"));
  try {
    const response = await fetch(`${env("TWILIO_API_BASE") || "https://api.twilio.com"}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return "sent";
    console.error("SMS error:", response.status, (await response.text()).slice(0, 200));
    return "failed";
  } catch (error) {
    console.error("SMS error:", error instanceof Error ? error.message : error);
    return "failed";
  }
}

function details(booking: Booking) {
  return [
    `Reserva Nº ${reference(booking.id)}`,
    `Servicio: ${booking.service} (${formatPrice(booking.price)})`,
    `Fecha: ${formatDate(booking.date)}`,
    `Hora: ${booking.time} hrs`,
    `Barbero: ${booking.barber}`,
  ];
}

function customerMail(booking: Booking, shop: Shop) {
  const lines = [`Hola ${oneLine(booking.customerName)}:`, "", `Recibimos tu reserva en ${shop.brand}.`, "", ...details(booking), `Dirección: ${shop.address}`, ""];
  if (booking.deposit > 0) {
    lines.push(`Para dejar tu hora confirmada, abona ${formatPrice(booking.deposit)}.`, "");
    if (booking.instructions) {
      lines.push("Datos para transferir:", booking.instructions, "", `Escribe "Reserva ${reference(booking.id)}" en el comentario de la transferencia.`);
    } else {
      lines.push(`Para pagar el abono, llama al ${shop.phone}.`);
    }
    lines.push("Después de transferir, sube el pantallazo del pago en la página, desde el mismo dispositivo en que reservaste.");
    if (booking.price > booking.deposit) lines.push(`El saldo de ${formatPrice(booking.price - booking.deposit)} lo pagas en la barbería.`);
  } else {
    lines.push("Tu hora está confirmada. ¡Te esperamos!");
  }
  lines.push("", `Si necesitas cambiar o cancelar tu hora, llámanos al ${shop.phone}.`, "", shop.brand);
  return { subject: `Tu reserva Nº ${reference(booking.id)} en ${shop.brand}: ${formatDate(booking.date, { weekday: "short", day: "numeric", month: "short" })}, ${booking.time} hrs`, text: lines.join("\n") };
}

// Plain letters only: an SMS with accents is sent in a costlier encoding with 70 characters per part.
function customerSms(booking: Booking, shop: Shop) {
  const when = `${formatDate(booking.date, { weekday: "short", day: "numeric", month: "short" })} ${booking.time} hrs`;
  const next = booking.deposit > 0 ? `Abono ${formatPrice(booking.deposit)}: sube el pantallazo del pago en la pagina para confirmar.` : "Te esperamos.";
  return oneLine(`${shop.brand}: reserva N ${reference(booking.id)}, ${when} con ${booking.barber}. ${next}`).normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 300);
}

function barberMail(booking: Booking, shop: Shop, receipt: "new" | "replaced" | "none") {
  const customer = oneLine(booking.customerName);
  const opening =
    receipt === "none"
      ? `${customer} reservó una hora contigo.`
      : receipt === "new"
        ? `${customer} subió el pantallazo del abono de su reserva contigo. Va adjunto a este correo.`
        : `${customer} cambió el pantallazo del abono de su reserva contigo. El nuevo va adjunto a este correo.`;
  const lines = [`Hola ${booking.barber.split(" ")[0]}:`, "", opening, "", ...details(booking), `Cliente: ${customer}`, `Teléfono: ${oneLine(booking.customerPhone)}`];
  if (booking.customerEmail) lines.push(`Correo: ${booking.customerEmail}`);
  if (booking.deposit > 0) {
    lines.push(`Abono: ${formatPrice(booking.deposit)}`);
    if (booking.price > booking.deposit) lines.push(`Saldo en la barbería: ${formatPrice(booking.price - booking.deposit)}`);
    lines.push("", "Revisa que el pago haya llegado a tu cuenta. El abono se marca como recibido en el panel de administración.");
  }
  lines.push("", shop.brand);
  const when = `${formatDate(booking.date, { weekday: "short", day: "numeric", month: "short" })}, ${booking.time} hrs`;
  return { subject: `${receipt === "none" ? "Nueva reserva" : "Pantallazo de abono"} Nº ${reference(booking.id)}: ${customer}, ${when}`, text: lines.join("\n") };
}

/** Sends the reservation to the customer: to their email if they left one, otherwise by SMS to their phone. */
export async function notifyCustomer(booking: Booking, shop: Shop): Promise<Notice> {
  let failed = false;
  if (booking.customerEmail) {
    const message = customerMail(booking, shop);
    const outcome = await sendMail(booking.customerEmail, message.subject, message.text);
    if (outcome === "sent") return "email";
    failed = outcome === "failed";
  }
  const outcome = await sendSms(booking.customerPhone, customerSms(booking, shop));
  if (outcome === "sent") return "sms";
  return failed || outcome === "failed" ? "failed" : "none";
}

/** Sends the reservation to its barber, with the customer's payment screenshot attached when there is one. */
export async function notifyBarber(email: string, booking: Booking, shop: Shop, receipt?: { image: Buffer; mimeType: string; replaced: boolean }): Promise<Notice> {
  if (!email) return "none";
  const message = barberMail(booking, shop, receipt ? (receipt.replaced ? "replaced" : "new") : "none");
  const extension = receipt?.mimeType === "image/png" ? "png" : receipt?.mimeType === "image/webp" ? "webp" : "jpg";
  const attachment = receipt ? { filename: `pantallazo-reserva-${reference(booking.id)}.${extension}`, content: receipt.image, contentType: receipt.mimeType } : undefined;
  const outcome = await sendMail(email, message.subject, message.text, attachment);
  return outcome === "sent" ? "email" : outcome === "failed" ? "failed" : "none";
}
