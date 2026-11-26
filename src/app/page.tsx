
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BarberPro | Tu barbería, tu negocio",
  description:
    "Administra tu barbería, publica tus servicios y recibe reservas online con BarberPro.",
};

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101010",
        color: "#f5f0e8",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "28px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #303030",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#d6ad70",
            fontSize: "25px",
            fontWeight: 800,
            textDecoration: "none",
            letterSpacing: "1px",
          }}
        >
          BARBERPRO
        </Link>

        <Link
          href="/registro"
          style={{
            color: "#101010",
            background: "#d6ad70",
            padding: "12px 20px",
            borderRadius: "5px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Crear mi cuenta
        </Link>
      </header>

      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "110px 24px 90px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#d6ad70",
            letterSpacing: "4px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          TU BARBERÍA. TU MARCA. TU NEGOCIO.
        </p>

        <h1
          style={{
            fontSize: "clamp(42px, 8vw, 76px)",
            lineHeight: 1.05,
            margin: "25px auto",
            maxWidth: "850px",
          }}
        >
          Lleva tu barbería al
          <span style={{ color: "#d6ad70" }}>
            {" "}siguiente nivel.
          </span>
        </h1>

        <p
          style={{
            color: "#b8b3aa",
            fontSize: "18px",
            lineHeight: 1.8,
            maxWidth: "650px",
            margin: "0 auto 35px",
          }}
        >
          Crea tu propia página web, administra tus servicios,
          organiza tus horarios y recibe reservas online
          desde un solo lugar.
        </p>

        <Link
          href="/registro"
          style={{
            display: "inline-block",
            background: "#d6ad70",
            color: "#101010",
            padding: "17px 30px",
            borderRadius: "5px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Comenzar gratis por 3 días
        </Link>

        <p
          style={{
            color: "#888",
            fontSize: "13px",
            marginTop: "18px",
          }}
        >
          Sin compromiso. Tu barbería tendrá su propio enlace.
        </p>
      </section>

      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "30px 24px 100px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        {[
          {
            title: "Tu propia web",
            description:
              "Una página exclusiva con tu nombre, fotografías, servicios y precios.",
          },
          {
            title: "Reservas online",
            description:
              "Tus clientes pueden elegir servicio, barbero, fecha y hora.",
          },
          {
            title: "Control total",
            description:
              "Administra tus horarios, reservas, equipo y configuración.",
          },
        ].map((item) => (
          <article
            key={item.title}
            style={{
              padding: "28px",
              border: "1px solid #343434",
              borderRadius: "8px",
              background: "#181818",
            }}
          >
            <h2
              style={{
                color: "#d6ad70",
                fontSize: "21px",
              }}
            >
              {item.title}
            </h2>

            <p
              style={{
                color: "#aaa",
                lineHeight: 1.7,
              }}
            >
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <footer
        style={{
          borderTop: "1px solid #303030",
          padding: "25px",
          textAlign: "center",
          color: "#888",
          fontSize: "13px",
        }}
      >
        © {new Date().getFullYear()} BarberPro. Todos los derechos reservados.
      </footer>
    </main>
  );
}
