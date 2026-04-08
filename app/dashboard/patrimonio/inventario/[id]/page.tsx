"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Barcode,
  Camera,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Package,
  User,
  Building2,
  RefreshCw,
  Pause,
  Check,
  AlertTriangle,
  Hash,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  ListChecks,
  FileSpreadsheet,
  Download,
  UserRoundSearch,
  ArrowRight,
  PlusCircle,
  Trash2,
  Send,
  ShieldCheck,
  Clock,
  Lock,
  UserPlus,
  UserMinus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { BarcodeScanner } from "@/components/barcode-scanner"

interface Sesion {
  id: string
  codigo: string
  nombre: string
  estado: string
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
  sigaCentroCosto: string | null
  sigaNombreDependencia: string | null
  dependencia: { id: string; nombre: string; siglas: string | null } | null
  sede: { id: string; nombre: string } | null
}

interface Verificacion {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  colorSiga: string | null
  tipoSiga: string | null
  dimensionesSiga: string | null
  otrosSiga: string | null
  dependenciaSiga: string | null
  ubicacionSiga: string | null
  responsableSiga: string | null
  valorSiga: number | null
  resultado: string
  estadoFisico: string | null
  situacion: string | null
  ubicacionReal: string | null
  observaciones: string | null
  fechaVerificacion: string
  verificador: { id: string; nombre: string; apellidos: string }
  dniResponsableActual: string | null
  nombresResponsableActual: string | null
  apellidosResponsableActual: string | null
}

interface PersonaDNI {
  tipoDocumento: string
  numeroDocumento: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  apellidos: string // combinado para mostrar
  usuarioId: string | null // ID del usuario del sistema (null si externo)
  origen: string | null // "sistema" | "reniec" | "manual"
  cargo: string | null
}

interface Asignacion {
  id: string
  estado: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  usuarioId: string | null
  _count: { verificaciones: number }
}

interface BienSIGA {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  responsable: string | null
  usuario: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  valor_neto: number | null
}

interface BienEsperado extends BienSIGA {
  verificado?: boolean
  resultado_verificacion?: string | null
}

interface ResumenUsuario {
  empleado_final: string
  usuario_nombre: string | null
  docum_ident: string | null
  total_bienes: number
  total_verificados: number
  porcentaje: number
}

export default function VerificacionPage() {
  const params = useParams()
  const router = useRouter()
  const sesionId = params.id as string

  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loading, setLoading] = useState(true)

  // Scanner state
  const [codigo, setCodigo] = useState("")
  const [modoEscaner, setModoEscaner] = useState(false)
  const [modoCamara, setModoCamara] = useState(false)
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastInputTime = useRef<number>(0)
  const inputBuffer = useRef<string>("")

  // Verification result state
  const [bienEncontrado, setBienEncontrado] = useState<BienSIGA | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formVerificacion, setFormVerificacion] = useState({
    resultado: "ENCONTRADO",
    estadoFisico: "",
    situacion: "U",
    ubicacionReal: "",
    observaciones: "",
    marca: "",
    modelo: "",
    serie: "",
    color: "",
    tipo: "",
    dimensiones: "",
    otros: "",
  })

  // Bienes esperados state
  const [bienesEsperados, setBienesEsperados] = useState<BienEsperado[]>([])
  const [bienesPage, setBienesPage] = useState(1)
  const [bienesTotalPages, setBienesTotalPages] = useState(1)
  const [bienesTotal, setBienesTotal] = useState(0)
  const [loadingBienes, setLoadingBienes] = useState(false)

  // Diálogo de detalle/edición de bien verificado
  const [dialogDetalle, setDialogDetalle] = useState(false)
  const [verificacionDetalle, setVerificacionDetalle] = useState<Verificacion | null>(null)
  const [formEdicion, setFormEdicion] = useState({
    marca: "", modelo: "", serie: "", color: "", tipo: "",
    dimensiones: "", otros: "", resultado: "", estadoFisico: "",
    situacion: "", ubicacionReal: "", observaciones: "",
  })
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Identificación de persona state
  const [tipoDocumento, setTipoDocumento] = useState("DNI")
  const [docInput, setDocInput] = useState("")
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [mostrarFormManual, setMostrarFormManual] = useState(false)
  const [formManualPersona, setFormManualPersona] = useState({
    apellidoPaterno: "",
    apellidoMaterno: "",
    nombres: "",
  })
  const [personaActual, setPersonaActual] = useState<PersonaDNI | null>(null)
  const [asignacionActual, setAsignacionActual] = useState<Asignacion | null>(null)
  const [verificacionesPersona, setVerificacionesPersona] = useState<Verificacion[]>([])

  // Dialog para bien sin código
  const [dialogSinCodigo, setDialogSinCodigo] = useState(false)
  const [savingSinCodigo, setSavingSinCodigo] = useState(false)
  const [formSinCodigo, setFormSinCodigo] = useState({
    denominacion: "",
    marca: "",
    modelo: "",
    tipo: "",
    color: "",
    serie: "",
    dimensiones: "",
    otros: "",
    estadoFisico: "",
    situacion: "U",
    observaciones: "",
  })

  // Participantes/equipo state
  const [participantes, setParticipantes] = useState<Array<{
    id: string; rol: string;
    usuario: { id: string; nombre: string; apellidos: string; cargo: string | null; numeroDocumento: string | null }
  }>>([])
  const [loadingParticipantes, setLoadingParticipantes] = useState(false)
  const [docParticipante, setDocParticipante] = useState("")
  const [buscandoParticipante, setBuscandoParticipante] = useState(false)
  const [rolParticipante, setRolParticipante] = useState("VERIFICADOR")

  // Reporte usuarios state
  const [resumenUsuarios, setResumenUsuarios] = useState<ResumenUsuario[]>([])
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [usuarioExpandido, setUsuarioExpandido] = useState<string | null>(null)
  const [bienesUsuario, setBienesUsuario] = useState<BienEsperado[]>([])
  const [loadingBienesUsuario, setLoadingBienesUsuario] = useState(false)

  const cargarSesion = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar sesión")
      }

      setSesion(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar sesión")
    }
  }, [sesionId])

  const cargarVerificaciones = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventario/verificaciones?sesionId=${sesionId}&limit=50`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar verificaciones")
      }

      setVerificaciones(data.verificaciones)
    } catch (err) {
      console.error("Error al cargar verificaciones:", err)
    }
  }, [sesionId])

  const cargarBienesEsperados = useCallback(async (page: number = 1) => {
    if (!sesion?.sigaCentroCosto) return

    setLoadingBienes(true)
    try {
      const params = new URLSearchParams({
        centroCosto: sesion.sigaCentroCosto,
        sesionId,
        page: String(page),
        pageSize: "20",
      })
      const response = await fetch(`/api/siga/bienes?${params}`)
      const data = await response.json()

      if (response.ok) {
        setBienesEsperados(data.bienes)
        setBienesTotalPages(data.totalPages)
        setBienesTotal(data.total)
        setBienesPage(page)
      }
    } catch (err) {
      console.error("Error al cargar bienes esperados:", err)
    } finally {
      setLoadingBienes(false)
    }
  }, [sesion?.sigaCentroCosto, sesionId])

  const cargarReporteUsuarios = useCallback(async () => {
    if (!sesion?.sigaCentroCosto) return

    setLoadingReporte(true)
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}/reporte-usuarios`)
      const data = await response.json()

      if (response.ok) {
        setResumenUsuarios(data.resumen)
      }
    } catch (err) {
      console.error("Error al cargar reporte:", err)
    } finally {
      setLoadingReporte(false)
    }
  }, [sesion?.sigaCentroCosto, sesionId])

  const cargarParticipantes = useCallback(async () => {
    setLoadingParticipantes(true)
    try {
      const res = await fetch(`/api/inventario/sesiones/${sesionId}/participantes`)
      const data = await res.json()
      if (res.ok) setParticipantes(data.participantes || [])
    } catch { /* silenciar */ }
    finally { setLoadingParticipantes(false) }
  }, [sesionId])

  const agregarParticipante = async () => {
    if (!docParticipante.trim()) return
    setBuscandoParticipante(true)
    try {
      // Buscar usuario por documento
      const resUser = await fetch(`/api/usuarios/buscar-documento?documento=${docParticipante.trim()}&tipo=DNI`)
      const dataUser = await resUser.json()
      if (!resUser.ok || !dataUser.encontrado || !dataUser.datos.usuarioId) {
        toast.error("Usuario no encontrado en el sistema. Debe estar registrado.")
        setBuscandoParticipante(false)
        return
      }

      const res = await fetch(`/api/inventario/sesiones/${sesionId}/participantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: dataUser.datos.usuarioId, rol: rolParticipante }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${dataUser.datos.nombre} ${dataUser.datos.apellidos} agregado como ${rolParticipante.toLowerCase()}`)
        setDocParticipante("")
        cargarParticipantes()
      } else {
        toast.error(data.error || "Error al agregar")
      }
    } catch { toast.error("Error de conexión") }
    finally { setBuscandoParticipante(false) }
  }

  const removerParticipante = async (participanteId: string) => {
    try {
      const res = await fetch(`/api/inventario/sesiones/${sesionId}/participantes?participanteId=${participanteId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Participante removido")
        cargarParticipantes()
      }
    } catch { toast.error("Error de conexión") }
  }

  const cargarBienesDeUsuario = async (empleadoFinal: string) => {
    if (usuarioExpandido === empleadoFinal) {
      setUsuarioExpandido(null)
      setBienesUsuario([])
      return
    }

    setUsuarioExpandido(empleadoFinal)
    setLoadingBienesUsuario(true)
    try {
      const params = new URLSearchParams({
        empleadoFinal,
      })
      const response = await fetch(
        `/api/inventario/sesiones/${sesionId}/reporte-usuarios?${params}`
      )
      const data = await response.json()

      if (response.ok) {
        setBienesUsuario(data.bienes)
      }
    } catch (err) {
      console.error("Error al cargar bienes del usuario:", err)
    } finally {
      setLoadingBienesUsuario(false)
    }
  }

  // Función para crear/recuperar asignación y seleccionar persona
  const seleccionarYCrearAsignacion = async (persona: PersonaDNI) => {
    try {
      const res = await fetch("/api/inventario/asignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          usuarioId: persona.usuarioId,
          tipoDocumento: persona.tipoDocumento,
          numeroDocumento: persona.numeroDocumento,
          nombres: persona.nombre,
          apellidoPaterno: persona.apellidoPaterno,
          apellidoMaterno: persona.apellidoMaterno,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAsignacionActual(data.asignacion)
      }
    } catch {
      // Continuar sin asignación si falla
    }
    setPersonaActual(persona)
    setMostrarFormManual(false)
    const verifPersona = verificaciones.filter(
      (v) => v.dniResponsableActual === persona.numeroDocumento
    )
    setVerificacionesPersona(verifPersona)
  }

  const buscarDocumento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!docInput.trim()) {
      toast.error("Ingrese el número de documento")
      return
    }

    setBuscandoDoc(true)
    try {
      const params = new URLSearchParams({
        documento: docInput.trim(),
        tipo: tipoDocumento,
      })
      const response = await fetch(`/api/usuarios/buscar-documento?${params}`)
      const data = await response.json()

      if (response.ok && data.encontrado) {
        const persona: PersonaDNI = {
          tipoDocumento: data.datos.tipoDocumento || tipoDocumento,
          numeroDocumento: data.datos.numeroDocumento || docInput.trim(),
          nombre: data.datos.nombre,
          apellidoPaterno: data.datos.apellidoPaterno,
          apellidoMaterno: data.datos.apellidoMaterno || "",
          apellidos: data.datos.apellidos,
          usuarioId: data.datos.usuarioId || null,
          origen: data.origen,
          cargo: data.datos.cargo || null,
        }
        await seleccionarYCrearAsignacion(persona)
        const origenLabel = data.origen === "sistema" ? " (usuario del sistema)" : ""
        toast.success(`Persona identificada${origenLabel}: ${persona.nombre} ${persona.apellidos}`)
        return
      }

      // No encontrado en ningún lado — mostrar formulario manual
      toast.warning("Documento no encontrado. Ingrese los datos manualmente.")
      setMostrarFormManual(true)
      setFormManualPersona({ apellidoPaterno: "", apellidoMaterno: "", nombres: "" })
    } catch {
      toast.warning("Error de conexión. Ingrese los datos manualmente.")
      setMostrarFormManual(true)
      setFormManualPersona({ apellidoPaterno: "", apellidoMaterno: "", nombres: "" })
    } finally {
      setBuscandoDoc(false)
    }
  }

  const confirmarPersonaManual = async () => {
    if (!formManualPersona.apellidoPaterno.trim() || !formManualPersona.nombres.trim()) {
      toast.error("Apellido paterno y nombres son requeridos")
      return
    }

    const apellidos = `${formManualPersona.apellidoPaterno} ${formManualPersona.apellidoMaterno}`.trim()
    const persona: PersonaDNI = {
      tipoDocumento,
      numeroDocumento: docInput.trim(),
      nombre: formManualPersona.nombres.trim(),
      apellidoPaterno: formManualPersona.apellidoPaterno.trim(),
      apellidoMaterno: formManualPersona.apellidoMaterno.trim(),
      apellidos,
      usuarioId: null,
      origen: "manual",
      cargo: null,
    }
    await seleccionarYCrearAsignacion(persona)
    toast.success(`Persona registrada: ${persona.nombre} ${persona.apellidos}`)
  }

  const cambiarPersona = () => {
    setPersonaActual(null)
    setAsignacionActual(null)
    setDocInput("")
    setMostrarFormManual(false)
    setFormManualPersona({ apellidoPaterno: "", apellidoMaterno: "", nombres: "" })
    setVerificacionesPersona([])
    setCodigo("")
    setBienEncontrado(null)
    setModoEscaner(false)
  }

  const enviarAsignacion = async () => {
    if (!asignacionActual) return
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asignacionActual.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "enviar" }),
      })
      const data = await res.json()
      if (res.ok) {
        setAsignacionActual({ ...asignacionActual, estado: "ENVIADO" })
        toast.success("Asignación enviada al usuario para revisión")
      } else {
        toast.error(data.error || "Error al enviar")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const eliminarVerificacion = async (verificacionId: string) => {
    try {
      const res = await fetch(`/api/inventario/verificaciones/${verificacionId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Bien eliminado")
        await Promise.all([cargarSesion(), cargarVerificaciones()])
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const abrirDetalleBien = (v: Verificacion) => {
    setVerificacionDetalle(v)
    setFormEdicion({
      marca: v.marcaSiga || "",
      modelo: v.modeloSiga || "",
      serie: v.serieSiga || "",
      color: v.colorSiga || "",
      tipo: v.tipoSiga || "",
      dimensiones: v.dimensionesSiga || "",
      otros: v.otrosSiga || "",
      resultado: v.resultado,
      estadoFisico: v.estadoFisico || "",
      situacion: v.situacion || "U",
      ubicacionReal: v.ubicacionReal || "",
      observaciones: v.observaciones || "",
    })
    setDialogDetalle(true)
  }

  const guardarEdicion = async () => {
    if (!verificacionDetalle) return
    setGuardandoEdicion(true)
    try {
      const res = await fetch(`/api/inventario/verificaciones/${verificacionDetalle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultado: formEdicion.resultado,
          estadoFisico: formEdicion.estadoFisico || null,
          situacion: formEdicion.situacion || null,
          ubicacionReal: formEdicion.ubicacionReal || null,
          observaciones: formEdicion.observaciones || null,
          marcaSiga: formEdicion.marca || null,
          modeloSiga: formEdicion.modelo || null,
          serieSiga: formEdicion.serie || null,
          colorSiga: formEdicion.color || null,
          tipoSiga: formEdicion.tipo || null,
          dimensionesSiga: formEdicion.dimensiones || null,
          otrosSiga: formEdicion.otros || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Bien actualizado correctamente")
        setDialogDetalle(false)
        await Promise.all([cargarSesion(), cargarVerificaciones()])
      } else {
        toast.error(data.error || "Error al guardar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const handleGuardarSinCodigo = async () => {
    if (!sesion || !personaActual || !formSinCodigo.denominacion.trim()) {
      toast.error("La denominación es requerida")
      return
    }

    setSavingSinCodigo(true)
    const codigoGenerado = `SC-${Date.now()}`
    try {
      const response = await fetch("/api/inventario/verificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          codigoPatrimonial: codigoGenerado,
          resultado: "SOBRANTE",
          estadoFisico: formSinCodigo.estadoFisico || null,
          observaciones: formSinCodigo.observaciones || null,
          dispositivoTipo: "MANUAL",
          asignacionId: asignacionActual?.id || null,
          dniResponsableActual: personaActual.numeroDocumento,
          nombresResponsableActual: personaActual.nombre,
          apellidosResponsableActual: personaActual.apellidos,
          denominacion: formSinCodigo.denominacion || null,
          marca: formSinCodigo.marca || null,
          modelo: formSinCodigo.modelo || null,
          tipo: formSinCodigo.tipo || null,
          color: formSinCodigo.color || null,
          serie: formSinCodigo.serie || null,
          dimensiones: formSinCodigo.dimensiones || null,
          otros: formSinCodigo.otros || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Error al guardar")
        return
      }

      setDialogSinCodigo(false)
      setFormSinCodigo({
        denominacion: "", marca: "", modelo: "", tipo: "", color: "",
        serie: "", dimensiones: "", otros: "", estadoFisico: "", situacion: "U", observaciones: "",
      })
      toast.success("Bien sin código registrado como sobrante")

      // Agregar a la lista de verificaciones de la persona
      if (data.verificacion) {
        setVerificacionesPersona((prev) => [...prev, data.verificacion])
      }
      await Promise.all([cargarSesion(), cargarVerificaciones()])
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSavingSinCodigo(false)
    }
  }

  const descargarAnexo7 = async (empleadoFinal: string, nombreUsuario: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      toast.loading("Generando Anexo 7...", { id: "anexo7" })
      const params = new URLSearchParams({ empleadoFinal })
      const response = await fetch(
        `/api/inventario/sesiones/${sesionId}/anexo7?${params}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar reporte")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || `Anexo7_${empleadoFinal}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Anexo 7 descargado correctamente", { id: "anexo7" })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al descargar reporte",
        { id: "anexo7" }
      )
    }
  }

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      await Promise.all([cargarSesion(), cargarVerificaciones()])
      setLoading(false)
    }
    cargarDatos()
  }, [cargarSesion, cargarVerificaciones])

  // Sincronizar verificaciones de la persona actual cuando se recargan las verificaciones
  useEffect(() => {
    if (personaActual && verificaciones.length > 0) {
      const verifPersona = verificaciones
        .filter((v) => v.dniResponsableActual === personaActual.numeroDocumento)
        .sort((a, b) => new Date(a.fechaVerificacion).getTime() - new Date(b.fechaVerificacion).getTime())
      setVerificacionesPersona(verifPersona)
    }
  }, [verificaciones, personaActual])

  // Derivar personas únicas de las verificaciones existentes (persiste entre recargas)
  const personasRegistradas = useMemo(() => {
    const mapa = new Map<string, { doc: string; nombres: string; apellidos: string; cantidad: number }>()
    for (const v of verificaciones) {
      if (v.dniResponsableActual) {
        const existing = mapa.get(v.dniResponsableActual)
        if (existing) {
          existing.cantidad++
        } else {
          mapa.set(v.dniResponsableActual, {
            doc: v.dniResponsableActual,
            nombres: v.nombresResponsableActual || "",
            apellidos: v.apellidosResponsableActual || "",
            cantidad: 1,
          })
        }
      }
    }
    return Array.from(mapa.values())
  }, [verificaciones])

  const seleccionarPersonaExistente = async (doc: string, nombres: string, apellidos: string) => {
    const [apPat, ...apMatArr] = apellidos.split(" ")
    const persona: PersonaDNI = {
      tipoDocumento: "DNI",
      numeroDocumento: doc,
      nombre: nombres,
      apellidoPaterno: apPat || "",
      apellidoMaterno: apMatArr.join(" ") || "",
      apellidos,
      usuarioId: null,
      origen: null,
      cargo: null,
    }
    // Cargar asignación existente
    try {
      const res = await fetch("/api/inventario/asignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          tipoDocumento: "DNI",
          numeroDocumento: doc,
          nombres,
          apellidoPaterno: apPat || "",
          apellidoMaterno: apMatArr.join(" ") || "",
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAsignacionActual(data.asignacion)
        if (data.asignacion.usuarioId) {
          persona.usuarioId = data.asignacion.usuarioId
        }
      }
    } catch { /* continuar */ }
    setPersonaActual(persona)
    setMostrarFormManual(false)
    setDocInput("")
  }

  // Buscar bien y abrir diálogo
  const buscarYVerificar = useCallback(async (codigoBuscar: string) => {
    if (!codigoBuscar.trim() || codigoBuscar.length < 10) return

    setScanning(true)

    try {
      // Primero buscar en SIGA
      const response = await fetch(
        `/api/patrimonio/buscar?codigo=${encodeURIComponent(codigoBuscar.trim())}`
      )
      const data = await response.json()

      if (response.ok && data.bien) {
        const bien = data.bien
        setBienEncontrado(bien)
        // Extraer color de caracteristicas si tiene formato "COLOR: xxx"
        const colorFromCaract = bien.caracteristicas?.match(/COLOR:\s*([^/]+)/i)?.[1]?.trim()
        setFormVerificacion({
          resultado: "ENCONTRADO",
          estadoFisico: "",
          situacion: "U",
          ubicacionReal: "",
          observaciones: "",
          marca: bien.marca || "",
          modelo: bien.modelo || "",
          serie: bien.serie || "",
          color: bien.color || colorFromCaract || "",
          tipo: "",
          dimensiones: bien.medidas || "",
          otros: "",
        })
      } else {
        // No encontrado en SIGA
        setBienEncontrado(null)
        setFormVerificacion({
          resultado: "SOBRANTE",
          estadoFisico: "",
          situacion: "U",
          ubicacionReal: "",
          observaciones: "",
          marca: "",
          modelo: "",
          serie: "",
          color: "",
          tipo: "",
          dimensiones: "",
          otros: "",
        })
      }

      setDialogOpen(true)
    } catch {
      toast.error("Error de conexión al servidor")
    } finally {
      setScanning(false)
    }
  }, [])

  // Manejar escaneo desde cámara
  const handleCameraScan = useCallback((code: string) => {
    setModoCamara(false)
    setCodigo(code)
    buscarYVerificar(code)
  }, [buscarYVerificar])

  // Detectar entrada de escáner
  useEffect(() => {
    if (!modoEscaner || !personaActual) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeDiff = now - lastInputTime.current

      if (timeDiff < 50 && inputBuffer.current.length > 0) {
        // Continuar acumulando
      } else if (timeDiff > 200) {
        inputBuffer.current = ""
      }

      if (e.key === "Enter") {
        if (inputBuffer.current.length >= 10) {
          setCodigo(inputBuffer.current)
          buscarYVerificar(inputBuffer.current)
        }
        inputBuffer.current = ""
        e.preventDefault()
      } else if (e.key.length === 1) {
        inputBuffer.current += e.key
      }

      lastInputTime.current = now
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [modoEscaner, buscarYVerificar, personaActual])

  useEffect(() => {
    if (modoEscaner && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modoEscaner])

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    buscarYVerificar(codigo)
  }

  const handleGuardarVerificacion = async () => {
    if (!sesion) return

    setSaving(true)
    try {
      const response = await fetch("/api/inventario/verificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          codigoPatrimonial: codigo.trim(),
          resultado: formVerificacion.resultado,
          estadoFisico: formVerificacion.estadoFisico || null,
          situacion: formVerificacion.situacion || null,
          ubicacionReal: formVerificacion.ubicacionReal || null,
          observaciones: formVerificacion.observaciones || null,
          dispositivoTipo: modoEscaner ? "PISTOLA" : "MANUAL",
          asignacionId: asignacionActual?.id || null,
          dniResponsableActual: personaActual?.numeroDocumento || null,
          nombresResponsableActual: personaActual?.nombre || null,
          apellidosResponsableActual: personaActual?.apellidos || null,
          marca: formVerificacion.marca || null,
          modelo: formVerificacion.modelo || null,
          serie: formVerificacion.serie || null,
          color: formVerificacion.color || null,
          tipo: formVerificacion.tipo || null,
          dimensiones: formVerificacion.dimensiones || null,
          otros: formVerificacion.otros || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast.warning("Este bien ya fue verificado en esta sesión", {
            description: `Código: ${codigo.trim()}`,
          })
        } else {
          toast.error(data.error || "Error al guardar verificación")
        }
        setDialogOpen(false)
        setCodigo("")
        return
      }

      // Éxito - cerrar diálogo y recargar
      setDialogOpen(false)
      setCodigo("")
      setBienEncontrado(null)
      toast.success("Verificación registrada", {
        description: `${codigo.trim()} — ${formVerificacion.resultado}`,
      })

      // Agregar a la lista de la persona actual
      if (data.verificacion && personaActual) {
        setVerificacionesPersona((prev) => [...prev, data.verificacion])
      }

      await Promise.all([cargarSesion(), cargarVerificaciones()])

      // Focus en input para siguiente escaneo
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleAccionSesion = async (accion: string) => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accion }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al ejecutar acción")
      }

      if (accion === "finalizar") {
        router.push("/dashboard/patrimonio/inventario")
      } else {
        cargarSesion()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ejecutar acción")
    }
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PROGRAMADA: { color: "bg-blue-100 text-blue-800", label: "Programada" },
      EN_PROCESO: { color: "bg-green-100 text-green-800", label: "En Proceso" },
      PAUSADA: { color: "bg-yellow-100 text-yellow-800", label: "Pausada" },
      FINALIZADA: { color: "bg-gray-100 text-gray-800", label: "Finalizada" },
      CANCELADA: { color: "bg-red-100 text-red-800", label: "Cancelada" },
    }
    const cfg = config[estado] || config.PROGRAMADA
    return <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
  }

  const getResultadoBadge = (resultado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      ENCONTRADO: { color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
      REUBICADO: { color: "bg-blue-100 text-blue-800", icon: <MapPin className="h-3 w-3" /> },
      NO_ENCONTRADO: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
      SOBRANTE: { color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
    }
    const cfg = config[resultado] || config.ENCONTRADO
    return (
      <Badge className={`${cfg.color} gap-1`}>
        {cfg.icon}
        {resultado}
      </Badge>
    )
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sesion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-medium">Sesión no encontrada</h2>
        <Button onClick={() => router.push("/dashboard/patrimonio/inventario")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const progreso = sesion.totalBienesSiga > 0
    ? (sesion.totalVerificados / sesion.totalBienesSiga) * 100
    : 0

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard/patrimonio/inventario")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {sesion.codigo}
              </Badge>
              {getEstadoBadge(sesion.estado)}
            </div>
            <h1 className="text-base sm:text-xl font-bold truncate">{sesion.nombre}</h1>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            {(sesion.estado === "EN_PROCESO") && (
              <Button
                variant="outline"
                size="icon"
                className="sm:w-auto sm:px-3"
                onClick={() => handleAccionSesion("pausar")}
              >
                <Pause className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Pausar</span>
              </Button>
            )}
            {(sesion.estado === "EN_PROCESO" || sesion.estado === "PAUSADA") && (
              <Button
                size="icon"
                className="sm:w-auto sm:px-3"
                onClick={() => handleAccionSesion("finalizar")}
              >
                <Check className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Finalizar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Progreso</span>
              <span className="text-xs sm:text-sm font-medium">
                {sesion.totalVerificados}{sesion.totalBienesSiga > 0 ? ` / ${sesion.totalBienesSiga}` : ""} verificados
              </span>
            </div>
            <Progress value={progreso} className="h-2.5 sm:h-3 mb-2 sm:mb-3" />
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
              <div className="p-1.5 sm:p-2 rounded bg-green-50">
                <p className="font-bold text-sm sm:text-base text-green-700">{sesion.totalEncontrados}</p>
                <p className="text-[10px] sm:text-xs text-green-600">Encontrados</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-blue-50">
                <p className="font-bold text-sm sm:text-base text-blue-700">{sesion.totalReubicados}</p>
                <p className="text-[10px] sm:text-xs text-blue-600">Reubicados</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-red-50">
                <p className="font-bold text-sm sm:text-base text-red-700">{sesion.totalNoEncontrados}</p>
                <p className="text-[10px] sm:text-xs text-red-600">Faltantes</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-yellow-50">
                <p className="font-bold text-sm sm:text-base text-yellow-700">{sesion.totalSobrantes}</p>
                <p className="text-[10px] sm:text-xs text-yellow-600">Sobrantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="verificacion" onValueChange={(tab) => {
        if (tab === "bienes-esperados" && bienesEsperados.length === 0 && sesion.sigaCentroCosto) {
          cargarBienesEsperados(1)
        }
        if (tab === "reporte-usuarios" && resumenUsuarios.length === 0 && sesion.sigaCentroCosto) {
          cargarReporteUsuarios()
        }
        if (tab === "equipo" && participantes.length === 0) {
          cargarParticipantes()
        }
      }}>
        <TabsList className="w-full grid grid-cols-4 sm:flex sm:w-auto sm:justify-start">
          <TabsTrigger value="verificacion" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Barcode className="h-4 w-4 shrink-0" />
            <span className="truncate">Verificar</span>
          </TabsTrigger>
          <TabsTrigger value="equipo" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Equipo</span>
          </TabsTrigger>
          {sesion.sigaCentroCosto && (
            <TabsTrigger value="bienes-esperados" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
              <ListChecks className="h-4 w-4 shrink-0" />
              <span className="truncate">Bienes</span>
            </TabsTrigger>
          )}
          {sesion.sigaCentroCosto && (
            <TabsTrigger value="reporte-usuarios" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">Usuarios</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Verificación */}
        <TabsContent value="verificacion" className="space-y-4 mt-4">

          {/* Agregar nueva persona */}
          {!personaActual && (
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <UserRoundSearch className="h-5 w-5" />
                  Identificar Responsable
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ingrese el documento del trabajador o seleccione uno ya registrado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
                <form onSubmit={buscarDocumento} className="flex flex-col sm:flex-row gap-2">
                  <Select value={tipoDocumento} onValueChange={(val) => {
                    setTipoDocumento(val)
                    setMostrarFormManual(false)
                    setDocInput("")
                  }}>
                    <SelectTrigger className="w-full sm:w-[140px] h-11 sm:h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="CARNET">Carnet</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={tipoDocumento === "DNI" ? "Ingrese DNI (8 dígitos)..." : "Número de documento..."}
                    value={docInput}
                    onChange={(e) => {
                      const val = tipoDocumento === "DNI"
                        ? e.target.value.replace(/\D/g, "").slice(0, 8)
                        : e.target.value.slice(0, 20)
                      setDocInput(val)
                    }}
                    className="font-mono text-base sm:text-lg h-11 sm:h-12 max-w-xs"
                    maxLength={tipoDocumento === "DNI" ? 8 : 20}
                    autoComplete="off"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={buscandoDoc || !docInput.trim() || (tipoDocumento === "DNI" && docInput.length !== 8)}
                    className="h-11 sm:h-12 px-4 sm:px-6 gap-2"
                  >
                    {buscandoDoc ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        <span className="hidden sm:inline">Buscar</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Formulario manual cuando no se encuentra o no es DNI */}
                {mostrarFormManual && (
                  <div className="border rounded-lg p-4 space-y-3 bg-yellow-50 border-yellow-200">
                    <p className="text-sm font-medium text-yellow-800">
                      {tipoDocumento === "DNI"
                        ? "DNI no encontrado. Complete los datos manualmente:"
                        : "Ingrese los datos del trabajador:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Apellido Paterno *</Label>
                        <Input
                          placeholder="Apellido paterno..."
                          value={formManualPersona.apellidoPaterno}
                          onChange={(e) => setFormManualPersona({
                            ...formManualPersona,
                            apellidoPaterno: e.target.value,
                          })}
                          autoFocus
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Apellido Materno</Label>
                        <Input
                          placeholder="Apellido materno..."
                          value={formManualPersona.apellidoMaterno}
                          onChange={(e) => setFormManualPersona({
                            ...formManualPersona,
                            apellidoMaterno: e.target.value,
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Nombres *</Label>
                      <Input
                        placeholder="Nombres..."
                        value={formManualPersona.nombres}
                        onChange={(e) => setFormManualPersona({
                          ...formManualPersona,
                          nombres: e.target.value,
                        })}
                      />
                    </div>
                    <Button
                      onClick={confirmarPersonaManual}
                      disabled={!formManualPersona.apellidoPaterno.trim() || !formManualPersona.nombres.trim()}
                      className="w-full sm:w-auto gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Confirmar Persona
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista de personas ya registradas en esta sesión */}
          {!personaActual && personasRegistradas.length > 0 && (
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Personas Registradas ({personasRegistradas.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Seleccione una persona para ver sus bienes o continuar agregando
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="space-y-2">
                  {personasRegistradas.map((p) => (
                    <div
                      key={p.doc}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => seleccionarPersonaExistente(p.doc, p.nombres, p.apellidos)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.nombres} {p.apellidos}</p>
                          <p className="text-xs text-muted-foreground">Doc: {p.doc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {p.cantidad} bien{p.cantidad !== 1 ? "es" : ""}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Persona seleccionada: banner + escáner + bienes */}
          {personaActual && (
            <>
              {/* Banner de persona identificada */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-200 p-2.5">
                        <User className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900">
                          {personaActual.nombre} {personaActual.apellidos}
                        </p>
                        <p className="text-xs sm:text-sm text-green-700">
                          {personaActual.tipoDocumento}: {personaActual.numeroDocumento}
                          {personaActual.cargo && ` — ${personaActual.cargo}`}
                          {personaActual.origen === "sistema" && (
                            <Badge className="ml-2 bg-blue-100 text-blue-700 text-[10px]">Usuario del sistema</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
                      {verificacionesPersona.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                          onClick={async () => {
                            try {
                              toast.loading("Generando Anexo 7...", { id: "anexo7" })
                              const params = new URLSearchParams({
                                dniResponsable: personaActual.numeroDocumento,
                              })
                              const response = await fetch(
                                `/api/inventario/sesiones/${sesionId}/anexo7?${params}`
                              )
                              if (!response.ok) {
                                const data = await response.json()
                                throw new Error(data.error || "Error al generar reporte")
                              }
                              const blob = await response.blob()
                              const url = window.URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = response.headers
                                .get("Content-Disposition")
                                ?.match(/filename="(.+)"/)?.[1] || `Anexo7_${personaActual.numeroDocumento}.xlsx`
                              document.body.appendChild(a)
                              a.click()
                              window.URL.revokeObjectURL(url)
                              document.body.removeChild(a)
                              toast.success("Anexo 7 descargado", { id: "anexo7" })
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Error al descargar",
                                { id: "anexo7" }
                              )
                            }
                          }}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          <span className="hidden sm:inline">Anexo 7</span>
                        </Button>
                      )}
                      {asignacionActual && asignacionActual.estado === "PENDIENTE" && verificacionesPersona.length > 0 && (
                        <Button
                          size="sm"
                          onClick={enviarAsignacion}
                          className="gap-1.5"
                        >
                          <Send className="h-4 w-4" />
                          <span className="hidden sm:inline">Enviar para Aceptación</span>
                          <span className="sm:hidden">Enviar</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cambiarPersona}
                        className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                      >
                        <ArrowRight className="h-4 w-4" />
                        <span className="hidden sm:inline">Cambiar</span>
                      </Button>
                    </div>
                  </div>
                  {/* Estado de asignación */}
                  {asignacionActual && asignacionActual.estado !== "PENDIENTE" && (
                    <div className="flex items-center gap-2 text-xs">
                      {asignacionActual.estado === "ENVIADO" && (
                        <Badge className="bg-blue-100 text-blue-800 gap-1"><Clock className="h-3 w-3" />Esperando aceptación del usuario</Badge>
                      )}
                      {asignacionActual.estado === "ACEPTADO" && (
                        <Badge className="bg-green-100 text-green-800 gap-1"><ShieldCheck className="h-3 w-3" />Aceptado por el usuario</Badge>
                      )}
                      {asignacionActual.estado === "RECHAZADO" && (
                        <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" />Rechazado — puede editar y reenviar</Badge>
                      )}
                      {asignacionActual.estado === "CERRADO" && (
                        <Badge className="bg-gray-100 text-gray-800 gap-1"><CheckCircle2 className="h-3 w-3" />Cerrado</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Escáner solo si la asignación permite edición */}
              {(!asignacionActual || asignacionActual.estado === "PENDIENTE" || asignacionActual.estado === "RECHAZADO") ? (
                <>
                  {/* Botón cámara prominente en móvil */}
                  <Button
                    variant="outline"
                    onClick={() => setModoCamara(true)}
                    className="w-full h-14 gap-3 text-base sm:hidden border-dashed border-2"
                  >
                    <Camera className="h-5 w-5" />
                    Escanear con Cámara
                  </Button>

                  {/* Scanner */}
                  <Card className={modoEscaner ? "border-blue-200 bg-blue-50" : ""}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Barcode className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            <span className="text-sm sm:text-base font-medium">Código Patrimonial</span>
                          </div>
                          <form onSubmit={handleBuscar} className="flex gap-2">
                            <Input
                              ref={inputRef}
                              placeholder="Ingrese o escanee código..."
                              value={codigo}
                              onChange={(e) => setCodigo(e.target.value)}
                              className="font-mono text-base sm:text-lg h-11 sm:h-12"
                              maxLength={12}
                              autoComplete="off"
                            />
                            <Button type="submit" disabled={scanning || !codigo.trim()} className="h-11 sm:h-12 px-4 sm:px-6">
                              {scanning ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Search className="h-5 w-5" />
                              )}
                            </Button>
                          </form>
                        </div>
                        <div className="hidden sm:flex items-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setModoCamara(true)}
                            className="h-12 gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Cámara
                          </Button>
                          <Button
                            variant={modoEscaner ? "default" : "outline"}
                            onClick={() => setModoEscaner(!modoEscaner)}
                            className="h-12 gap-2"
                          >
                            <Barcode className="h-4 w-4" />
                            {modoEscaner ? "Escáner Activo" : "Pistola"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDialogSinCodigo(true)}
                            className="h-12 gap-2"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Sin Código
                          </Button>
                        </div>
                        {/* Botones compactos en móvil */}
                        <div className="flex gap-2 sm:hidden">
                          <Button
                            variant={modoEscaner ? "default" : "outline"}
                            onClick={() => setModoEscaner(!modoEscaner)}
                            className="flex-1 h-10 gap-2 text-sm"
                          >
                            <Barcode className="h-4 w-4" />
                            {modoEscaner ? "Escáner Activo" : "Pistola"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDialogSinCodigo(true)}
                            className="flex-1 h-10 gap-2 text-sm"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Sin Código
                          </Button>
                        </div>
                      </div>
                      {modoEscaner && (
                        <p className="text-xs sm:text-sm text-blue-600 mt-2">
                          Modo pistola activado. Escanea el código de barras para verificar.
                    </p>
                  )}
                </CardContent>
              </Card>
                </>
              ) : (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                      {asignacionActual.estado === "ENVIADO" && "Esta asignación fue enviada para revisión. No se pueden agregar más bienes hasta que el usuario responda."}
                      {asignacionActual.estado === "ACEPTADO" && "El usuario aceptó esta asignación. No se pueden agregar más bienes."}
                      {asignacionActual.estado === "CERRADO" && "Esta asignación está cerrada. No se permiten cambios."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Verificaciones de la persona actual */}
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">
                        Bienes de {personaActual.nombre} {personaActual.apellidos}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {verificacionesPersona.length} bien(es) verificado(s) en esta sesión
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={cargarVerificaciones}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {verificacionesPersona.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Package className="mx-auto h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-50" />
                      <p className="text-sm">Aún no hay bienes verificados para esta persona</p>
                      <p className="text-xs text-muted-foreground">Escanea un código patrimonial para comenzar</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="hidden sm:table-cell text-xs">Descripción</TableHead>
                            <TableHead className="text-xs">Resultado</TableHead>
                            <TableHead className="hidden md:table-cell text-xs">Estado Físico</TableHead>
                            <TableHead className="hidden lg:table-cell text-xs">Hora</TableHead>
                            {(!asignacionActual || asignacionActual.estado === "PENDIENTE" || asignacionActual.estado === "RECHAZADO") && (
                              <TableHead className="text-xs w-[40px]"></TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificacionesPersona.map((v) => (
                            <TableRow
                              key={v.id}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => abrirDetalleBien(v)}
                            >
                              <TableCell className="font-mono text-xs sm:text-sm py-2">
                                <div>{v.codigoPatrimonial}</div>
                                <div className="sm:hidden text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {v.descripcionSiga || "Sin info"}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-sm">
                                {v.descripcionSiga || "Sin información"}
                              </TableCell>
                              <TableCell className="py-2">{getResultadoBadge(v.resultado)}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm">
                                {v.estadoFisico || "-"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                {new Date(v.fechaVerificacion).toLocaleTimeString("es-PE", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                              {(!asignacionActual || asignacionActual.estado === "PENDIENTE" || asignacionActual.estado === "RECHAZADO") && (
                                <TableCell className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); eliminarVerificacion(v.id) }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab: Equipo Inventariador */}
        <TabsContent value="equipo" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Personal Inventariador
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Agrega al equipo que aparecerá en el Anexo 7
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
              {/* Agregar participante */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="DNI del participante..."
                  value={docParticipante}
                  onChange={(e) => setDocParticipante(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  maxLength={8}
                  className="font-mono max-w-[200px]"
                />
                <Select value={rolParticipante} onValueChange={setRolParticipante}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                    <SelectItem value="VERIFICADOR">Verificador</SelectItem>
                    <SelectItem value="OBSERVADOR">Observador</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={agregarParticipante}
                  disabled={buscandoParticipante || docParticipante.length !== 8}
                  className="gap-1.5"
                >
                  {buscandoParticipante ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Agregar
                </Button>
              </div>

              {/* Lista de participantes */}
              {loadingParticipantes ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : participantes.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No hay personal inventariador asignado</p>
                  <p className="text-xs">Agrega participantes para que aparezcan en el Anexo 7</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">DNI</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Cargo</TableHead>
                        <TableHead className="text-xs">Rol</TableHead>
                        <TableHead className="text-xs w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm py-2">
                            {p.usuario.apellidos} {p.usuario.nombre}
                            <div className="sm:hidden text-[10px] text-muted-foreground">
                              {p.usuario.numeroDocumento} {p.usuario.cargo && `— ${p.usuario.cargo}`}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs font-mono py-2">
                            {p.usuario.numeroDocumento || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs py-2">
                            {p.usuario.cargo || "—"}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px]">
                              {p.rol}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => removerParticipante(p.id)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Bienes Esperados */}
        {sesion.sigaCentroCosto && (
          <TabsContent value="bienes-esperados" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-base">Bienes Esperados de SIGA</CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">
                      {bienesTotal} bienes — {sesion.sigaNombreDependencia || sesion.sigaCentroCosto}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => cargarBienesEsperados(bienesPage)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingBienes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : bienesEsperados.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No se encontraron bienes</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[32px] sm:w-[40px] text-center text-xs px-1 sm:px-2">Ok</TableHead>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="hidden md:table-cell text-xs">Usuario</TableHead>
                            <TableHead className="hidden lg:table-cell text-xs">Marca</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bienesEsperados.map((bien) => (
                            <TableRow key={bien.codigo_patrimonial}>
                              <TableCell className="text-center px-1 sm:px-2 py-2">
                                {bien.verificado ? (
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap py-2">
                                {bien.codigo_patrimonial}
                              </TableCell>
                              <TableCell className="max-w-[150px] sm:max-w-[250px] py-2">
                                <div className="truncate text-xs sm:text-sm">{bien.descripcion}</div>
                                {bien.resultado_verificacion && (
                                  <div className="mt-0.5">
                                    {getResultadoBadge(bien.resultado_verificacion)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                                {bien.usuario || bien.responsable || "—"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {bien.marca || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginación */}
                    {bienesTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cargarBienesEsperados(bienesPage - 1)}
                          disabled={bienesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Anterior</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {bienesPage} de {bienesTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cargarBienesEsperados(bienesPage + 1)}
                          disabled={bienesPage === bienesTotalPages}
                        >
                          <span className="hidden sm:inline mr-1">Siguiente</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Reporte por Usuario */}
        {sesion.sigaCentroCosto && (
          <TabsContent value="reporte-usuarios" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Reporte por Usuario Final</CardTitle>
                    <CardDescription>
                      Avance de verificación por cada usuario responsable
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={cargarReporteUsuarios}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {loadingReporte ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : resumenUsuarios.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No se encontraron usuarios</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumenUsuarios.map((usuario) => (
                      <div key={usuario.empleado_final || usuario.usuario_nombre || "sin-asignar"}>
                        <Card
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => cargarBienesDeUsuario(usuario.empleado_final)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="rounded-full bg-primary/10 p-2">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {usuario.usuario_nombre || "Sin asignar"}
                                  </p>
                                  {usuario.docum_ident && (
                                    <p className="text-xs text-muted-foreground">
                                      DNI: {usuario.docum_ident}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold">
                                    {usuario.total_verificados} / {usuario.total_bienes}
                                  </p>
                                  <p className="text-xs text-muted-foreground">verificados</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Descargar Anexo 7"
                                  onClick={(e) =>
                                    descargarAnexo7(
                                      usuario.empleado_final,
                                      usuario.usuario_nombre || usuario.empleado_final,
                                      e
                                    )
                                  }
                                >
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                </Button>
                                {usuarioExpandido === usuario.empleado_final ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <Progress
                              value={usuario.porcentaje}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                              {usuario.porcentaje}%
                            </p>
                          </CardContent>
                        </Card>

                        {/* Bienes expandidos del usuario */}
                        {usuarioExpandido === usuario.empleado_final && (
                          <Card className="mt-1 ml-4 border-l-4 border-l-primary/30">
                            <CardContent className="p-0">
                              {loadingBienesUsuario ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : bienesUsuario.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No se encontraron bienes
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[40px] text-center">Estado</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="hidden md:table-cell">Marca</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {bienesUsuario.map((bien) => (
                                        <TableRow key={bien.codigo_patrimonial}>
                                          <TableCell className="text-center">
                                            {bien.verificado ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                            )}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs">
                                            {bien.codigo_patrimonial}
                                          </TableCell>
                                          <TableCell className="max-w-[200px] truncate text-sm">
                                            {bien.descripcion}
                                          </TableCell>
                                          <TableCell className="hidden md:table-cell text-sm">
                                            {bien.marca || "—"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Verificar Bien
            </DialogTitle>
            <DialogDescription>
              Código: <span className="font-mono font-bold">{codigo}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info del responsable actual */}
            {personaActual && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-blue-50 border border-blue-200 text-sm">
                <User className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-blue-800">
                  Responsable: <strong>{personaActual.nombre} {personaActual.apellidos}</strong> ({personaActual.tipoDocumento}: {personaActual.numeroDocumento})
                </span>
              </div>
            )}

            {/* Info del bien de SIGA */}
            {bienEncontrado ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Bien encontrado en SIGA</p>
                      <p className="text-sm text-green-700">{bienEncontrado.descripcion}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-green-200 pt-2">
                    <div><span className="text-green-600">Dependencia:</span> {bienEncontrado.nombre_depend || "N/A"}</div>
                    <div><span className="text-green-600">Responsable:</span> {bienEncontrado.responsable || "N/A"}</div>
                    <div><span className="text-green-600">Ubicación:</span> {bienEncontrado.ubicacion_fisica || "N/A"}</div>
                    <div><span className="text-green-600">Valor Neto:</span> {formatCurrency(bienEncontrado.valor_neto)}</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Bien NO encontrado en SIGA</p>
                      <p className="text-sm text-yellow-700">
                        Se registrará como sobrante. Complete los datos del bien.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Datos descriptivos del bien (editables) */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del bien</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Marca</Label>
                  <Input
                    placeholder="Marca..."
                    value={formVerificacion.marca}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, marca: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Input
                    placeholder="Modelo..."
                    value={formVerificacion.modelo}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, modelo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Serie</Label>
                  <Input
                    placeholder="N° de serie..."
                    value={formVerificacion.serie}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, serie: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Color</Label>
                  <Input
                    placeholder="Color..."
                    value={formVerificacion.color}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Input
                    placeholder="Ej: METAL, MADERA..."
                    value={formVerificacion.tipo}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, tipo: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Dimensiones</Label>
                  <Input
                    placeholder="Ej: 120x60cm..."
                    value={formVerificacion.dimensiones}
                    onChange={(e) => setFormVerificacion({ ...formVerificacion, dimensiones: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Otros</Label>
                <Input
                  placeholder="Otros datos descriptivos..."
                  value={formVerificacion.otros}
                  onChange={(e) => setFormVerificacion({ ...formVerificacion, otros: e.target.value })}
                />
              </div>
            </div>

            {/* Verificación */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verificación</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Resultado</Label>
                  <Select
                    value={formVerificacion.resultado}
                    onValueChange={(value) =>
                      setFormVerificacion({ ...formVerificacion, resultado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                      <SelectItem value="REUBICADO">Reubicado</SelectItem>
                      <SelectItem value="NO_ENCONTRADO">No encontrado</SelectItem>
                      <SelectItem value="SOBRANTE">Sobrante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Situación</Label>
                  <Select
                    value={formVerificacion.situacion}
                    onValueChange={(value) =>
                      setFormVerificacion({ ...formVerificacion, situacion: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="U">Uso (U)</SelectItem>
                      <SelectItem value="D">Desuso (D)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Estado de Conservación</Label>
                  <Select
                    value={formVerificacion.estadoFisico}
                    onValueChange={(value) =>
                      setFormVerificacion({ ...formVerificacion, estadoFisico: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUENO">Bueno</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="MALO">Malo</SelectItem>
                      <SelectItem value="CHATARRA">Chatarra</SelectItem>
                      <SelectItem value="RAEE">RAEE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formVerificacion.resultado === "REUBICADO" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Ubicación real</Label>
                  <Input
                    placeholder="Ej: Piso 2, Oficina 205"
                    value={formVerificacion.ubicacionReal}
                    onChange={(e) =>
                      setFormVerificacion({ ...formVerificacion, ubicacionReal: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label className="text-xs">Observaciones</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={formVerificacion.observaciones}
                  onChange={(e) =>
                    setFormVerificacion({ ...formVerificacion, observaciones: e.target.value })
                  }
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarVerificacion} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Verificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle/Edición de bien verificado */}
      <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle del Bien
            </DialogTitle>
            {verificacionDetalle && (
              <DialogDescription>
                Código: <span className="font-mono font-bold">{verificacionDetalle.codigoPatrimonial}</span>
                {verificacionDetalle.descripcionSiga && ` — ${verificacionDetalle.descripcionSiga}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {verificacionDetalle && (
            <div className="space-y-4 py-2">
              {/* Info de SIGA (solo lectura) */}
              {verificacionDetalle.dependenciaSiga && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs p-3 rounded-md bg-muted">
                  <div><span className="text-muted-foreground">Dependencia:</span> {verificacionDetalle.dependenciaSiga}</div>
                  <div><span className="text-muted-foreground">Responsable SIGA:</span> {verificacionDetalle.responsableSiga || "N/A"}</div>
                  <div><span className="text-muted-foreground">Ubicación SIGA:</span> {verificacionDetalle.ubicacionSiga || "N/A"}</div>
                  <div><span className="text-muted-foreground">Valor Neto:</span> {verificacionDetalle.valorSiga ? formatCurrency(verificacionDetalle.valorSiga) : "N/A"}</div>
                </div>
              )}

              {/* Datos descriptivos editables */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del bien</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Marca</Label>
                    <Input value={formEdicion.marca} onChange={(e) => setFormEdicion({ ...formEdicion, marca: e.target.value })} placeholder="Marca..." />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Modelo</Label>
                    <Input value={formEdicion.modelo} onChange={(e) => setFormEdicion({ ...formEdicion, modelo: e.target.value })} placeholder="Modelo..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Serie</Label>
                    <Input value={formEdicion.serie} onChange={(e) => setFormEdicion({ ...formEdicion, serie: e.target.value })} placeholder="N° serie..." />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Color</Label>
                    <Input value={formEdicion.color} onChange={(e) => setFormEdicion({ ...formEdicion, color: e.target.value })} placeholder="Color..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Input value={formEdicion.tipo} onChange={(e) => setFormEdicion({ ...formEdicion, tipo: e.target.value })} placeholder="Tipo..." />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Dimensiones</Label>
                    <Input value={formEdicion.dimensiones} onChange={(e) => setFormEdicion({ ...formEdicion, dimensiones: e.target.value })} placeholder="Dimensiones..." />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Otros</Label>
                  <Input value={formEdicion.otros} onChange={(e) => setFormEdicion({ ...formEdicion, otros: e.target.value })} placeholder="Otros datos..." />
                </div>
              </div>

              {/* Verificación */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verificación</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Resultado</Label>
                    <Select value={formEdicion.resultado} onValueChange={(v) => setFormEdicion({ ...formEdicion, resultado: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                        <SelectItem value="REUBICADO">Reubicado</SelectItem>
                        <SelectItem value="NO_ENCONTRADO">No encontrado</SelectItem>
                        <SelectItem value="SOBRANTE">Sobrante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Situación</Label>
                    <Select value={formEdicion.situacion} onValueChange={(v) => setFormEdicion({ ...formEdicion, situacion: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="U">Uso (U)</SelectItem>
                        <SelectItem value="D">Desuso (D)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Estado de Conservación</Label>
                    <Select value={formEdicion.estadoFisico} onValueChange={(v) => setFormEdicion({ ...formEdicion, estadoFisico: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUENO">Bueno</SelectItem>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="MALO">Malo</SelectItem>
                        <SelectItem value="CHATARRA">Chatarra</SelectItem>
                        <SelectItem value="RAEE">RAEE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formEdicion.resultado === "REUBICADO" && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Ubicación real</Label>
                    <Input value={formEdicion.ubicacionReal} onChange={(e) => setFormEdicion({ ...formEdicion, ubicacionReal: e.target.value })} placeholder="Ej: Piso 2, Oficina 205" />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea value={formEdicion.observaciones} onChange={(e) => setFormEdicion({ ...formEdicion, observaciones: e.target.value })} placeholder="Observaciones..." className="min-h-[60px]" />
                </div>
              </div>

              {/* Info de verificación */}
              <div className="text-[10px] sm:text-xs text-muted-foreground pt-2 border-t">
                Verificado: {new Date(verificacionDetalle.fechaVerificacion).toLocaleString("es-PE")}
                {verificacionDetalle.verificador && ` por ${verificacionDetalle.verificador.nombre} ${verificacionDetalle.verificador.apellidos}`}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalle(false)}>Cancelar</Button>
            {(!asignacionActual || asignacionActual.estado === "PENDIENTE" || asignacionActual.estado === "RECHAZADO") ? (
              <Button onClick={guardarEdicion} disabled={guardandoEdicion}>
                {guardandoEdicion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            ) : (
              <Button disabled variant="outline">Solo lectura</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Bien sin código patrimonial */}
      <Dialog open={dialogSinCodigo} onOpenChange={setDialogSinCodigo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Agregar Bien sin Código Patrimonial
            </DialogTitle>
            <DialogDescription>
              Registra un bien que no tiene código patrimonial. Se guardará como sobrante.
            </DialogDescription>
          </DialogHeader>

          {personaActual && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-blue-50 border border-blue-200 text-sm">
              <User className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-blue-800">
                <strong>{personaActual.nombre} {personaActual.apellidos}</strong> ({personaActual.tipoDocumento}: {personaActual.numeroDocumento})
              </span>
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Denominación *</Label>
              <Input
                placeholder="Ej: ESCRITORIO DE MADERA, SILLA GIRATORIA..."
                value={formSinCodigo.denominacion}
                onChange={(e) => setFormSinCodigo({ ...formSinCodigo, denominacion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ej: LENOVO, HP..."
                  value={formSinCodigo.marca}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, marca: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ej: THINKPAD X1..."
                  value={formSinCodigo.modelo}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, modelo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Input
                  placeholder="Ej: METAL, MADERA..."
                  value={formSinCodigo.tipo}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, tipo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <Input
                  placeholder="Ej: NEGRO, BLANCO..."
                  value={formSinCodigo.color}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, color: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Serie</Label>
                <Input
                  placeholder="N° de serie..."
                  value={formSinCodigo.serie}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, serie: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Dimensiones</Label>
                <Input
                  placeholder="Ej: 120x60x75 cm..."
                  value={formSinCodigo.dimensiones}
                  onChange={(e) => setFormSinCodigo({ ...formSinCodigo, dimensiones: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Otros</Label>
              <Input
                placeholder="Otros datos descriptivos..."
                value={formSinCodigo.otros}
                onChange={(e) => setFormSinCodigo({ ...formSinCodigo, otros: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Situación</Label>
                <Select
                  value={formSinCodigo.situacion}
                  onValueChange={(value) => setFormSinCodigo({ ...formSinCodigo, situacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U">Uso (U)</SelectItem>
                    <SelectItem value="D">Desuso (D)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estado de Conservación</Label>
                <Select
                  value={formSinCodigo.estadoFisico}
                  onValueChange={(value) => setFormSinCodigo({ ...formSinCodigo, estadoFisico: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUENO">Bueno</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="MALO">Malo</SelectItem>
                    <SelectItem value="CHATARRA">Chatarra</SelectItem>
                    <SelectItem value="RAEE">RAEE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Observación</Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                value={formSinCodigo.observaciones}
                onChange={(e) => setFormSinCodigo({ ...formSinCodigo, observaciones: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSinCodigo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarSinCodigo} disabled={savingSinCodigo || !formSinCodigo.denominacion.trim()}>
              {savingSinCodigo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Sobrante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escáner de cámara (modal fullscreen) */}
      {modoCamara && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setModoCamara(false)}
        />
      )}
    </div>
  )
}
