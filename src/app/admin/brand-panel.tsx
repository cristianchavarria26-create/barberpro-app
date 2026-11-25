"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { Scissors } from "lucide-react";
import { adminCall } from "./api";
import type { PanelProps } from "./dashboard";
import { PhotoPicker } from "./photo-picker";
import { BODY_FONTS, CORNERS, DEFAULT_THEME, TITLE_FONTS, contrast, resolveTheme, themeVars, type Theme } from "@/lib/theme";

const COLORS = [
  ["accent", "Color de acento", "Botones principales, títulos destacados y detalles."],
  ["dark", "Color oscuro", "Encabezado, portada y secciones oscuras; también el texto sobre fondo claro."],
  ["light", "Color claro", "Fondo de las secciones claras; también el texto sobre fondo oscuro."],
] as const;

/** Colours, typefaces, shapes and logo of the public site, with a preview that updates as you choose. */
export default function BrandPanel({ saved, brandName, brandTagline, run, pending, onError }: PanelProps & { saved: unknown; brandName: string; brandTagline: string; onError: (text: string) => void }) {
  const stored = resolveTheme(saved);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(saved));
  const set = <Key extends keyof Theme>(key: Key, value: Theme[Key]) => setTheme((current) => ({ ...current, [key]: value }));
  const unsaved = JSON.stringify(theme) !== JSON.stringify(stored);
  const original = JSON.stringify({ ...theme, logo: "", logoText: true }) === JSON.stringify(DEFAULT_THEME);
  const warnings = [
    contrast(theme.dark, theme.light) < 7 && "El color oscuro y el claro se parecen demasiado: los textos costarán de leer.",
    contrast(theme.accent, theme.dark) < 3 && "El color de acento casi no se distingue del oscuro: los botones y títulos destacados se perderán.",
  ].filter(Boolean);
  const name = brandName.replace(/\.$/, "");

  return (
    <form aria-label="Apariencia" onSubmit={(event) => { event.preventDefault(); run(() => adminCall("saveTheme", { input: theme }), "Apariencia guardada. Ya se ve en el sitio."); }}>
      <div className="brand-layout">
        <div>
          <div className="admin-card">
            <h2>Colores</h2>
            <div className="brand-colors">
              {COLORS.map(([key, label, help]) => (
                <label className="admin-field" key={key}>{label}
                  <span className="color-input"><input type="color" value={theme[key]} onChange={(event) => set(key, event.target.value.toLowerCase())} /><code>{theme[key]}</code></span>
                  <small className="texts-hint">{help}</small>
                </label>
              ))}
            </div>
            {warnings.map((warning) => <p className="admin-warning brand-warning" key={String(warning)}>{warning}</p>)}
          </div>
          <div className="admin-card">
            <h2>Tipografías</h2>
            <div className="admin-grid grid-barber">
              <label className="admin-field">Títulos
                <select className="resv-filter" value={theme.titleFont} onChange={(event) => set("titleFont", event.target.value)}>
                  {TITLE_FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                </select>
              </label>
              <label className="admin-field">Textos
                <select className="resv-filter" value={theme.bodyFont} onChange={(event) => set("bodyFont", event.target.value)}>
                  {BODY_FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="admin-card">
            <h2>Botones y esquinas</h2>
            <div className="resv-switch" role="group" aria-label="Forma de botones y tarjetas">
              {CORNERS.map((option) => <button type="button" key={option.id} className={theme.corners === option.id ? "active" : ""} aria-pressed={theme.corners === option.id} onClick={() => set("corners", option.id)}>{option.name}</button>)}
            </div>
            <p className="admin-hint brand-hint">Cambia la forma de los botones, las tarjetas, las fotos y los campos de la página.</p>
          </div>
          <div className="admin-card">
            <h2>Logo</h2>
            <div className="brand-logo-row">
              <div className="brand-logo-box">{theme.logo ? <Image src={theme.logo} alt="Logo actual" width={160} height={44} unoptimized /> : <span>Sin logo propio</span>}</div>
              <div className="admin-foot-actions">
                <PhotoPicker label={theme.logo ? "Cambiar logo" : "Subir logo"} disabled={pending} onUploaded={(url) => set("logo", url)} onError={onError} />
                {theme.logo && <button type="button" className="admin-btn" onClick={() => setTheme((current) => ({ ...current, logo: "", logoText: true }))}>Quitar logo</button>}
              </div>
            </div>
            {theme.logo && <label className="admin-check brand-hint"><input type="checkbox" checked={theme.logoText} onChange={(event) => set("logoText", event.target.checked)} /> Mostrar también el nombre junto al logo</label>}
            <p className="admin-hint brand-hint">Reemplaza el emblema de las tijeras en el encabezado y el pie. Se ve mejor un PNG con fondo transparente. Recuerda guardar después de subirlo.</p>
          </div>
        </div>

        <aside className="brand-side">
          <span className="resv-label">Vista previa</span>
          <div className="brand-preview" style={themeVars(theme) as CSSProperties}>
            <div className="brand-preview-dark">
              <span className="brand">
                {theme.logo ? <Image className="brand-logo" src={theme.logo} alt="" width={160} height={44} unoptimized /> : <span className="brand-symbol"><Scissors size={24} strokeWidth={1.8} /><i /></span>}
                {theme.logoText && <span className="brand-words"><strong>{name}{brandName.endsWith(".") && <span>.</span>}</strong><small>{brandTagline}</small></span>}
              </span>
              <p className="brand-preview-title">TU ESTILO<br /><em>TU MARCA.</em></p>
              <span className="button button-gold">RESERVAR MI HORA</span>
            </div>
            <div className="brand-preview-light">
              <p className="section-kicker"><span>01</span> / NUESTROS SERVICIOS <i /></p>
              <div className="service-card"><h3>Corte clásico</h3><p>Así se ven las tarjetas y los textos.</p><div className="service-card-bottom"><strong>$16.000</strong></div></div>
              <span className="button button-dark">VER HORAS</span>
            </div>
          </div>
        </aside>
      </div>
      <div className="texts-toolbar brand-save">
        <button type="button" className="admin-btn" disabled={pending || original} onClick={() => setTheme((current) => ({ ...DEFAULT_THEME, logo: current.logo, logoText: current.logoText }))}>Volver al diseño original</button>
        <span className={`texts-status ${unsaved ? "dirty" : ""}`}>{unsaved ? "Cambios sin guardar" : "Todo guardado"}</span>
        <button className="admin-btn primary" disabled={pending || !unsaved}>Guardar apariencia</button>
      </div>
    </form>
  );
}
