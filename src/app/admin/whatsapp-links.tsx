"use client";

import { MessageCircle } from "lucide-react";
import type { AdminAppointment } from "./dashboard";
import { formatDate, toMobile } from "@/lib/booking";
import { fill, type Texts } from "@/lib/texts";

/**
 * Opens WhatsApp with a message already written for this customer. The owner only has to press send.
 * It uses WhatsApp's own "click to chat" links, so it needs no account or setup.
 */
export default function WhatsAppLinks({ item, texts, brand, address }: { item: AdminAppointment; texts: Texts; brand: string; address: string }) {
  const phone = toMobile(item.customerPhone);
  if (!phone) return <span className="resv-note">WhatsApp: el teléfono no tiene un formato reconocible.</span>;

  const values = {
    nombre: item.customerName.split(" ")[0],
    fecha: formatDate(item.date),
    hora: item.time,
    barbero: item.barberName,
    servicio: item.serviceName,
    direccion: address,
    marca: brand,
    reserva: String(item.id).padStart(4, "0"),
  };
  const link = (template: string) => `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(fill(template, values))}`;

  return (
    <div className="wa-links" role="group" aria-label={`Escribir a ${item.customerName} por WhatsApp`}>
      <span><MessageCircle size={13} /> WhatsApp</span>
      <a href={link(texts.waConfirm)} target="_blank" rel="noopener noreferrer">Confirmar</a>
      <a href={link(texts.waRemind)} target="_blank" rel="noopener noreferrer">Recordar</a>
      <a href={link(texts.waReschedule)} target="_blank" rel="noopener noreferrer">Reprogramar</a>
    </div>
  );
}
