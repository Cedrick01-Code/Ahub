import React, { useState, useEffect } from "react"

export const BACKGROUND_IMAGES = [
  "/Background/optimized/pexels-1175048257-21675714.webp",
  "/Background/optimized/pexels-bulat-8822988.webp",
  "/Background/optimized/pexels-christina99999-32113416.webp",
  "/Background/optimized/pexels-dendoktoor-12048200.webp",
  "/Background/optimized/pexels-minan1398-1093837.webp",
  "/Background/optimized/pexels-chi-n-ba-3626645-18462676.webp",
]

// 2 minutes in milliseconds as specified in redesign requirements
const TWO_MINUTES_MS = 120000

interface BackgroundSlideshowProps {
  intervalMs?: number
  showControls?: boolean
  overlayOpacity?: string
  className?: string
  children?: React.ReactNode
}

export const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = ({
  intervalMs = TWO_MINUTES_MS,
  showControls = true,
  overlayOpacity = "bg-slate-950/50",
  className = "",
  children,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [intervalMs])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Images */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {BACKGROUND_IMAGES.map((img, index) => (
          <img
            key={img}
            src={img}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
              index === currentIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            }`}
            style={{
              transitionProperty: "opacity, transform",
              transitionDuration: "1200ms",
            }}
          />
        ))}
        {/* Subtle Dark Gradient Overlay */}
        <div className={`absolute inset-0 ${overlayOpacity}`} />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Slide Indicators / Controls */}
      {showControls && (
        <div
          className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
          role="group"
          aria-label="Background image selector"
        >
          {BACKGROUND_IMAGES.map((img, index) => (
            <button
              key={img}
              type="button"
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-lime-400"
                  : "w-2.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === currentIndex}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
