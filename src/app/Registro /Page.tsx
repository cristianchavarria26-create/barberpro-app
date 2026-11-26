
import Link from "next/link";
import RegisterForm from "@/app/components/register-form";

export const metadata = {
  title: "Crear cuenta | BarberPro",
  description: "Registra tu barbería y comienza tu prueba gratuita de BarberPro.",
};

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] px-5 py-12 text-white">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-amber-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-[0.15em]">
            BARBER<span className="text-amber-400">PRO</span>
          </Link>

          <Link
            href="/"
            className="text-sm text-white/50 transition hover:text-white"
          >
            Volver al inicio
          </Link>
        </header>

        <div className="grid items-start gap-12 lg:grid-cols-2">
          <section className="pt-4 lg:pt-12">
            <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
              Prueba gratuita de 3 días
            </span>

            <h1 className="mt-7 text-4xl font-black leading-tight sm:text-5xl">
              Tu barbería merece una presencia
              <span className="text-amber-400"> profesional.</span>
            </h1>

            <p className="mt-6 max-w-lg leading-7 text-white/55">
              Crea tu página personalizada, publica tus servicios y permite
              que tus clientes reserven sus horas online. Administra tu
              negocio desde un solo lugar.
            </p>

            <div className="mt-10 space-y-5">
              {[
                "Tu propia página con enlace personalizado",
                "Gestión de servicios, barberos y horarios",
                "Reservas online para tus clientes",
                "Personalización de imágenes y colores",
                "Panel privado para administrar tu negocio",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm text-amber-400">
                    ✓
                  </span>
                  <span className="text-sm text-white/75">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 shadow-2xl sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Comienza ahora
              </p>
              <h2 className="mt-3 text-2xl font-bold">
                Registra tu barbería
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Completa tus datos para crear tu cuenta.
              </p>
            </div>

            <RegisterForm />
          </section>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-white/30">
          © {new Date().getFullYear()} BarberPro. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
