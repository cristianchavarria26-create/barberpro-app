// Every piece of copy on the public site. The owner can edit each one from the admin panel; the
// `text` here is the original wording, used until an edited version is saved.

export type TextField = { key: string; label: string; text: string; multiline?: boolean; required?: boolean; hint?: string };
type TextGroup = { id: string; title: string; help?: string; fields: readonly TextField[] };

const GROUPS = [
  {
    id: "marca",
    title: "Marca y navegador",
    fields: [
      { key: "brandName", label: "Nombre de la marca", text: "BARRIO.", required: true, hint: "Si termina en punto, el punto se muestra en dorado." },
      { key: "brandTagline", label: "Bajada de la marca", text: "BARBER CLUB" },
      { key: "metaTitle", label: "Título en la pestaña del navegador", text: "Barrio Barber Club | Tu estilo, tu momento", required: true },
      { key: "topTagline", label: "Frase de la barra superior", text: "UN BUEN DÍA EMPIEZA CON UN BUEN CORTE" },
      { key: "metaDescription", label: "Descripción para Google y redes", text: "Reserva tu hora en Barrio Barber Club. Buenos cortes, buenas conversaciones y un espacio para ti en Santiago.", multiline: true },
    ],
  },
  {
    id: "menu",
    title: "Menú y botones de reserva",
    fields: [
      { key: "navHome", label: "Menú: inicio", text: "INICIO", required: true },
      { key: "navServices", label: "Menú: servicios", text: "SERVICIOS", required: true },
      { key: "navClub", label: "Menú: el club", text: "EL CLUB", required: true },
      { key: "navTeam", label: "Menú: barberos", text: "BARBEROS", required: true },
      { key: "navContact", label: "Menú: contacto", text: "CONTACTO", required: true },
      { key: "bookShort", label: "Botón de reserva del encabezado", text: "RESERVAR HORA", required: true },
      { key: "bookLong", label: "Botón grande de reserva", text: "RESERVAR MI HORA", required: true },
    ],
  },
  {
    id: "portada",
    title: "Portada",
    fields: [
      { key: "heroEyebrow", label: "Frase pequeña sobre el título", text: "MÁS QUE UNA BARBERÍA, UN RITUAL" },
      { key: "heroTitle1", label: "Título, línea 1", text: "NO ES SOLO" },
      { key: "heroTitle2", label: "Título, línea 2", text: "UN CORTE." },
      { key: "heroTitle3", label: "Título, línea 3 (en dorado)", text: "ES ACTITUD.", required: true },
      { key: "heroText", label: "Párrafo", text: "Un buen corte, buena conversación y un momento para ti. Bienvenido al lugar donde el estilo se hace propio.", multiline: true },
      { key: "heroLink", label: "Enlace a los servicios", text: "EXPLORAR SERVICIOS" },
      { key: "heroSide", label: "Texto vertical a la derecha", text: "EST. 2018" },
      { key: "heroProofBold", label: "Junto a las estrellas (negrita)", text: "BUEN OFICIO." },
      { key: "heroProof", label: "Junto a las estrellas", text: "MEJOR AMBIENTE." },
    ],
  },
  {
    id: "franja",
    title: "Franja de reserva",
    fields: [
      { key: "quickKicker", label: "Frase pequeña", text: "FÁCIL Y RÁPIDO" },
      { key: "quickTitle", label: "Título", text: "RESERVA TU HORA" },
      { key: "quickText", label: "Texto bajo el título", text: "Tu silla te está esperando." },
      { key: "quickService", label: "Etiqueta: servicio", text: "SERVICIO" },
      { key: "quickBarber", label: "Etiqueta: barbero", text: "BARBERO" },
      { key: "quickDate", label: "Etiqueta: fecha", text: "FECHA" },
      { key: "quickAny", label: "Opción: cualquier barbero", text: "Cualquiera", required: true },
      { key: "quickButton", label: "Botón", text: "VER HORAS", required: true },
      { key: "quickNote1", label: "Nota 1 bajo la franja", text: "RESERVA ONLINE EN MENOS DE UN MINUTO" },
      { key: "quickDepositNote", label: "Nota 2 (cuando hay abono)", text: "ABONAS {abono} PARA CONFIRMAR TU HORA", hint: "{abono} se reemplaza por el monto del abono." },
      { key: "quickNoDeposit", label: "Nota 2 (cuando no hay abono)", text: "SIN PAGO POR ADELANTADO" },
      { key: "quickNote3", label: "Nota a la derecha", text: "BUENOS CORTES. BUENOS MOMENTOS." },
    ],
  },
  {
    id: "servicios",
    title: "Sección de servicios",
    help: "Los nombres, descripciones y precios de cada servicio se editan en Servicios y precios.",
    fields: [
      { key: "servicesKicker", label: "Frase pequeña", text: "NUESTROS SERVICIOS" },
      { key: "servicesTitle1", label: "Título, línea 1", text: "BUENOS CORTES." },
      { key: "servicesTitle2", label: "Título, línea 2 (en dorado)", text: "MEJORES DETALLES.", required: true },
      { key: "servicesLink", label: "Enlace", text: "DESCUBRE TU SERVICIO" },
      { key: "servicesText", label: "Párrafo", text: "Para los clásicos, los atrevidos y todos los que están en medio. Hay un estilo para cada uno.", multiline: true },
      { key: "servicesNote", label: "Nota bajo los servicios", text: "TODOS NUESTROS SERVICIOS INCLUYEN ASESORÍA PERSONALIZADA" },
      { key: "servicesSign", label: "Firma a la derecha", text: "HECHO CON OFICIO Y CON ACTITUD / BARRIO ©" },
    ],
  },
  {
    id: "club",
    title: "Sección El club",
    fields: [
      { key: "clubKicker", label: "Frase pequeña", text: "EL CLUB" },
      { key: "clubTitle1", label: "Título, línea 1", text: "UN LUGAR PARA" },
      { key: "clubTitle2", label: "Título, línea 2 (en dorado)", text: "BAJAR UN CAMBIO.", required: true },
      { key: "clubLead", label: "Frase destacada", text: "La silla es solo el comienzo." },
      { key: "clubText", label: "Párrafo", text: "En Barrio creemos en tomarse el tiempo para hacer las cosas bien. Somos un espacio para desconectarte, conversar y salir sintiéndote como tu mejor versión.", multiline: true },
      { key: "clubValue1Title", label: "Ventaja 1: título", text: "OFICIO DE VERDAD" },
      { key: "clubValue1Text", label: "Ventaja 1: texto", text: "Detalles que marcan la diferencia." },
      { key: "clubValue2Title", label: "Ventaja 2: título", text: "COMO EN CASA" },
      { key: "clubValue2Text", label: "Ventaja 2: texto", text: "Buena música y mejor compañía." },
      { key: "clubLink", label: "Enlace al equipo", text: "CONOCE A NUESTRO EQUIPO" },
      { key: "clubPhoto1", label: "Sobre la foto, izquierda", text: "BUENOS CORTES" },
      { key: "clubPhoto2", label: "Sobre la foto, derecha", text: "MEJORES HISTORIAS" },
      { key: "clubStamp1", label: "Sello, arriba", text: "EL CLUB" },
      { key: "clubStamp2", label: "Sello, abajo", text: "DESDE 2018" },
    ],
  },
  {
    id: "equipo",
    title: "Sección del equipo",
    help: "Los nombres, especialidades y fotos de cada barbero se editan en Barberos.",
    fields: [
      { key: "teamKicker", label: "Frase pequeña", text: "BUENAS MANOS" },
      { key: "teamLabel", label: "Etiqueta sobre cada foto", text: "BARRIO CREW" },
      { key: "teamTitle1", label: "Título, primera parte", text: "EL EQUIPO" },
      { key: "teamTitle2", label: "Título, segunda parte (en dorado)", text: "DEL BARRIO.", required: true },
      { key: "teamText", label: "Párrafo", text: "Personas reales, mucho oficio y una misma obsesión: que salgas de aquí sintiéndote increíble.", multiline: true },
    ],
  },
  {
    id: "frase",
    title: "Frase destacada",
    fields: [
      { key: "quoteLine1", label: "Frase, línea 1", text: "Un buen corte se nota." },
      { key: "quoteLine2", label: "Frase, línea 2 (en dorado)", text: "Una buena experiencia se recuerda." },
      { key: "quoteSign", label: "Firma", text: "— ESA ES LA IDEA, SIEMPRE." },
      { key: "quoteEmblem", label: "Texto del sello", text: "BARBER CLUB" },
    ],
  },
  {
    id: "contacto",
    title: "Sección de contacto",
    help: "La dirección, el teléfono y los horarios se editan en Dirección y abono y en Horarios.",
    fields: [
      { key: "visitKicker", label: "Frase pequeña", text: "VEN A VERNOS" },
      { key: "visitCaption", label: "Texto sobre la foto", text: "EN EL CORAZÓN DEL BARRIO" },
      { key: "visitTitle1", label: "Título, línea 1", text: "TU LUGAR" },
      { key: "visitTitle2", label: "Título, línea 2 (en dorado)", text: "EN EL BARRIO.", required: true },
      { key: "visitText", label: "Párrafo", text: "Entra, ponte cómodo y deja el resto en nuestras manos. Estamos aquí para recibirte.", multiline: true },
      { key: "visitFind", label: "Título de la dirección", text: "ENCUÉNTRANOS" },
      { key: "visitMap", label: "Enlace al mapa", text: "CÓMO LLEGAR" },
      { key: "visitHours", label: "Título de los horarios", text: "HORARIO" },
    ],
  },
  {
    id: "cierre",
    title: "Llamado final y pie de página",
    fields: [
      { key: "ctaKicker", label: "Llamado final: frase pequeña", text: "BUEN ESTILO, SIN COMPLICACIONES" },
      { key: "ctaTitle", label: "Llamado final: título", text: "¿LISTO PARA TU PRÓXIMO CORTE?", required: true },
      { key: "footerLine1", label: "Pie: frase, línea 1", text: "Buenos cortes. Buenas conversaciones." },
      { key: "footerLine2", label: "Pie: frase, línea 2", text: "Siempre bienvenido al Barrio." },
      { key: "footerExplore", label: "Pie: título de la columna 1", text: "EXPLORA" },
      { key: "footerLink1", label: "Pie: enlace a servicios", text: "Servicios" },
      { key: "footerLink2", label: "Pie: enlace al club", text: "El club" },
      { key: "footerLink3", label: "Pie: enlace al equipo", text: "Nuestro equipo" },
      { key: "footerFind", label: "Pie: título de la columna 2", text: "ENCUÉNTRANOS" },
      { key: "footerFollow", label: "Pie: título de la columna 3", text: "SÍGUENOS" },
      { key: "footerSocial", label: "Pie: enlace a la red social", text: "INSTAGRAM" },
      { key: "footerRights", label: "Pie: derechos", text: "© 2026 BARRIO BARBER CLUB. TODOS LOS DERECHOS RESERVADOS." },
    ],
  },
  {
    id: "reserva",
    title: "Ventana de reserva",
    help: "Lo que ve el cliente al elegir su hora y dejar sus datos.",
    fields: [
      { key: "modalTop", label: "Barra superior", text: "RESERVAS ONLINE" },
      { key: "modalKicker", label: "Frase pequeña", text: "TU MOMENTO EMPIEZA AQUÍ" },
      { key: "modalTitle", label: "Título", text: "RESERVA TU HORA.", required: true },
      { key: "modalIntroDeposit", label: "Introducción (cuando hay abono)", text: "Elige tu hora y resérvala con un abono de {abono}.", hint: "{abono} se reemplaza por el monto del abono." },
      { key: "modalIntro", label: "Introducción (cuando no hay abono)", text: "Unos pocos pasos y listo. Nosotros nos encargamos del resto." },
      { key: "modalStep1", label: "Paso 1", text: "ELIGE TU HORA" },
      { key: "modalStep2Deposit", label: "Paso 2 (cuando hay abono)", text: "TUS DATOS Y ABONO" },
      { key: "modalStep2", label: "Paso 2 (cuando no hay abono)", text: "TUS DATOS" },
      { key: "modalAnyBarber", label: "Opción: cualquier barbero", text: "Cualquier barbero", required: true },
      { key: "modalFirstBarber", label: "Resumen: sin barbero elegido", text: "Primer barbero disponible" },
      { key: "modalSlots", label: "Título de las horas", text: "HORAS DISPONIBLES" },
      { key: "modalLoading", label: "Mientras busca horas", text: "Buscando los mejores horarios para ti..." },
      { key: "modalClosed", label: "Aviso: día cerrado", text: "Ese día la barbería está cerrada. Elige otro día para visitarnos." },
      { key: "modalEmpty", label: "Aviso: sin horas ese día", text: "No hay horarios para esta fecha. Prueba con otro día." },
      { key: "modalTotal", label: "Etiqueta del total", text: "TOTAL DEL SERVICIO" },
      { key: "modalDepositHint", label: "Abono bajo el total", text: "Abono para reservar: {abono}", hint: "{abono} se reemplaza por el monto del abono." },
      { key: "modalContinue", label: "Botón: continuar", text: "CONTINUAR", required: true },
      { key: "modalBack", label: "Enlace: volver a las horas", text: "CAMBIAR HORA", required: true },
      { key: "modalDetailsTitle", label: "Título de los datos", text: "CUÉNTANOS QUIÉN VIENE" },
      { key: "modalDetailsText", label: "Texto bajo ese título", text: "Así podremos tener todo listo para tu visita." },
      { key: "modalName", label: "Campo: nombre", text: "Nombre completo" },
      { key: "modalNameExample", label: "Ejemplo dentro del campo nombre", text: "Tu nombre" },
      { key: "modalPhone", label: "Campo: teléfono", text: "Teléfono" },
      { key: "modalPhoneExample", label: "Ejemplo dentro del campo teléfono", text: "+56 9 1234 5678" },
      { key: "modalEmail", label: "Campo: correo", text: "Correo electrónico" },
      { key: "modalOptional", label: "Indicación de campo opcional", text: "(opcional)" },
      { key: "modalEmailExample", label: "Ejemplo dentro del campo correo", text: "tu@email.com" },
      { key: "modalSending", label: "Botón mientras se envía", text: "RESERVANDO..." },
      { key: "modalSubmitDeposit", label: "Botón: reservar (cuando hay abono)", text: "RESERVAR Y ABONAR {abono}", required: true, hint: "{abono} se reemplaza por el monto del abono." },
      { key: "modalSubmit", label: "Botón: reservar (cuando no hay abono)", text: "CONFIRMAR MI RESERVA", required: true },
      { key: "modalAccept", label: "Casilla para aceptar el abono", text: "Entiendo que debo abonar {abono} para confirmar mi reserva.", required: true, hint: "{abono} se reemplaza por el monto del abono.", multiline: true },
      { key: "modalNoDeposit", label: "Nota (cuando no hay abono)", text: "Sin pago por adelantado. Pagas directamente en la barbería." },
    ],
  },
  {
    id: "abono",
    title: "Abono y confirmación de la reserva",
    help: "Los datos para transferir se editan en Dirección y abono.",
    fields: [
      { key: "depositLabel", label: "Etiqueta del abono", text: "ABONO PARA RESERVAR" },
      { key: "depositRest", label: "Etiqueta del saldo", text: "SALDO QUE PAGAS EN LA BARBERÍA" },
      { key: "depositData", label: "Título de los datos de transferencia", text: "DATOS PARA TRANSFERIR" },
      { key: "depositTo", label: "A quién se transfiere", text: "El abono se transfiere directamente a {barbero}.", hint: "{barbero} se reemplaza por el nombre del barbero." },
      { key: "depositWait", label: "Nota antes de reservar", text: "Al reservar verás los datos para transferir y podrás subir el pantallazo de tu pago aquí mismo.", multiline: true },
      { key: "depositReference", label: "Nota después de reservar", text: "Escribe \"Reserva {reserva}\" en el comentario de la transferencia.", hint: "{reserva} se reemplaza por el número de la reserva." },
      { key: "depositCallRef", label: "Si el barbero no tiene datos de transferencia", text: "Para pagar tu abono, llama a la barbería al {telefono} e indica tu reserva Nº {reserva}.", hint: "Puedes usar {telefono} y {reserva}.", multiline: true },
      { key: "modalReference", label: "Número de la reserva", text: "RESERVA Nº {reserva}", hint: "{reserva} se reemplaza por el número de la reserva." },
      { key: "modalPendingTitle1", label: "Con abono pendiente: título, línea 1", text: "SOLO FALTA" },
      { key: "modalPendingTitle2", label: "Con abono pendiente: título, línea 2 (en dorado)", text: "TU ABONO.", required: true },
      { key: "modalPendingText", label: "Con abono pendiente: texto", text: "{nombre}, guardamos tu hora. Abona {abono} para dejarla confirmada.", hint: "Puedes usar {nombre} y {abono}.", multiline: true },
      { key: "receiptTitle", label: "Pantallazo del pago: título", text: "¿YA TRANSFERISTE?" },
      { key: "receiptButton", label: "Pantallazo del pago: botón", text: "SUBIR PANTALLAZO", required: true },
      { key: "receiptText", label: "Pantallazo del pago: texto", text: "Sube aquí el pantallazo de tu transferencia para que confirmemos tu hora.", multiline: true },
      { key: "receiptUploading", label: "Pantallazo del pago: mientras se sube", text: "SUBIENDO..." },
      { key: "receiptDone", label: "Pantallazo del pago: aviso al recibirlo", text: "Pantallazo recibido." },
      { key: "receiptChange", label: "Pantallazo del pago: enlace para cambiarlo", text: "Cambiar imagen", required: true },
      { key: "modalSentTitle1", label: "Con pantallazo enviado: título, línea 1", text: "RECIBIMOS" },
      { key: "modalSentTitle2", label: "Con pantallazo enviado: título, línea 2 (en dorado)", text: "TU COMPROBANTE.", required: true },
      { key: "modalSentText", label: "Con pantallazo enviado: texto", text: "{nombre}, revisaremos tu pago y dejaremos tu hora confirmada.", hint: "{nombre} se reemplaza por el nombre del cliente.", multiline: true },
      { key: "pendingBanner", label: "Aviso en la página si falta subir un pantallazo", text: "Tienes una reserva con el abono pendiente." },
      { key: "modalDoneTitle1", label: "Sin abono: título, línea 1", text: "NOS VEMOS" },
      { key: "modalDoneTitle2", label: "Sin abono: título, línea 2 (en dorado)", text: "EN EL BARRIO.", required: true },
      { key: "modalDoneText", label: "Sin abono: texto", text: "¡Listo, {nombre}! Tu silla ya te está esperando.", hint: "{nombre} se reemplaza por el nombre del cliente." },
      { key: "modalCalendar", label: "Botón: agregar al calendario", text: "AGREGAR AL CALENDARIO", required: true },
      { key: "modalClose", label: "Enlace: cerrar", text: "VOLVER AL INICIO", required: true },
    ],
  },
  {
    id: "resenas",
    title: "Sección de reseñas",
    help: "Las reseñas que se muestran se eligen en la pestaña Reseñas.",
    fields: [
      { key: "reviewsKicker", label: "Frase pequeña", text: "RESEÑAS" },
      { key: "reviewsButton", label: "Botón para dejar una reseña", text: "DEJAR UNA RESEÑA", required: true },
      { key: "reviewsTitle1", label: "Título, línea 1", text: "LO QUE DICEN" },
      { key: "reviewsTitle2", label: "Título, línea 2 (en dorado)", text: "NUESTROS CLIENTES.", required: true },
      { key: "reviewsText", label: "Párrafo", text: "Opiniones de quienes ya pasaron por la silla.", multiline: true },
      { key: "reviewsEmpty", label: "Cuando aún no hay reseñas publicadas", text: "Todavía no hay reseñas publicadas. ¿Ya viniste? Cuéntanos cómo te fue.", multiline: true },
      { key: "reviewFormTitle", label: "Formulario: título", text: "¿CÓMO TE FUE?" },
      { key: "reviewRatingLabel", label: "Formulario: estrellas", text: "Tu calificación" },
      { key: "reviewNameLabel", label: "Formulario: nombre", text: "Tu nombre" },
      { key: "reviewCommentLabel", label: "Formulario: comentario", text: "Tu comentario" },
      { key: "reviewSubmit", label: "Formulario: botón", text: "ENVIAR RESEÑA", required: true },
      { key: "reviewThanks", label: "Mensaje al enviar", text: "¡Gracias! Recibimos tu reseña y aparecerá aquí cuando la revisemos.", multiline: true },
    ],
  },
  {
    id: "whatsapp",
    title: "Mensajes de WhatsApp",
    help: "Se abren ya escritos desde cada reserva, en la pestaña Reservas. Puedes usar {nombre}, {fecha}, {hora}, {barbero}, {servicio}, {direccion}, {marca} y {reserva}.",
    fields: [
      { key: "waConfirm", label: "Confirmación", text: "Hola {nombre}, te confirmamos tu hora en {marca}: {servicio} el {fecha} a las {hora} hrs con {barbero}. Te esperamos en {direccion}.", required: true, multiline: true },
      { key: "waRemind", label: "Recordatorio", text: "Hola {nombre}, te recordamos tu hora en {marca}: {fecha} a las {hora} hrs con {barbero}. Si no puedes venir, avísanos por aquí.", required: true, multiline: true },
      { key: "waReschedule", label: "Reprogramación", text: "Hola {nombre}, necesitamos reprogramar tu hora del {fecha} a las {hora} hrs en {marca}. ¿Qué otro día y horario te acomoda?", required: true, multiline: true },
    ],
  },
  {
    id: "avisos",
    title: "Avisos cuando falta contenido",
    help: "Solo se ven si quitas todos los servicios o todos los barberos.",
    fields: [
      { key: "emptyBooking", label: "Franja de reserva sin agenda", text: "Pronto abriremos la agenda online." },
      { key: "emptyTeam", label: "Sin barberos", text: "Pronto te presentaremos a nuestro equipo." },
      { key: "emptyServices", label: "Sin servicios", text: "Estamos actualizando nuestros servicios. Vuelve pronto o llámanos al {telefono}.", hint: "{telefono} se reemplaza por el teléfono del local.", multiline: true },
    ],
  },
] as const satisfies readonly TextGroup[];

export type TextKey = (typeof GROUPS)[number]["fields"][number]["key"];
export type Texts = Record<TextKey, string>;

export const TEXT_GROUPS: readonly TextGroup[] = GROUPS;
export const TEXT_FIELDS: readonly TextField[] = TEXT_GROUPS.flatMap((group) => group.fields);
export const DEFAULT_TEXTS = Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, field.text])) as Texts;

/** Single spaces, no edges: how a text is stored and compared. */
export function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** The texts to show: the saved edits on top of the original wording. */
export function resolveTexts(saved: unknown): Texts {
  const edits = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const texts: Record<string, string> = { ...DEFAULT_TEXTS };
  for (const field of TEXT_FIELDS) {
    const value = edits[field.key];
    if (typeof value === "string") texts[field.key] = value;
  }
  return texts as Texts;
}

/** Validates what the panel sends and keeps only the texts that differ from the original. */
export function editedTexts(input: unknown) {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const edits: Record<string, string> = {};
  for (const field of TEXT_FIELDS) {
    const raw = source[field.key];
    if (typeof raw !== "string") continue;
    const value = cleanText(raw).slice(0, field.multiline ? 600 : 160);
    // A required text left empty goes back to the original instead of leaving a blank button or title.
    if (value === field.text || (field.required && !value)) continue;
    edits[field.key] = value;
  }
  return edits;
}

/** Replaces {abono}, {nombre} and the like inside a text. Unknown names are left as written. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
