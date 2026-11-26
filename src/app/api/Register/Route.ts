
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, settings } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  DEFAULT_SCHEDULE,
  DEFAULT_PHOTOS,
  isEmail,
} from "@/lib/booking";
import { DEFAULT_TEXTS } from "@/lib/texts";
import { DEFAULT_THEME } from "@/lib/theme";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function makeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = clean(body.name, 80);
    const slug = makeSlug(clean(body.slug, 80));
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 30);
    const address = clean(body.address, 160);
    const commune = clean(body.commune, 80);
    const city = clean(body.city, 80);
    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !name ||
      !slug ||
      !email ||
      !phone ||
      !address ||
      !commune ||
      !city ||
      !password
    ) {
      return NextResponse.json(
        { error: "Completa todos los campos." },
        { status: 400 }
      );
    }

    if (slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "El enlace debe tener al menos 3 caracteres y solo letras, números o guiones." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { error: "Ingresa un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const [existingBusiness] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.slug, slug))
      .limit(1);

    if (existingBusiness) {
      return NextResponse.json(
        { error: "Ese enlace ya está ocupado. Prueba con otro." },
        { status: 409 }
      );
    }

    const supabase = await createSupabaseServer();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user || data.user.identities?.length === 0) {
      return NextResponse.json(
        { error: "Este correo ya está registrado." },
        { status: 409 }
      );
    }

    const texts = Object.fromEntries(
      Object.entries(DEFAULT_TEXTS).map(([key, value]) => [
        key,
        value
          .replaceAll("BARRIO", name.toUpperCase())
          .replaceAll("Barrio", name)
          .replaceAll("Santiago", city),
      ])
    );

    try {
      await db.transaction(async (tx) => {
        const [business] = await tx
          .insert(businesses)
          .values({
            ownerId: data.user.id,
            name,
            slug,
            email,
            phone,
            plan: "trial",
            active: true,
          })
          .returning({ id: businesses.id });

        await tx.insert(settings).values({
          businessId: business.id,
          address,
          commune,
          city,
          phone,
          email,
          schedule: DEFAULT_SCHEDULE,
          depositPercent: 30,
          depositAmount: 3000,
          requireDeposit: false,
          paymentInstructions: "",
          heroImage: DEFAULT_PHOTOS.heroImage,
          aboutImage: DEFAULT_PHOTOS.aboutImage,
          visitImage: DEFAULT_PHOTOS.visitImage,
          texts,
          theme: DEFAULT_THEME,
        });
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "La cuenta se creó, pero no pudimos completar la configuración de la barbería. Contacta al administrador antes de intentar registrarte nuevamente.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmationRequired: !data.session,
      message: data.session
        ? "Tu barbería fue creada correctamente."
        : "Tu cuenta fue creada. Revisa tu correo para confirmar el registro.",
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos procesar el registro. Inténtalo nuevamente." },
      { status: 500 }
    );
  }
}
