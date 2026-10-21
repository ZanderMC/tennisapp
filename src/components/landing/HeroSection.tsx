import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-emerald-900 text-white">
      <Image
        src="/tennis-bg.avif"
        alt="Cancha de tenis de césped"
        fill
        priority
        className="object-cover opacity-35"
      />

      <div className="relative z-10 px-6 py-20 sm:px-10 lg:px-14">
        <p className="mb-4 inline-flex rounded-full bg-white/20 px-4 py-1 text-sm font-medium">
          Alquiler de Canchas de Tenis
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Reserva tu cancha en minutos y juega en un espacio premium
        </h1>
        <p className="mt-5 max-w-2xl text-base text-emerald-50/90 sm:text-lg">
          Canchas impecables, iluminación nocturna y ubicación estratégica para
          entrenar o jugar con amigos.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#reserva"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            Reservar ahora
          </a>
          <a
            href="#horarios"
            className="rounded-full border border-white/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Ver horarios
          </a>
        </div>
      </div>
    </section>
  );
}
