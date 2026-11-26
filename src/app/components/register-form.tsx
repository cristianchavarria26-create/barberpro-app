
"use client";

import { useState, type FormEvent } from "react";

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          email,
          password,
          phone,
          address,
          commune,
          city,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo crear la cuenta.");
      }

      setSuccess(true);
      setMessage(result.message || "Registro completado.");
      setPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-amber-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm text-white/70">
          Nombre de tu barbería
        </label>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (!slugEdited) setSlug(makeSlug(value));
          }}
          placeholder="Ej. Barbería Imperial"
          maxLength={80}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Enlace de tu barbería
        </label>
        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 focus-within:border-amber-400">
          <span className="whitespace-nowrap text-sm text-white/40">
            /b/
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent py-3 pl-1 text-white outline-none"
            value={slug}
            onChange={(event) => {
              setSlug(makeSlug(event.target.value));
              setSlugEdited(true);
            }}
            placeholder="barberia-imperial"
            maxLength={80}
            required
          />
        </div>
        <p className="mt-2 text-xs text-white/40">
          Tus clientes reservarán en barberpro.cl/b/{slug || "tu-barberia"}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Correo electrónico
        </label>
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          maxLength={160}
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Contraseña
        </label>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Teléfono de contacto
        </label>
        <input
          className={inputClass}
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+56 9 1234 5678"
          maxLength={30}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Dirección
        </label>
        <input
          className={inputClass}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Calle y número"
          maxLength={160}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-white/70">
            Comuna
          </label>
          <input
            className={inputClass}
            value={commune}
            onChange={(event) => setCommune(event.target.value)}
            placeholder="Ej. Los Ángeles"
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/70">
            Ciudad
          </label>
          <input
            className={inputClass}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ej. Los Ángeles"
            maxLength={80}
            required
          />
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            success
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando tu barbería..." : "Crear cuenta gratis"}
      </button>

      <p className="text-center text-xs leading-relaxed text-white/40">
        Obtendrás 3 días de prueba para conocer BarberPro. No necesitas
        ingresar datos de pago para registrarte.
      </p>
    </form>
  );
      }
