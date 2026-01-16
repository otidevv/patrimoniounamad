"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function ThemeSync() {
  const { setTheme } = useTheme()
  const hasSynced = useRef(false)

  useEffect(() => {
    // Solo sincronizar una vez por sesión
    if (hasSynced.current) return
    hasSynced.current = true

    const syncTheme = async () => {
      try {
        const response = await fetch("/api/auth/configuracion")
        if (response.ok) {
          const data = await response.json()
          if (data.configuracion?.theme) {
            setTheme(data.configuracion.theme)
          }
        }
      } catch (error) {
        console.error("Error syncing theme:", error)
      }
    }

    syncTheme()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
