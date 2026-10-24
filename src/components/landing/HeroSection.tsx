"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const courtImages = [
  { src: "/tenniscourt1.webp", alt: "Vista principal de la cancha de tenis" },
  { src: "/tenniscourt2.webp", alt: "Vista lateral de la cancha de tenis" },
  { src: "/tenniscourt3.webp", alt: "Vista amplia de la cancha de tenis" },
];

export function HeroSection() {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const closeGallery = () => setIsGalleryOpen(false);

  const showPreviousImage = () => {
    setSelectedImage((current) => (current - 1 + courtImages.length) % courtImages.length);
  };

  const showNextImage = () => {
    setSelectedImage((current) => (current + 1) % courtImages.length);
  };

  useEffect(() => {
    if (!isGalleryOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
      } else if (event.key === "ArrowLeft") {
        setSelectedImage((current) => (current - 1 + courtImages.length) % courtImages.length);
      } else if (event.key === "ArrowRight") {
        setSelectedImage((current) => (current + 1) % courtImages.length);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isGalleryOpen]);

  return (
    <>
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
            href="#Booking"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            Reservar ahora
          </a>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(0);
              setIsGalleryOpen(true);
            }}
            className="rounded-full border border-white/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Ver Cancha
          </button>
        </div>
      </div>
      </section>

      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-2000 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de canchas"
          onClick={closeGallery}
        >
          <div
            className="relative flex w-full max-w-5xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-[75vh] w-full">
              <Image
                src={courtImages[selectedImage].src}
                alt={courtImages[selectedImage].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-contain"
              />
              <button
                type="button"
                onClick={closeGallery}
                aria-label="Cerrar galería"
                className="absolute right-2 top-2 z-10 rounded-full px-3 py-1 text-3xl leading-none text-white transition hover:bg-white/20"
              >
                &times;
              </button>
              <button
                type="button"
                onClick={showPreviousImage}
                aria-label="Ver imagen anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-2 text-3xl text-white transition hover:bg-black/70"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={showNextImage}
                aria-label="Ver imagen siguiente"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-2 text-3xl text-white transition hover:bg-black/70"
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
