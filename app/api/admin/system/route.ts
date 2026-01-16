import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import os from "os"
import { exec } from "child_process"
import { promisify } from "util"
import { prisma } from "@/lib/prisma"

const execAsync = promisify(exec)
const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string      // Código del rol (ej: "ADMIN")
  rolId: string    // ID del rol
}

// Verificar si el usuario tiene permiso para ver el panel de admin
async function verifyAdminPanelAccess(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return false

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    let rolId = decoded.rolId

    // Admin siempre tiene acceso
    if (decoded.rol === "ADMIN") return true

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: decoded.rol }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    if (!rolId) return false

    // Verificar permisos del módulo ADMIN_PANEL
    const permiso = await prisma.permisoRol.findFirst({
      where: {
        rolId,
        modulo: "ADMIN_PANEL"
      }
    })

    return permiso?.ver ?? false
  } catch {
    return false
  }
}

// Obtener información del disco en Windows
async function getDiskInfo(): Promise<{ total: number; used: number; free: number; percent: number }> {
  try {
    const isWindows = process.platform === "win32"

    if (isWindows) {
      const { stdout } = await execAsync("wmic logicaldisk get size,freespace,caption")
      const lines = stdout.trim().split("\n").slice(1)

      let totalSize = 0
      let totalFree = 0

      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 3) {
          const free = parseInt(parts[1]) || 0
          const size = parseInt(parts[2]) || 0
          totalSize += size
          totalFree += free
        }
      }

      const totalUsed = totalSize - totalFree
      const percent = totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0

      return {
        total: Math.round(totalSize / (1024 * 1024 * 1024)), // GB
        used: Math.round(totalUsed / (1024 * 1024 * 1024)),
        free: Math.round(totalFree / (1024 * 1024 * 1024)),
        percent,
      }
    } else {
      // Linux/Mac
      const { stdout } = await execAsync("df -k --total | tail -1")
      const parts = stdout.trim().split(/\s+/)
      const total = parseInt(parts[1]) * 1024
      const used = parseInt(parts[2]) * 1024
      const free = parseInt(parts[3]) * 1024
      const percent = Math.round((used / total) * 100)

      return {
        total: Math.round(total / (1024 * 1024 * 1024)),
        used: Math.round(used / (1024 * 1024 * 1024)),
        free: Math.round(free / (1024 * 1024 * 1024)),
        percent,
      }
    }
  } catch (error) {
    console.error("Error getting disk info:", error)
    return { total: 0, used: 0, free: 0, percent: 0 }
  }
}

// Obtener uso de CPU
async function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus = os.cpus()
    const startTimes = cpus.map(cpu => ({
      idle: cpu.times.idle,
      total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
    }))

    setTimeout(() => {
      const endCpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0

      endCpus.forEach((cpu, i) => {
        const idle = cpu.times.idle - startTimes[i].idle
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0) - startTimes[i].total
        totalIdle += idle
        totalTick += total
      })

      const percent = totalTick > 0 ? Math.round(100 - (totalIdle / totalTick) * 100) : 0
      resolve(percent)
    }, 100)
  })
}

export async function GET() {
  try {
    const hasAccess = await verifyAdminPanelAccess()
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Información de RAM
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryPercent = Math.round((usedMemory / totalMemory) * 100)

    // Información del disco
    const diskInfo = await getDiskInfo()

    // Uso de CPU
    const cpuPercent = await getCpuUsage()

    // Información del sistema
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(), // en segundos
      cpuCores: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "Desconocido",
    }

    // Información de Node.js
    const nodeInfo = {
      version: process.version,
      memoryUsage: process.memoryUsage(),
    }

    return NextResponse.json({
      memory: {
        total: Math.round(totalMemory / (1024 * 1024 * 1024)), // GB
        used: Math.round(usedMemory / (1024 * 1024 * 1024)),
        free: Math.round(freeMemory / (1024 * 1024 * 1024)),
        percent: memoryPercent,
      },
      disk: diskInfo,
      cpu: {
        percent: cpuPercent,
        cores: systemInfo.cpuCores,
        model: systemInfo.cpuModel,
      },
      system: {
        platform: systemInfo.platform === "win32" ? "Windows" : systemInfo.platform,
        hostname: systemInfo.hostname,
        uptime: systemInfo.uptime,
        arch: systemInfo.arch,
      },
      node: {
        version: nodeInfo.version,
        heapUsed: Math.round(nodeInfo.memoryUsage.heapUsed / (1024 * 1024)), // MB
        heapTotal: Math.round(nodeInfo.memoryUsage.heapTotal / (1024 * 1024)),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting system info:", error)
    return NextResponse.json(
      { error: "Error al obtener información del sistema" },
      { status: 500 }
    )
  }
}
