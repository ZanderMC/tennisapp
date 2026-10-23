const benefits = [
  {
    title: "Superficie profesional",
    description:
      "Cancha cuidada diariamente para garantizar mejor rebote y mayor seguridad.",
  },
  {
    title: "Iluminación nocturna",
    description:
      "Juega de día o de noche con luz uniforme y excelente visibilidad.",
  },
  {
    title: "Reserva flexible",
    description:
      "Bloques por hora con confirmación inmediata desde tu móvil.",
  },
];

export function BenefitsSection() {
  return (
    <section id="reservation" className="grid gap-4 md:grid-cols-3">
      {benefits.map((benefit) => (
        <article
          key={benefit.title}
          className="rounded-2xl border border-emerald-100 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-emerald-900">{benefit.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/75">
            {benefit.description}
          </p>
        </article>
      ))}
    </section>
  );
}
