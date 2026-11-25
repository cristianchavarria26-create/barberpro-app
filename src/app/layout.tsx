import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barrio Barber Club | Tu estilo, tu momento",
  description: "Reserva tu hora en Barrio Barber Club. Buenos cortes, buenas conversaciones y un espacio para ti en Santiago.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
