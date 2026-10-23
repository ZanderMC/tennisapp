export function CtaSection() {
  return (
    <section
      id="reserva"
      className="rounded-3xl bg-emerald-900 px-6 py-12 text-center text-white sm:px-10"
    >
      <h2 className="text-3xl font-semibold tracking-tight">
        ¿Listo para tu próximo partido?
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-emerald-50/90">
        Contáctanos y asegura tu horario hoy mismo. Respuesta rápida por
        Gmail.
      </p>
      <a
        href="mailto:braomichael@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
      >
        Contactar
      </a>
    </section>
  );
}

 