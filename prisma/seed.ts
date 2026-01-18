import { PrismaClient, Modulo } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Definición de sedes de UNAMAD (Universidad Nacional Amazónica de Madre de Dios)
const SEDES_INICIALES = [
  {
    codigo: "CIUDAD",
    nombre: "CIUDAD UNIVERSITARIA",
    direccion: "AV. JORGE CHÁVEZ N° 1160",
    ciudad: "Puerto Maldonado",
    telefono: "(082) 571432",
    email: "informes@unamad.edu.pe",
  },
  {
    codigo: "SEDE-2-MAYO",
    nombre: "CENTRO DE FORMACIÓN ACADÉMICA",
    direccion: "AV. DOS DE MAYO N°996",
    ciudad: "Puerto Maldonado",
  },
  {
    codigo: "SEDE-INAPARI",
    nombre: "ALDEA CIENTÍFICA - IÑAPARI",
    direccion: "AV. GARCILAZO DE LA VEGA LOTE E-2004",
    ciudad: "Iñapari",
  },
  {
    codigo: "VIVERO-FORESTAL",
    nombre: "VIVERO FORESTAL FUNDO EL BOSQUE",
    direccion: "CARRETERA PTO. MALDONADO - IBERIA - KM 16.5",
    ciudad: "Puerto Maldonado",
  },
  {
    codigo: "PPTM",
    nombre: "PLANTA PILOTO DE TECNOLOGÍA DE LA MADERA",
    ciudad: "Puerto Maldonado",
  },
]

// Tipos de documento para trámite documentario
const TIPOS_DOCUMENTO_TRAMITE = [
  {
    codigo: "OF",
    nombre: "Oficio",
    descripcion: "Documento oficial para comunicación externa",
    requiereFirma: true,
    prefijo: "OF",
  },
  {
    codigo: "MEM",
    nombre: "Memorándum",
    descripcion: "Comunicación interna entre dependencias",
    requiereFirma: true,
    prefijo: "MEM",
  },
  {
    codigo: "INF",
    nombre: "Informe",
    descripcion: "Documento informativo sobre actividades o situaciones",
    requiereFirma: true,
    prefijo: "INF",
  },
  {
    codigo: "RES",
    nombre: "Resolución",
    descripcion: "Acto administrativo de autoridad competente",
    requiereFirma: true,
    prefijo: "RES",
  },
  {
    codigo: "PROV",
    nombre: "Proveído",
    descripcion: "Disposición breve para dar trámite a un documento",
    requiereFirma: true,
    prefijo: "PROV",
  },
  {
    codigo: "CARTA",
    nombre: "Carta",
    descripcion: "Comunicación formal general",
    requiereFirma: true,
    prefijo: "CARTA",
  },
  {
    codigo: "SOL",
    nombre: "Solicitud",
    descripcion: "Petición formal de un servicio o trámite",
    requiereFirma: true,
    prefijo: "SOL",
  },
  {
    codigo: "CONV",
    nombre: "Convenio",
    descripcion: "Acuerdo entre partes",
    requiereFirma: true,
    prefijo: "CONV",
  },
  {
    codigo: "ACTA",
    nombre: "Acta",
    descripcion: "Documento que certifica hechos o acuerdos",
    requiereFirma: true,
    prefijo: "ACTA",
  },
  {
    codigo: "CIRCULAR",
    nombre: "Circular",
    descripcion: "Comunicación de difusión masiva",
    requiereFirma: true,
    prefijo: "CIRC",
  },
]

// Definición de roles iniciales del sistema
const ROLES_INICIALES = [
  {
    codigo: "ADMIN",
    nombre: "Administrador",
    descripcion: "Acceso total al sistema",
    color: "#ef4444",
    esSistema: true
  },
  {
    codigo: "JEFE_PATRIMONIO",
    nombre: "Jefe de Patrimonio",
    descripcion: "Gestión completa de patrimonio",
    color: "#3b82f6",
    esSistema: true
  },
  {
    codigo: "RESPONSABLE",
    nombre: "Responsable",
    descripcion: "Responsable de bienes asignados",
    color: "#22c55e",
    esSistema: true
  },
  {
    codigo: "USUARIO",
    nombre: "Usuario",
    descripcion: "Usuario básico del sistema",
    color: "#6b7280",
    esSistema: true
  },
]

async function main() {
  console.log("Iniciando seed...")

  // 1. Crear sedes
  console.log("\n1. Creando sedes...")
  const sedesCreadas: Record<string, string> = {}

  for (const sedeData of SEDES_INICIALES) {
    const sede = await prisma.sede.upsert({
      where: { codigo: sedeData.codigo },
      update: {
        nombre: sedeData.nombre,
        direccion: sedeData.direccion,
        ciudad: sedeData.ciudad,
        telefono: sedeData.telefono,
        email: sedeData.email,
      },
      create: sedeData,
    })
    sedesCreadas[sede.codigo] = sede.id
    console.log(`   Sede creada: ${sede.nombre}`)
  }

  // 2. Crear roles del sistema
  console.log("\n2. Creando roles del sistema...")
  const rolesCreados: Record<string, string> = {}

  for (const rolData of ROLES_INICIALES) {
    const rol = await prisma.rol.upsert({
      where: { codigo: rolData.codigo },
      update: {
        nombre: rolData.nombre,
        descripcion: rolData.descripcion,
        color: rolData.color,
        esSistema: rolData.esSistema,
      },
      create: rolData,
    })
    rolesCreados[rol.codigo] = rol.id
    console.log(`   Rol creado: ${rol.nombre} (${rol.codigo})`)
  }

  // 3. Crear tipos de documento de trámite
  console.log("\n3. Creando tipos de documento de trámite...")
  for (const tipoDoc of TIPOS_DOCUMENTO_TRAMITE) {
    await prisma.tipoDocumentoTramite.upsert({
      where: { codigo: tipoDoc.codigo },
      update: {
        nombre: tipoDoc.nombre,
        descripcion: tipoDoc.descripcion,
        requiereFirma: tipoDoc.requiereFirma,
        prefijo: tipoDoc.prefijo,
      },
      create: tipoDoc,
    })
    console.log(`   Tipo documento: ${tipoDoc.nombre} (${tipoDoc.codigo})`)
  }

  // 4. Crear dependencias de UNAMAD
  console.log("\n4. Creando dependencias UNAMAD...")

  // Mapeo de sede_id del sistema antiguo a código de sede
  const sedeMapping: Record<number, string> = {
    1: "CIUDAD",
    2: "SEDE-2-MAYO",
    3: "SEDE-INAPARI",
    4: "VIVERO-FORESTAL",
    5: "PPTM",
  }

  // Dependencias del sistema anterior (solo activas)
  const DEPENDENCIAS_SISTEMA = [
    // Sede 1 - Ciudad Universitaria
    { sede_id: 1, codigo: "OTI", nombre: "OFICINA DE TECNOLOGÍAS DE LA INFORMACIÓN", tipo: "OFICINA" as const, correo: "oti@unamad.edu.pe" },
    { sede_id: 1, codigo: "AU", nombre: "ASAMBLEA UNIVERSITARIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "CU", nombre: "CONSEJO UNIVERSITARIO", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "R", nombre: "RECTORADO", tipo: "RECTORADO" as const },
    { sede_id: 1, codigo: "VRA", nombre: "VICERRECTORADO ACADÉMICO", tipo: "VICERRECTORADO" as const },
    { sede_id: 1, codigo: "VRI", nombre: "VICERRECTORADO DE INVESTIGACIÓN", tipo: "VICERRECTORADO" as const },
    { sede_id: 1, codigo: "OCI", nombre: "ÓRGANO DE CONTROL INSTITUCIONAL", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "CPF", nombre: "COMISIÓN PERMANENTE DE FISCALIZACIÓN", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "TH", nombre: "TRIBUNAL DE HONOR", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DU", nombre: "DEFENSORIA UNIVERSITARIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "OPP", nombre: "OFICINA DE PLANEAMIENTO Y PRESUPUESTO", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "UF", nombre: "UNIDAD FORMULADORA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UPE", nombre: "UNIDAD DE PLANEAMIENTO ESTRATÉGICO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UP", nombre: "UNIDAD DE PRESUPUESTO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UME", nombre: "UNIDAD DE MODERNIZACIÓN Y ESTADÍSTICA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "OAJ", nombre: "OFICINA DE ASESORÍA JURÍDICA", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "OCRI", nombre: "OFICINA DE COOPERACIÓN Y RELACIONES INTERNACIONALES", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "UGC", nombre: "OFICINA DE GESTIÓN DE LA CALIDAD", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "OCII", nombre: "OFICINA DE COMUNICACIÓN E IMAGEN INSTITUCIONAL", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "UPRP", nombre: "UNIDAD DE PRENSA Y RELACIONES PUBLICAS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "OGAC", nombre: "OFICINA DE GESTIÓN AMBIENTAL, GESTIÓN DE RIESGO Y ADAPTACIÓN AL CAMBIO CLIMÁTICO", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "DIGA", nombre: "DIRECCIÓN GENERAL DE ADMINISTRACIÓN", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "UC", nombre: "UNIDAD DE CONTABILIDAD", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UA", nombre: "UNIDAD DE ABASTECIMIENTO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UT", nombre: "UNIDAD DE TESORERÍA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UBP", nombre: "UNIDAD DE BIENES PATRIMONIALES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "URH", nombre: "UNIDAD DE RECURSOS HUMANOS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UEI", nombre: "UNIDAD EJECUTORA DE INVERSIONES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "USG", nombre: "UNIDAD DE SERVICIOS GENERALES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "USRT-OTI", nombre: "UNIDAD DE SOPORTE, REDES Y TELECOMUNICACIONES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UDP-OTI", nombre: "UNIDAD DE DISEÑO Y PROGRAMACIÓN", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "SG", nombre: "SECRETARIA GENERAL", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "UAC", nombre: "UNIDAD DE ARCHIVO CENTRAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UGT", nombre: "UNIDAD DE GRADOS Y TÍTULOS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UTD", nombre: "UNIDAD DE TRAMITE DOCUMENTARIO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "DA", nombre: "DIRECCIÓN DE ADMISIÓN", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "DBC", nombre: "DIRECCIÓN DE BIBLIOTECA CENTRAL", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "DPSEC", nombre: "DIRECCION DE PROYECCIÓN SOCIAL Y EXTENSION CULTURAL", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "URSU", nombre: "UNIDAD DE RESPONSABILIDAD SOCIAL UNIVERSITARIA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "DBU", nombre: "DIRECCIÓN DE BIENESTAR UNIVERSITARIO", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "UASAD", nombre: "UNIDAD DE ASISTENCIA SOCIAL, ALIMENTARIA Y DEPORTE", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "USSP", nombre: "UNIDAD DE SERVICIOS DE SALUD Y PSICOPEDAGOGIA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "DAA", nombre: "DIRECCIÓN DE ASUNTOS ACADÉMICOS", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "USEBT", nombre: "UNIDAD DE SEGUIMIENTO AL EGRESADO Y BOLSA DE TRABAJO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UEDD", nombre: "UNIDAD DE EVALUACIÓN Y DESARROLLO AL DOCENTE", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "URAA", nombre: "UNIDAD DE REGISTRO ACADÉMICOS Y ARCHIVOS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "DIE", nombre: "DIRECCIÓN DE INCUBADORA DE EMPRESAS", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "URI", nombre: "UNIDAD DE REPOSITORIO INSTITUCIONAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "INI", nombre: "INSTITUTO DE INVESTIGACIÓN", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "UFE", nombre: "UNIDAD DE FONDO EDITORIAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "ULI", nombre: "UNIDAD DE LABORATORIOS DE INVESTIGACIÓN", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "CF", nombre: "CONSEJO DE FACULTAD", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "D", nombre: "DECANATO", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAE", nombre: "DEPARTAMENTO ACADÉMICO DE ECOTURISMO", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DADCP", nombre: "DEPARTAMENTO ACADÉMICO DE DERECHO Y CIENCIAS POLÍTICAS", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DACYF", nombre: "DEPARTAMENTO ACADÉMICO DE CONTABILIDAD Y ADMINISTRACIÓN", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAED", nombre: "DEPARTAMENTO ACADÉMICO DE EDUCACIÓN", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAMVZ", nombre: "DEPARTAMENTO ACADÉMICO DE MEDICINA VETERINARIA Y ZOOTECNIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAEN", nombre: "DEPARTAMENTO ACADÉMICO DE ENFERMERÍA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAISI", nombre: "DEPARTAMENTO ACADÉMICO DE INGENIERÍA DE SISTEMAS E INFORMÁTICA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAIA", nombre: "DEPARTAMENTO ACADÉMICO DE INGENIERÍA AGROINDUSTRIAL", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DAIFYMA", nombre: "DEPARTAMENTO ACADÉMICO DE INGENIERÍA FORESTAL Y MEDIO AMBIENTE", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "EPDCP", nombre: "ESCUELA PROFESIONAL DE DERECHO Y CIENCIAS POLITICAS", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPCYF", nombre: "ESCUELA PROFESIONAL DE CONTABILIDAD Y FINANZAS", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPAYNI", nombre: "ESCUELA PROFESIONAL DE ADMINISTRACIÓN Y NEGOCIOS INTERNACIONALES", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPE", nombre: "ESCUELA PROFESIONAL DE ECOTURISMO", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPED", nombre: "ESCUELA PROFESIONAL DE EDUCACION", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPMVZ", nombre: "ESCUELA PROFESIONAL DE MEDICINA VETERINARIA Y ZOOTECNIA", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPEN", nombre: "ESCUELA PROFESIONAL DE ENFERMERIA", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPISI", nombre: "ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS E INFORMÁTICA", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPIA", nombre: "ESCUELA PROFESIONAL DE INGENIERÍA AGROINDUSTRIAL", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "EPIFYMA", nombre: "ESCUELA PROFESIONAL DE INGENIERÍA FORESTAL Y MEDIO AMBIENTE", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "FCE", nombre: "FACULTAD DE CIENCIAS EMPRESARIALES", tipo: "FACULTAD" as const },
    { sede_id: 1, codigo: "FED", nombre: "FACULTAD DE EDUCACIÓN", tipo: "FACULTAD" as const },
    { sede_id: 1, codigo: "FI", nombre: "FACULTAD DE INGENIERÍA", tipo: "FACULTAD" as const },
    { sede_id: 1, codigo: "DACB", nombre: "DEPARTAMENTO ACADÉMICO DE CIENCIAS BÁSICAS", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "UBE", nombre: "UNIDAD DE BIENESTAR ESTUDIANTIL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UPD", nombre: "OFICINA DE PROMOCIÓN DEL DEPORTE", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "INRENMA", nombre: "INSTITUTO DE INVESTIGACIÓN DE RECURSOS NATURALES Y MEDIO AMBIENTE", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DIGI", nombre: "DIRECCIÓN GENERAL DE INVESTIGACIÓN", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "AC", nombre: "ARCHIVO CENTRAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "ALC", nombre: "ALMACÉN CENTRAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UFDP-URH", nombre: "UNIDAD FUNCIONAL DE DESARROLLO PERSONAL", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "HAG", nombre: "HERBARIO ALWYN GENTRY", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "STPADD", nombre: "SECRETARIA TECNICA DE PROCEDIMIENTO ADMINISTRATIVO DISCIPLINARIO PARA DOCENTES", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "UFR-URH", nombre: "UNIDAD FUNCIONAL DE REMUNERACIONES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UFE-URH", nombre: "UNIDAD FUNCIONAL DE ESCALAFON", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "STPAD-URH", nombre: "SECRETARIA TECNICA DE PROCESOS ADMINISTRATIVOS DISCIPLINARIOS", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "CEU", nombre: "COMITÉ ELECTORAL UNIVERSITARIO", tipo: "OTRO" as const, correo: "ceu-elecciones2022@unamad.edu.pe" },
    { sede_id: 1, codigo: "UFSYLP", nombre: "UNIDAD FUNCIONAL DE SUPERVISION Y LIQUIDACION DE PROYECTOS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "DITRAT", nombre: "DIRECCIÓN DE INNOVACIÓN Y TRANSFERENCIA TECNOLÓGICA", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "LAB-INF", nombre: "LABORATORIO DE INFORMÁTICA DE EDUCACIÓN", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "AFA-ABAST", nombre: "ÁREA FUNCIONAL DE ADQUISICIONES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "SERV-ALIM", nombre: "OFICINA DE SERVICIO ALIMENTARIO", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "ASIST-SOC", nombre: "OFICINA DE ASISTENCIA SOCIAL", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "PSICO", nombre: "SERVICIO DE PSICOPEDAGOGIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "SERV-PSI", nombre: "SERVICIO DE PSICOLOGÍA", tipo: "OTRO" as const, correo: "psicologia.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "SERV-MED", nombre: "SERVICIO DE MEDICINA", tipo: "OTRO" as const, correo: "medicina.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "SER-TRI", nombre: "SERVICIO DE TÓPICO Y ENFERMERIA", tipo: "OTRO" as const, correo: "topico.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "SER-FARM", nombre: "SERVICIO DE FARMACIA", tipo: "OTRO" as const, correo: "farmacia.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "USO", nombre: "UNIDAD DE SEGURIDAD Y SALUD EN EL TRABAJO", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "CEPI", nombre: "COMITÉ DE CALIDAD Y ACREDITACIÓN DE LA ESPECIALIDAD DE PRIMARIA E INFORMÁTICA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "OCN", nombre: "OFICINA DE CICLO DE NIVELACION", tipo: "OFICINA" as const },
    { sede_id: 1, codigo: "ULI-INV", nombre: "UNIDAD DE LABORATORIO DE INVESTIGACION", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "FED-UPG", nombre: "UNIDAD DE POSTGRADO - FACULTAD EDUCACION", tipo: "UNIDAD" as const, correo: "fe-postgrado@unamad.edu.pe" },
    { sede_id: 1, codigo: "DOC-UNAMAD", nombre: "DOCENTES", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "SICHS", nombre: "SECRETARIA DE INSTRUCCION PARA CASOS DE HOSTIGAMIENTO SEXUAL", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "SINTUNAMAD", nombre: "SINDICATO DE TRABAJADORES ADMINISTRATIVOS DE LA UNAMAD", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "UPFI", nombre: "UNIDAD DE POSGRADO - FACULTAD DE INGENIERIA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "OBRA-ENFERMERIA", nombre: "MEJORAMIENTO DE LOS SERVICIOS ACADEMICO PRACTICO DE LA ESCUELA PROFESIONAL DE ENFERMERIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "UIFI", nombre: "UNIDAD DE INVESTIGACION-FACULTAD DE INGENIERIA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UPFCE", nombre: "UNIDAD DE POSGRADO DE LA FACULTAD DE CIENCIAS EMPRESARIALES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "UIFCE", nombre: "UNIDAD DE INVESTIGACION DE LA DECANATURA DE CIENCIAS EMPRESARIALES", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "CTIMH", nombre: "ESCUELA PROFESIONAL DE MEDICINA HUMANA", tipo: "ESCUELA" as const, correo: "escuela.med.hum@unamad.edu.pe" },
    { sede_id: 1, codigo: "UFE-EST", nombre: "UNIDAD FUNCIONAL DE ESTUDIOS", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "SERV-OBST", nombre: "SERVICIO DE OBSTETRICIA", tipo: "OTRO" as const, correo: "obstetricia.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "SERV-TOPI2", nombre: "SERVICIO TOPICO DE ENFERMERIA 2", tipo: "OTRO" as const, correo: "topico2.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "SERV-NUTR", nombre: "SERVICIO DE NUTRICION", tipo: "OTRO" as const, correo: "nutricion.ussps@unamad.edu.pe" },
    { sede_id: 1, codigo: "DURS", nombre: "DIRECCIÓN DE PROYECTOS Y EXTENSIÓN CULTURAL", tipo: "DIRECCION" as const },
    { sede_id: 1, codigo: "FACU", nombre: "FACULTAD", tipo: "FACULTAD" as const },
    { sede_id: 1, codigo: "CTBIOLOGIA", nombre: "COMISIÓN TÉCNICA DEL PROCESO DE IMPLEMENTACIÓN DE LA CARRERA PROFESIONAL DE BIOLOGIA", tipo: "OTRO" as const, correo: "CTBIOLOGIA@UNAMAD.EDU.PE" },
    { sede_id: 1, codigo: "DCE", nombre: "DECANATURA DE CIENCIAS EMPRESARIALES", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "SEG-VIG", nombre: "SEGURIDAD Y VIGILANCIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "CTECONOMIA", nombre: "COMISIÓN TÉCNICA DEL DISEÑO CURRICULAR DEL PROGRAMA DE ESTUDIOS DE ECONOMIA", tipo: "OTRO" as const, correo: "yparedes@unamad.edu.pe" },
    { sede_id: 1, codigo: "DCE-EDU", nombre: "DECANUTARA DE EDUCACION", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "EPDH", nombre: "ESCUELA PROFESIONAL DE EDUCACION Y HUMANIDADES", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "CTPSICOLOGIA", nombre: "COMISIÓN TÉCNICA DEL DISEÑO CURRICULAR DEL PROGRAMA DE ESTUDIOS DE PSICOLOGIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "CSST", nombre: "COMITÉ DE SEGURIDAD Y SALUD EN EL TRABAJO", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "EPECON", nombre: "ESCUELA PROFESIONAL DE ECONOMIA", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "UFMU", nombre: "UNIDAD FUNCIONAL DE MENTORIA UNIVERSITARIA", tipo: "UNIDAD" as const },
    { sede_id: 1, codigo: "EP-B", nombre: "ESCUELA PROFESIONAL DE BIOLOGIA", tipo: "ESCUELA" as const },
    { sede_id: 1, codigo: "DAE-ECON", nombre: "DEPARTAMENTO ACADEMICO DE ECONOMIA", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DACF", nombre: "DEPARTAMENTO ACADÉMICO DE CONTABILIDAD Y FINANZAS", tipo: "OTRO" as const },
    { sede_id: 1, codigo: "DDA-INI", nombre: "DEPARTAMENTO ACADÉMICO DE ADMINISTRACIÓN Y NEGOCIOS INTERNACIONALES", tipo: "OTRO" as const },
    // Sede 2 - Centro de Formación Académica (2 de Mayo)
    { sede_id: 2, codigo: "EPG", nombre: "ESCUELA DE POSGRADO", tipo: "ESCUELA" as const },
    { sede_id: 2, codigo: "CEPRE", nombre: "CENTRO PREUNIVERSITARIO", tipo: "OTRO" as const },
    { sede_id: 2, codigo: "CEINFO", nombre: "CENTRO DE INFORMÁTICA", tipo: "OTRO" as const },
    { sede_id: 2, codigo: "CIIDIOMAS", nombre: "CENTRO DE IDIOMAS", tipo: "OTRO" as const },
    { sede_id: 2, codigo: "DIPROBYS", nombre: "DIRECCIÓN DE PRODUCCIÓN DE BIENES Y SERVICIOS", tipo: "DIRECCION" as const },
    // Sede 4 - Vivero Forestal
    { sede_id: 4, codigo: "VIV-FOR", nombre: "VIVERO FORESTAL FUNDO EL BOSQUE", tipo: "OTRO" as const },
    // Sede 5 - Planta Piloto de Tecnología de la Madera
    { sede_id: 5, codigo: "PPTM-DEP", nombre: "PLANTA PILOTO DE TECNOLOGÍA DE LA MADERA", tipo: "OTRO" as const },
  ]

  for (const dep of DEPENDENCIAS_SISTEMA) {
    const sedeCodigo = sedeMapping[dep.sede_id]
    const sedeId = sedesCreadas[sedeCodigo]
    if (!sedeId) {
      console.log(`   ⚠ Sede no encontrada para dependencia: ${dep.nombre}`)
      continue
    }
    await prisma.dependencia.upsert({
      where: { codigo: dep.codigo },
      update: { sedeId },
      create: {
        codigo: dep.codigo,
        nombre: dep.nombre,
        siglas: dep.codigo,
        tipo: dep.tipo,
        sedeId,
      },
    })
  }
  console.log(`   ${DEPENDENCIAS_SISTEMA.length} dependencias UNAMAD creadas`)

  // 5. Crear usuarios de prueba
  console.log("\n5. Creando usuarios de prueba...")
  const sedeCentralId = sedesCreadas["CIUDAD"]

  // Obtener dependencias para asignar a usuarios
  const depOTI = await prisma.dependencia.findUnique({ where: { codigo: "OTI" } })
  const depUBP = await prisma.dependencia.findUnique({ where: { codigo: "UBP" } })
  const depUSRT = await prisma.dependencia.findUnique({ where: { codigo: "USRT-OTI" } })

  const passwordHash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@unamad.edu.pe" },
    update: {
      rolId: rolesCreados["ADMIN"],
      sedeId: sedeCentralId,
      dependenciaId: depOTI?.id,
    },
    create: {
      email: "admin@unamad.edu.pe",
      password: passwordHash,
      nombre: "Administrador",
      apellidos: "Sistema",
      tipoDocumento: "DNI",
      numeroDocumento: "00000000",
      cargo: "Administrador del Sistema",
      rolId: rolesCreados["ADMIN"],
      sedeId: sedeCentralId,
      dependenciaId: depOTI?.id,
    },
  })
  console.log(`   Usuario admin creado: ${admin.email}`)

  const userPasswordHash = await bcrypt.hash("usuario123", 10)
  const usuario = await prisma.usuario.upsert({
    where: { email: "patrimonio@unamad.edu.pe" },
    update: {
      rolId: rolesCreados["JEFE_PATRIMONIO"],
      sedeId: sedeCentralId,
      dependenciaId: depUBP?.id,
    },
    create: {
      email: "patrimonio@unamad.edu.pe",
      password: userPasswordHash,
      nombre: "Carlos",
      apellidos: "Mendoza Quispe",
      tipoDocumento: "DNI",
      numeroDocumento: "45678912",
      cargo: "Jefe de Unidad de Patrimonio",
      rolId: rolesCreados["JEFE_PATRIMONIO"],
      sedeId: sedeCentralId,
      dependenciaId: depUBP?.id,
    },
  })
  console.log(`   Usuario patrimonio creado: ${usuario.email}`)

  const userRedes = await prisma.usuario.upsert({
    where: { email: "redes@unamad.edu.pe" },
    update: {
      rolId: rolesCreados["RESPONSABLE"],
      sedeId: sedeCentralId,
      dependenciaId: depUSRT?.id,
    },
    create: {
      email: "redes@unamad.edu.pe",
      password: userPasswordHash,
      nombre: "María",
      apellidos: "García López",
      tipoDocumento: "DNI",
      numeroDocumento: "78912345",
      cargo: "Jefe de Unidad de Redes",
      rolId: rolesCreados["RESPONSABLE"],
      sedeId: sedeCentralId,
      dependenciaId: depUSRT?.id,
    },
  })
  console.log(`   Usuario redes creado: ${userRedes.email}`)

  // 6. Crear grupos de bienes
  console.log("\n6. Creando grupos de bienes...")
  const grupos = [
    { codigo: "7408", nombre: "EQUIPOS DE COMPUTO" },
    { codigo: "7409", nombre: "MOBILIARIO" },
    { codigo: "7410", nombre: "VEHICULOS" },
    { codigo: "7411", nombre: "MAQUINARIA" },
  ]

  for (const grupo of grupos) {
    await prisma.grupoBien.upsert({
      where: { codigo: grupo.codigo },
      update: {},
      create: grupo,
    })
  }
  console.log("   Grupos de bienes creados")

  // 7. Crear permisos por defecto para cada rol
  console.log("\n7. Creando permisos por defecto...")
  const modulos = Object.values(Modulo)
  const modulosAdmin = ["USUARIOS", "CONFIGURACION", "ROLES_PERMISOS", "ADMIN_PANEL"]
  const modulosRestringidosJefe = ["USUARIOS", "CONFIGURACION", "ROLES_PERMISOS"]

  for (const [codigoRol, rolId] of Object.entries(rolesCreados)) {
    // Eliminar permisos existentes del rol
    await prisma.permisoRol.deleteMany({ where: { rolId } })

    // Crear permisos según el rol
    for (const modulo of modulos) {
      let permisoData = {
        rolId,
        modulo,
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      }

      switch (codigoRol) {
        case "ADMIN":
          permisoData = { ...permisoData, ver: true, crear: true, editar: true, eliminar: true, reportes: true }
          break
        case "JEFE_PATRIMONIO":
          permisoData = {
            ...permisoData,
            ver: !modulosRestringidosJefe.includes(modulo),
            crear: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            editar: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            eliminar: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            reportes: !modulosRestringidosJefe.includes(modulo),
          }
          break
        case "RESPONSABLE":
          permisoData = {
            ...permisoData,
            ver: !modulosAdmin.includes(modulo),
            crear: ["BIENES", "INVENTARIO", "TRAMITE"].includes(modulo),
            editar: ["BIENES", "INVENTARIO", "TRAMITE"].includes(modulo),
            eliminar: false,
            reportes: ["BIENES", "INVENTARIO", "REPORTES", "TRAMITE"].includes(modulo),
          }
          break
        case "USUARIO":
          permisoData = {
            ...permisoData,
            ver: ["DASHBOARD", "BIENES", "INVENTARIO", "TRAMITE"].includes(modulo),
            crear: ["TRAMITE"].includes(modulo),
            editar: ["TRAMITE"].includes(modulo),
            eliminar: false,
            reportes: false,
          }
          break
      }

      await prisma.permisoRol.create({ data: permisoData })
    }
    console.log(`   Permisos creados para rol: ${codigoRol}`)
  }

  console.log("\n========================================")
  console.log("Seed UNAMAD completado exitosamente!")
  console.log("========================================")
  console.log("\nCredenciales de prueba:")
  console.log("  Admin:      admin@unamad.edu.pe / admin123")
  console.log("  Patrimonio: patrimonio@unamad.edu.pe / usuario123")
  console.log("  Redes:      redes@unamad.edu.pe / usuario123")
  console.log("========================================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
