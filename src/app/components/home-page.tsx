"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Camera, Check, ChevronDown, Clock3, Coffee, Crown, MapPin, Menu, Phone, ScanFace, Scissors, Sparkles, Star, UserRound, X } from "lucide-react";
import BookingModal, { Dotted, type Selection } from "@/app/components/booking-modal";
import { parsePending, readPending, subscribePending, type Pending } from "@/app/components/pending";
import Reviews, { type PublicReview } from "@/app/components/reviews";
import { addDays, formatPrice, scheduleSummary, type BarberItem, type ServiceItem, type SiteSettings } from "@/lib/booking";
import { fill, type Texts } from "@/lib/texts";
import type { Theme } from "@/lib/theme";

type Props = { settings: SiteSettings; texts: Texts; theme: Theme; reviews: PublicReview[]; services: ServiceItem[]; barbers: BarberItem[]; initialDate: string; today: string };

const serviceIcons = [Scissors, Sparkles, ScanFace, Crown];
const twoDigits = (value: number) => String(value).padStart(2, "0");
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

function Brand({ name, tagline, logo, logoText }: { name: string; tagline: string; logo: string; logoText: boolean }) {
  return (
    <a href="#inicio" className="brand" aria-label={`${name.replace(/\.$/, "")} ${tagline}, inicio`}>
      {logo ? <Image className="brand-logo" src={logo} alt="" width={160} height={44} unoptimized /> : <span className="brand-symbol"><Scissors size={24} strokeWidth={1.8} /><i /></span>}
      {(logoText || !logo) && <span className="brand-words"><strong><Dotted text={name} /></strong><small>{tagline}</small></span>}
    </a>
  );
}

// Photos uploaded from the panel are already resized, so they are served as they are.
function Photo({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return <Image src={src} alt={alt} width={width} height={height} loading="lazy" unoptimized={src.startsWith("/api/")} />;
}

export default function HomePage({ settings, texts: t, theme, reviews, services, barbers, initialDate, today }: Props) {
  const [selection, setSelection] = useState<Selection>({ serviceId: services[0]?.id ?? 0, barberId: "any", date: initialDate });
  const [modalSelection, setModalSelection] = useState<Selection | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resume, setResume] = useState<Pending | null>(null);
  // A reservation made on this device whose payment screenshot was not uploaded yet.
  const pendingRaw = useSyncExternalStore(subscribePending, readPending, () => null);
  const pending = useMemo(() => parsePending(pendingRaw, today), [pendingRaw, today]);
  const canBook = services.length > 0 && barbers.length > 0;
  const hours = scheduleSummary(settings.schedule);
  const place = `${settings.commune}, ${settings.city}`;
  const city = settings.city.toUpperCase();
  const phoneHref = `tel:${settings.phone.replace(/[^\d+]/g, "")}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.address}, ${place}`)}`;
  const brandFull = `${t.brandName.replace(/\.$/, "")} ${t.brandTagline}`.trim();
  const depositNote = fill(settings.depositAmount > 0 ? t.quickDepositNote : t.quickNoDeposit, { abono: formatPrice(settings.depositAmount) });
  const nav = [["#inicio", t.navHome], ["#servicios", t.navServices], ["#club", t.navClub], ["#equipo", t.navTeam], ["#contacto", t.navContact]];

  function openBooking(overrides: Partial<Selection> = {}) {
    if (!canBook) return;
    setModalSelection({ ...selection, date: selection.date || initialDate, ...overrides });
    setMenuOpen(false);
  }

  return (
    <main id="inicio">
      <div className="utility-bar"><div className="shell utility-inner"><span>{t.topTagline && <><span className="utility-dot" /> {t.topTagline}</>}</span><span>{place.toUpperCase()} <span className="utility-separator">/</span> {hours[0]?.toUpperCase()}</span></div></div>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand name={t.brandName} tagline={t.brandTagline} logo={theme.logo} logoText={theme.logoText} />
          <nav className="desktop-nav" aria-label="Navegación principal">{nav.map(([href, label], index) => <a key={href} href={href} className={index === 0 ? "active" : undefined}>{label}</a>)}</nav>
          <div className="header-actions"><a href={phoneHref} className="header-phone" aria-label="Llamar a la barbería"><Phone size={16} /><span>{settings.phone}</span></a><button className="button header-book" disabled={!canBook} onClick={() => openBooking()}>{t.bookShort} <ArrowUpRight size={16} /></button></div>
          <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
        {menuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Navegación móvil">{nav.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}<button className="button" disabled={!canBook} onClick={() => openBooking()}>{t.bookShort} <ArrowRight size={16} /></button></nav>}
      </header>

      {pending && !resume && !modalSelection && <div className="pending-bar" role="status"><div className="shell pending-inner"><span>{t.pendingBanner}</span><button className="button button-dark" onClick={() => setResume(pending)}>{t.receiptButton} <ArrowRight size={15} /></button></div></div>}

      <section className="hero" aria-label={`Bienvenido a ${brandFull}`}>
        <div className="hero-image" style={{ backgroundImage: `url("${settings.heroImage}")` }} />
        <div className="hero-overlay" />
        <div className="shell hero-inner">
          <div className="hero-copy">
            {t.heroEyebrow && <div className="hero-eyebrow"><span className="short-line" /> {t.heroEyebrow} <span className="hero-spark">✳</span></div>}
            <h1>
              {t.heroTitle1 && <><Dotted text={t.heroTitle1} className="hero-period" /><br /></>}
              {t.heroTitle2 && <><Dotted text={t.heroTitle2} className="hero-period" /><br /></>}
              <em>{t.heroTitle3}</em>
            </h1>
            {t.heroText && <p>{t.heroText}</p>}
            <div className="hero-actions"><button className="button button-gold hero-button" disabled={!canBook} onClick={() => openBooking()}>{t.bookLong} <ArrowUpRight size={18} /></button>{t.heroLink && <a className="hero-text-link" href="#servicios">{t.heroLink} <ArrowDown size={15} /></a>}</div>
            {(t.heroProofBold || t.heroProof) && <div className="hero-proof"><div className="proof-stars" aria-hidden="true"><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /></div><span className="proof-divider" /><p><strong>{t.heroProofBold}</strong> {t.heroProof}</p></div>}
          </div>
          <div className="hero-side-note">{t.heroSide && <><span>{t.heroSide}</span><i /></>}<span>{city}, CHILE</span></div>
          <div className="hero-index"><span>01</span><i /><span>03</span></div>
        </div>
      </section>

      <div className="booking-section" id="reserva">
        <div className="shell booking-wrap">
          <div className="quick-booking">
            <div className="quick-intro">{t.quickKicker && <p><span>✳</span> {t.quickKicker}</p>}<h2>{t.quickTitle}</h2><small>{canBook ? t.quickText : t.emptyBooking}</small></div>
            <label className="quick-field"><span>01 <i>/</i> {t.quickService}</span><div className="quick-control"><Scissors size={17} /><select aria-label="Selecciona un servicio" disabled={!canBook} value={selection.serviceId} onChange={(event) => setSelection({ ...selection, serviceId: Number(event.target.value) })}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><ChevronDown size={15} /></div></label>
            <label className="quick-field"><span>02 <i>/</i> {t.quickBarber}</span><div className="quick-control"><UserRound size={17} /><select aria-label="Selecciona un barbero" disabled={!canBook} value={String(selection.barberId)} onChange={(event) => setSelection({ ...selection, barberId: event.target.value === "any" ? "any" : Number(event.target.value) })}><option value="any">{t.quickAny}</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select><ChevronDown size={15} /></div></label>
            <label className="quick-field date-field"><span>03 <i>/</i> {t.quickDate}</span><div className="quick-control"><CalendarDays size={17} /><input type="date" aria-label="Selecciona una fecha" disabled={!canBook} value={selection.date} min={today} max={addDays(today, 90)} onChange={(event) => setSelection({ ...selection, date: event.target.value })} /></div></label>
            <button className="button button-dark quick-submit" disabled={!canBook} onClick={() => openBooking()}>{t.quickButton} <ArrowRight size={18} /></button>
          </div>
          <div className="booking-under">{t.quickNote1 && <span><Check size={13} /> {t.quickNote1}</span>}{depositNote && <span><Check size={13} /> {depositNote}</span>}{t.quickNote3 && <span className="under-right">{t.quickNote3} <b>✳</b></span>}</div>
        </div>
      </div>

      <section className="services section-light" id="servicios">
        <div className="shell">
          <div className="section-heading service-heading"><div><p className="section-kicker"><span>01</span> / {t.servicesKicker} <i /></p><h2>{t.servicesTitle1 && <><Dotted text={t.servicesTitle1} /><br /></>}<em>{t.servicesTitle2}</em></h2></div><div className="section-heading-aside">{t.servicesText && <p>{t.servicesText}</p>}{t.servicesLink && <a href="#lista-servicios">{t.servicesLink} <ArrowDown size={15} /></a>}</div></div>
          <div className="service-grid" id="lista-servicios">
            {services.map((service, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];
              return <button key={service.id} className={`service-card ${index === 1 ? "featured" : ""}`} disabled={!canBook} onClick={() => openBooking({ serviceId: service.id })} aria-label={`Reservar ${service.name} por ${formatPrice(service.price)}`}><div className="service-card-top"><span className="service-icon"><Icon size={26} strokeWidth={1.4} /></span><span className="service-number">{twoDigits(index + 1)}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="service-card-bottom"><div><strong>{formatPrice(service.price)}</strong><span> / {service.duration} MIN</span></div><span className="service-arrow"><ArrowUpRight size={19} /></span></div></button>;
            })}
          </div>
          {services.length === 0 && <p className="site-empty">{fill(t.emptyServices, { telefono: settings.phone })}</p>}
          {(t.servicesNote || t.servicesSign) && <div className="services-footnote"><span>{t.servicesNote && "✳"}</span> {t.servicesNote} <span className="footnote-right">{t.servicesSign}</span></div>}
        </div>
      </section>

      <section className="about" id="club">
        <div className="shell about-grid"><div className="about-image-wrap"><Photo src={settings.aboutImage} alt="Un barbero del club trabajando" width={1200} height={850} /><div className="about-image-shade" />{(t.clubPhoto1 || t.clubPhoto2) && <div className="image-label"><span>{t.clubPhoto1}</span>{t.clubPhoto1 && t.clubPhoto2 && <i />} <span>{t.clubPhoto2}</span></div>}{(t.clubStamp1 || t.clubStamp2) && <div className="about-stamp"><span>{t.clubStamp1}</span><Scissors size={25} /><strong>{t.clubStamp2}</strong></div>}</div><div className="about-copy"><p className="section-kicker light-kicker"><span>02</span> / {t.clubKicker} <i /></p><h2>{t.clubTitle1 && <>{t.clubTitle1}<br /></>}<em>{t.clubTitle2}</em></h2>{t.clubLead && <p className="about-lead">{t.clubLead}</p>}{t.clubText && <p>{t.clubText}</p>}<div className="about-values"><div><span><Scissors size={21} /></span><div><strong>{t.clubValue1Title}</strong><small>{t.clubValue1Text}</small></div></div><div><span><Coffee size={21} /></span><div><strong>{t.clubValue2Title}</strong><small>{t.clubValue2Text}</small></div></div></div>{t.clubLink && <a href="#equipo" className="line-link">{t.clubLink} <ArrowUpRight size={16} /></a>}</div></div>
      </section>

      <section className="team section-light" id="equipo">
        <div className="shell"><div className="section-heading team-heading"><div><p className="section-kicker"><span>03</span> / {t.teamKicker} <i /></p><h2>{t.teamTitle1} <em>{t.teamTitle2}</em></h2></div><div className="section-heading-aside">{t.teamText && <p>{t.teamText}</p>}</div></div>
          <div className="team-grid">{barbers.map((barber, index) => <article className="team-card" key={barber.id}><div className="team-photo">{barber.photo ? <Photo src={barber.photo} alt={`Barbero ${barber.name}`} width={650} height={800} /> : <div className="team-photo-empty" aria-hidden="true">{initials(barber.name)}</div>}<span className="team-photo-number">{twoDigits(index + 1)}{t.teamLabel && ` / ${t.teamLabel}`}</span><button disabled={!canBook} onClick={() => openBooking({ barberId: barber.id })} aria-label={`Reservar con ${barber.name}`}><ArrowUpRight size={21} /></button></div><div className="team-info"><div><h3>{barber.name}</h3>{barber.role && <p>{barber.role}</p>}</div><span>✳</span></div></article>)}</div>
          {barbers.length === 0 && <p className="site-empty">{t.emptyTeam}</p>}
        </div>
      </section>

      <Reviews reviews={reviews} texts={t} />

      <section className="quote-band"><div className="shell quote-inner"><div className="quote-mark">“</div><div><div className="quote-stars" aria-hidden="true">★★★★★</div><blockquote>{t.quoteLine1 && <>{t.quoteLine1}<br /></>}<em>{t.quoteLine2}</em></blockquote>{t.quoteSign && <p>{t.quoteSign}</p>}</div><div className="quote-emblem"><Scissors size={30} /><span>{t.quoteEmblem && <>{t.quoteEmblem}<br /></>}{city} · CHILE</span></div></div></section>

      <section className="visit section-light" id="contacto"><div className="shell visit-grid"><div className="visit-copy"><p className="section-kicker"><span>05</span> / {t.visitKicker} <i /></p><h2>{t.visitTitle1 && <>{t.visitTitle1}<br /></>}<em>{t.visitTitle2}</em></h2>{t.visitText && <p>{t.visitText}</p>}<div className="visit-detail"><MapPin size={20} /><div><strong>{t.visitFind}</strong><span>{settings.address}, {settings.commune}<br />{settings.city}, Chile</span>{t.visitMap && <a href={mapHref} target="_blank" rel="noreferrer">{t.visitMap} <ArrowUpRight size={14} /></a>}</div></div><div className="visit-detail"><Clock3 size={20} /><div><strong>{t.visitHours}</strong>{hours.map((line) => <span key={line}>{line}</span>)}</div></div></div><div className="visit-photo"><Photo src={settings.visitImage} alt="Interior de la barbería" width={1200} height={850} /><div className="visit-photo-caption"><MapPin size={19} /><div><strong>{t.visitCaption}</strong><span>{place}</span></div><ArrowUpRight size={18} /></div></div></div></section>

      <section className="final-cta"><div className="shell final-cta-inner"><div>{t.ctaKicker && <p>{t.ctaKicker} <span>✳</span></p>}<h2>{t.ctaTitle}</h2></div><button className="button button-dark" disabled={!canBook} onClick={() => openBooking()}>{t.bookLong} <ArrowUpRight size={18} /></button></div></section>
      <footer className="site-footer"><div className="shell"><div className="footer-main"><div className="footer-brand"><Brand name={t.brandName} tagline={t.brandTagline} logo={theme.logo} logoText={theme.logoText} /><p>{t.footerLine1}{t.footerLine1 && t.footerLine2 && <br />}{t.footerLine2}</p></div><div className="footer-col"><strong>{t.footerExplore}</strong>{t.footerLink1 && <a href="#servicios">{t.footerLink1}</a>}{t.footerLink2 && <a href="#club">{t.footerLink2}</a>}{t.footerLink3 && <a href="#equipo">{t.footerLink3}</a>}</div><div className="footer-col"><strong>{t.footerFind}</strong><a href="#contacto">{settings.address}, {settings.commune}</a><a href={phoneHref}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div>{t.footerSocial && <div className="footer-col footer-social"><strong>{t.footerFollow}</strong><a href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Camera size={18} /> {t.footerSocial} <ArrowUpRight size={14} /></a></div>}</div><div className="footer-bottom"><span>{t.footerRights}</span><Link href="/admin" className="footer-admin">ADMINISTRACIÓN</Link></div></div></footer>
      {modalSelection && <BookingModal selection={modalSelection} services={services} barbers={barbers} settings={settings} texts={t} onClose={() => setModalSelection(null)} />}
      {resume && !modalSelection && <BookingModal selection={selection} resume={resume} services={services} barbers={barbers} settings={settings} texts={t} onClose={() => setResume(null)} />}
    </main>
  );
}
