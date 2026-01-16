"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const banners = [
  { src: "/banners/1.jpg", alt: "UNAMAD Campus" },
  { src: "/banners/2.jpg", alt: "UNAMAD Instalaciones" },
  { src: "/banners/3.jpg", alt: "UNAMAD Estudiantes" },
  { src: "/banners/4.jpg", alt: "UNAMAD Patrimonio" },
  { src: "/banners/5.jpg", alt: "UNAMAD Edificio" },
  { src: "/banners/6.jpg", alt: "UNAMAD Vista" },
  { src: "/banners/7.jpg", alt: "UNAMAD Ambiente" },
  { src: "/banners/8.jpg", alt: "UNAMAD Naturaleza" },
]

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group">
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={banner.src}
            alt={banner.alt}
            fill
            className="object-cover"
            priority={index === 0}
          />
          {/* Overlay oscuro para mejor legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={() => {
          prevSlide()
          setIsAutoPlaying(false)
          setTimeout(() => setIsAutoPlaying(true), 5000)
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Anterior"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        onClick={() => {
          nextSlide()
          setIsAutoPlaying(false)
          setTimeout(() => setIsAutoPlaying(true), 5000)
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Siguiente"
      >
        <ChevronRight className="size-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex
                ? "bg-white w-6"
                : "bg-white/50 hover:bg-white/80"
            )}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
