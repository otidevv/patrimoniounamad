import sql from "mssql"

// Configuración de conexión a SQL Server (SIGA)
const config: sql.config = {
  server: process.env.DB_SQL_HOST || "localhost",
  port: parseInt(process.env.DB_SQL_PORT || "1433"),
  database: process.env.DB_SQL_DATABASE || "SIGA_1030",
  user: process.env.DB_SQL_USERNAME || "sa",
  password: process.env.DB_SQL_PASSWORD || "",
  options: {
    encrypt: false,
    trustServerCertificate: process.env.DB_SQL_TRUST_SERVER_CERTIFICATE === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

// Pool de conexiones singleton
let pool: sql.ConnectionPool | null = null

// Obtener conexión al pool
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect()
    console.log("Conexión a SIGA (SQL Server) establecida")
  }
  return pool
}

// Cerrar conexión
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    console.log("Conexión a SIGA cerrada")
  }
}

// Interface para el resultado de búsqueda de bien patrimonial
export interface BienPatrimonial {
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
  color: string | null
  medidas: string | null
  caracteristicas: string | null
  fecha_alta: string | null
  fecha_compra: string | null
  valor_compra: number | null
  valor_inicial: number | null
  valor_neto: number | null
  nombre_item: string | null
  codigo_barra: string | null
  centro_costo: string | null
  abreviatura: string | null
  observaciones: string | null
  proveedor: string | null
}

// Buscar bien por código patrimonial
export async function buscarBienPorCodigo(
  codigoPatrimonial: string
): Promise<BienPatrimonial | null> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("codigo_activo", sql.VarChar(12), codigoPatrimonial)
      .query(`
        SELECT
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.CODIGO_ACTIVO = @codigo_activo
          AND pat.ESTADO = 1
      `)

    if (result.recordset.length === 0) {
      return null
    }

    return result.recordset[0] as BienPatrimonial
  } catch (error) {
    console.error("Error al buscar bien en SIGA:", error)
    throw error
  }
}

// Buscar bienes por número de serie (búsqueda parcial)
export async function buscarBienesPorSerie(
  serie: string,
  limit: number = 50
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("serie", sql.VarChar(100), `%${serie}%`)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.NRO_SERIE LIKE @serie
          AND pat.ESTADO = 1
        ORDER BY pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por serie:", error)
    throw error
  }
}

// Buscar bienes por descripción (búsqueda parcial)
export async function buscarBienesPorDescripcion(
  descripcion: string,
  limit: number = 50
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("descripcion", sql.VarChar(200), `%${descripcion}%`)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.DESCRIPCION LIKE @descripcion
          AND pat.ESTADO = 1
        ORDER BY pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por descripción:", error)
    throw error
  }
}

// Buscar bienes por dependencia (centro de costo)
export async function buscarBienesPorDependencia(
  centroCosto: string,
  limit: number = 100
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("centro_costo", sql.VarChar(20), centroCosto)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.CENTRO_COSTO = @centro_costo
          AND pat.ESTADO = 1
        ORDER BY pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por dependencia:", error)
    throw error
  }
}

// Buscar bienes por número de documento (DNI) del responsable o usuario final
export async function buscarBienesPorDocumento(
  numeroDocumento: string,
  limit: number = 500
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("documento", sql.VarChar(20), numeroDocumento)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE (usuf.docum_ident = @documento OR resp.docum_ident = @documento)
          AND pat.ESTADO = 1
        ORDER BY pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por documento:", error)
    throw error
  }
}

// Interface para dependencia SIGA
export interface DependenciaSiga {
  centro_costo: string
  nombre_depend: string
  abreviado_depend: string | null
}

// Interface para resumen por usuario final
export interface ResumenUsuarioFinal {
  empleado_final: string
  usuario_nombre: string | null
  docum_ident: string | null
  total_bienes: number
}

// Listar dependencias SIGA (centros de costo)
export async function listarDependenciasSiga(
  anoEje?: number
): Promise<DependenciaSiga[]> {
  try {
    const poolConnection = await getConnection()

    // Si no se especifica año, usar el máximo disponible en la tabla
    let year: string
    if (anoEje) {
      year = String(anoEje)
    } else {
      const maxYear = await poolConnection
        .request()
        .query(`SELECT MAX(ANO_EJE) AS max_ano FROM SIG_CENTRO_COSTO`)
      const raw = maxYear.recordset[0]?.max_ano
      year = raw != null ? String(raw) : String(new Date().getFullYear())
    }

    const result = await poolConnection
      .request()
      .input("ano_eje", sql.VarChar(4), year.trim())
      .query(`
        SELECT DISTINCT
          cc.CENTRO_COSTO AS centro_costo,
          cc.NOMBRE_DEPEND AS nombre_depend,
          cc.ABREVIADO_DEPEND AS abreviado_depend
        FROM SIG_CENTRO_COSTO cc
        WHERE cc.ANO_EJE = @ano_eje
        ORDER BY cc.NOMBRE_DEPEND
      `)

    return result.recordset as DependenciaSiga[]
  } catch (error) {
    console.error("Error al listar dependencias SIGA:", error)
    throw error
  }
}

// Contar bienes activos por dependencia (centro de costo)
export async function contarBienesPorDependencia(
  centroCosto: string
): Promise<number> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("centro_costo", sql.VarChar(20), centroCosto)
      .query(`
        SELECT COUNT(*) AS total
        FROM SIG_PATRIMONIO
        WHERE CENTRO_COSTO = @centro_costo
          AND ESTADO = 1
      `)

    return result.recordset[0]?.total || 0
  } catch (error) {
    console.error("Error al contar bienes por dependencia:", error)
    throw error
  }
}

// Buscar bienes por dependencia con paginación
export async function buscarBienesPorDependenciaPaginado(
  centroCosto: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ bienes: BienPatrimonial[]; total: number }> {
  try {
    const poolConnection = await getConnection()
    const offset = (page - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      poolConnection
        .request()
        .input("centro_costo", sql.VarChar(20), centroCosto)
        .query(`
          SELECT COUNT(*) AS total
          FROM SIG_PATRIMONIO
          WHERE CENTRO_COSTO = @centro_costo
            AND ESTADO = 1
        `),
      poolConnection
        .request()
        .input("centro_costo", sql.VarChar(20), centroCosto)
        .input("offset", sql.Int, offset)
        .input("pageSize", sql.Int, pageSize)
        .query(`
          SELECT
            pat.CODIGO_ACTIVO AS codigo_patrimonial,
            pat.DESCRIPCION AS descripcion,
            sed.nombre_sede,
            cc.NOMBRE_DEPEND AS nombre_depend,
            resp.nombre_completo AS responsable,
            usuf.nombre_completo AS usuario,
            cnt.NOMBRE_PROV AS proveedor,
            CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
            pat.VALOR_COMPRA AS valor_compra,
            CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
            pat.VALOR_INICIAL AS valor_inicial,
            ubi.UBICAC_FISICA AS ubicacion_fisica,
            cat.NOMBRE_ITEM AS nombre_item,
            pat.CODIGO_BARRA AS codigo_barra,
            pat.MODELO AS modelo,
            pat.MEDIDAS AS medidas,
            (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
            pat.NRO_SERIE AS serie,
            mrc.NOMBRE AS marca,
            pat.CENTRO_COSTO AS centro_costo,
            cc.ABREVIADO_DEPEND AS abreviatura,
            col.NOMBRE AS color,
            pat.CARACTERISTICAS AS caracteristicas,
            pat.OBSERVACIONES AS observaciones
          FROM SIG_PATRIMONIO pat
          LEFT JOIN SIG_SEDES sed
            ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
          LEFT JOIN SIG_CENTRO_COSTO cc
            ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
            AND pat.SEC_EJEC = cc.SEC_EJEC
            AND pat.ANO_EJE = cc.ANO_EJE
          LEFT JOIN SIG_PERSONAL resp
            ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
          LEFT JOIN SIG_PERSONAL usuf
            ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
          LEFT JOIN SIG_CONTRATISTAS cnt
            ON pat.PROVEEDOR = cnt.PROVEEDOR
          LEFT JOIN SIG_UBICAC_FISICA ubi
            ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
          LEFT JOIN MARCA mrc
            ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
          LEFT JOIN CATALOGO_BIEN_SERV cat
            ON pat.SEC_EJEC = cat.SEC_EJEC
            AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
            AND pat.CLASE_BIEN = cat.CLASE_BIEN
            AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
            AND pat.ITEM_BIEN = cat.ITEM_BIEN
          OUTER APPLY (
            SELECT TOP 1 col2.NOMBRE
            FROM SIG_ESPECIF_TECNICA_ACTIVO eta
            LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
            WHERE eta.SEC_EJEC = pat.SEC_EJEC
              AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
              AND eta.SECUENCIA = pat.SECUENCIA
              AND eta.CODIGO_COLOR IS NOT NULL
          ) col
          WHERE pat.CENTRO_COSTO = @centro_costo
            AND pat.ESTADO = 1
          ORDER BY pat.CODIGO_ACTIVO
          OFFSET @offset ROWS
          FETCH NEXT @pageSize ROWS ONLY
        `),
    ])

    return {
      bienes: dataResult.recordset as BienPatrimonial[],
      total: countResult.recordset[0]?.total || 0,
    }
  } catch (error) {
    console.error("Error al buscar bienes paginados por dependencia:", error)
    throw error
  }
}

// Obtener lista ligera de códigos patrimoniales con su empleado final (para cruce de verificaciones)
export async function obtenerCodigosPorDependencia(
  centroCosto: string
): Promise<{ codigo_patrimonial: string; empleado_final: string }[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("centro_costo", sql.VarChar(20), centroCosto)
      .query(`
        SELECT
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.EMPLEADO_FINAL AS empleado_final
        FROM SIG_PATRIMONIO pat
        WHERE pat.CENTRO_COSTO = @centro_costo
          AND pat.ESTADO = 1
      `)

    return result.recordset
  } catch (error) {
    console.error("Error al obtener códigos por dependencia:", error)
    throw error
  }
}

// Obtener resumen de bienes agrupado por usuario final
export async function obtenerResumenPorUsuarioFinal(
  centroCosto: string
): Promise<ResumenUsuarioFinal[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("centro_costo", sql.VarChar(20), centroCosto)
      .query(`
        SELECT
          pat.EMPLEADO_FINAL AS empleado_final,
          usuf.nombre_completo AS usuario_nombre,
          usuf.docum_ident,
          COUNT(*) AS total_bienes
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        WHERE pat.CENTRO_COSTO = @centro_costo
          AND pat.ESTADO = 1
        GROUP BY pat.EMPLEADO_FINAL, usuf.nombre_completo, usuf.docum_ident
        ORDER BY usuf.nombre_completo
      `)

    return result.recordset as ResumenUsuarioFinal[]
  } catch (error) {
    console.error("Error al obtener resumen por usuario final:", error)
    throw error
  }
}

// Buscar bienes por empleado final (usuario) dentro de una dependencia
export async function buscarBienesPorEmpleadoFinal(
  centroCosto: string,
  empleadoFinal: string
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("centro_costo", sql.VarChar(20), centroCosto)
      .input("empleado_final", sql.VarChar(20), empleadoFinal)
      .query(`
        SELECT
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR, pat.FECHA_COMPRA, 103) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR, pat.FECHA_ALTA, 103) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.CENTRO_COSTO = @centro_costo
          AND pat.EMPLEADO_FINAL = @empleado_final
          AND pat.ESTADO = 1
        ORDER BY pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por empleado final:", error)
    throw error
  }
}

// Interface para el conteo de bienes por documento (para reportes)
export interface ConteoBienesUsuario {
  documento: string
  total_bienes: number
  valor_neto: number
}

// Contar bienes activos asignados a cada persona (como responsable o usuario final)
// para una lista de documentos, en una sola consulta agrupada.
// Un bien se cuenta una sola vez por persona aunque sea a la vez responsable y
// usuario final del mismo.
export async function contarBienesPorDocumentos(
  documentos: string[]
): Promise<ConteoBienesUsuario[]> {
  // Normalizar: sin vacíos, sin duplicados
  const docs = Array.from(
    new Set(documentos.map((d) => d?.trim()).filter((d): d is string => !!d))
  )

  if (docs.length === 0) return []

  try {
    const poolConnection = await getConnection()
    const request = poolConnection.request()

    // Construir la lista IN de forma parametrizada (evita inyección SQL)
    const placeholders = docs.map((doc, i) => {
      const name = `doc${i}`
      request.input(name, sql.VarChar(20), doc)
      return `@${name}`
    })

    const result = await request.query(`
      SELECT
        t.documento,
        COUNT(*) AS total_bienes,
        SUM(t.valor_neto) AS valor_neto
      FROM (
        SELECT DISTINCT
          per.docum_ident AS documento,
          pat.CODIGO_ACTIVO AS codigo,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto
        FROM SIG_PATRIMONIO pat
        CROSS APPLY (VALUES (pat.EMPLEADO), (pat.EMPLEADO_FINAL)) AS e(empleado)
        INNER JOIN SIG_PERSONAL per
          ON per.sec_ejec = pat.SEC_EJEC AND per.empleado = e.empleado
        WHERE pat.ESTADO = 1
          AND per.docum_ident IN (${placeholders.join(", ")})
      ) t
      GROUP BY t.documento
    `)

    return result.recordset.map((r) => ({
      documento: String(r.documento ?? "").trim(),
      total_bienes: Number(r.total_bienes) || 0,
      valor_neto: Number(r.valor_neto) || 0,
    }))
  } catch (error) {
    console.error("Error al contar bienes por documentos:", error)
    throw error
  }
}

// Interface para el resumen valorizado por grupo (dependencia o sede)
export interface GrupoValorizado {
  grupo_id: string
  grupo_nombre: string
  abreviatura: string | null
  total_bienes: number
  valor_compra: number
  valor_inicial: number
  depreciacion: number
  valor_neto: number
}

// Resumen del inventario valorizado, agrupado por dependencia (centro de costo)
// o por sede. Incluye valor de compra, valor inicial, depreciación acumulada y
// valor neto de los bienes activos.
export async function obtenerResumenValorizado(
  agrupacion: "dependencia" | "sede"
): Promise<GrupoValorizado[]> {
  try {
    const poolConnection = await getConnection()

    const query =
      agrupacion === "sede"
        ? `
        SELECT
          pat.SEDE AS grupo_id,
          MAX(sed.nombre_sede) AS grupo_nombre,
          NULL AS abreviatura,
          COUNT(*) AS total_bienes,
          SUM(ISNULL(pat.VALOR_COMPRA,0)) AS valor_compra,
          SUM(ISNULL(pat.HVALOR_INICIAL,0)) AS valor_inicial,
          SUM(ISNULL(pat.HDEPR_INICIAL,0)) AS depreciacion,
          SUM(ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        WHERE pat.ESTADO = 1
        GROUP BY pat.SEDE
        ORDER BY valor_neto DESC
      `
        : `
        SELECT
          pat.CENTRO_COSTO AS grupo_id,
          MAX(cc.NOMBRE_DEPEND) AS grupo_nombre,
          MAX(cc.ABREVIADO_DEPEND) AS abreviatura,
          COUNT(*) AS total_bienes,
          SUM(ISNULL(pat.VALOR_COMPRA,0)) AS valor_compra,
          SUM(ISNULL(pat.HVALOR_INICIAL,0)) AS valor_inicial,
          SUM(ISNULL(pat.HDEPR_INICIAL,0)) AS depreciacion,
          SUM(ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        WHERE pat.ESTADO = 1
        GROUP BY pat.CENTRO_COSTO
        ORDER BY valor_neto DESC
      `

    const result = await poolConnection.request().query(query)

    return result.recordset.map((r) => ({
      grupo_id: String(r.grupo_id ?? "").trim(),
      grupo_nombre: (r.grupo_nombre ? String(r.grupo_nombre).trim() : "") || "(Sin asignar)",
      abreviatura: r.abreviatura ? String(r.abreviatura).trim() : null,
      total_bienes: Number(r.total_bienes) || 0,
      valor_compra: Number(r.valor_compra) || 0,
      valor_inicial: Number(r.valor_inicial) || 0,
      depreciacion: Number(r.depreciacion) || 0,
      valor_neto: Number(r.valor_neto) || 0,
    }))
  } catch (error) {
    console.error("Error al obtener resumen valorizado:", error)
    throw error
  }
}

// Interface para el resumen por sede con desglose de dependencia
export interface SedeDependencia {
  sede_id: string
  sede_nombre: string
  dep_id: string
  dep_nombre: string
  total_bienes: number
  valor_neto: number
}

// Resumen de bienes activos agrupado por sede y, dentro de cada sede, por
// dependencia (centro de costo). Se anida en la capa de API.
export async function obtenerResumenSedeDependencia(): Promise<SedeDependencia[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection.request().query(`
      SELECT
        pat.SEDE AS sede_id,
        MAX(sed.nombre_sede) AS sede_nombre,
        pat.CENTRO_COSTO AS dep_id,
        MAX(cc.NOMBRE_DEPEND) AS dep_nombre,
        COUNT(*) AS total_bienes,
        SUM(ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto
      FROM SIG_PATRIMONIO pat
      LEFT JOIN SIG_SEDES sed
        ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
      LEFT JOIN SIG_CENTRO_COSTO cc
        ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
        AND pat.SEC_EJEC = cc.SEC_EJEC
        AND pat.ANO_EJE = cc.ANO_EJE
      WHERE pat.ESTADO = 1
      GROUP BY pat.SEDE, pat.CENTRO_COSTO
      ORDER BY MAX(sed.nombre_sede), valor_neto DESC
    `)

    return result.recordset.map((r) => ({
      sede_id: String(r.sede_id ?? "").trim(),
      sede_nombre: (r.sede_nombre ? String(r.sede_nombre).trim() : "") || "(Sin sede)",
      dep_id: String(r.dep_id ?? "").trim(),
      dep_nombre: (r.dep_nombre ? String(r.dep_nombre).trim() : "") || "(Sin dependencia)",
      total_bienes: Number(r.total_bienes) || 0,
      valor_neto: Number(r.valor_neto) || 0,
    }))
  } catch (error) {
    console.error("Error al obtener resumen por sede y dependencia:", error)
    throw error
  }
}

// Buscar bienes por fecha de alta (incorporación) en un rango de fechas.
// Devuelve los bienes activos cuya FECHA_ALTA cae dentro del periodo indicado.
export async function buscarBienesPorFechaAlta(
  fechaInicio: string,
  fechaFin: string,
  limit: number = 5000
): Promise<BienPatrimonial[]> {
  try {
    const poolConnection = await getConnection()
    const result = await poolConnection
      .request()
      .input("ini", sql.VarChar(10), fechaInicio)
      .input("fin", sql.VarChar(10), fechaFin)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          pat.CODIGO_ACTIVO AS codigo_patrimonial,
          pat.DESCRIPCION AS descripcion,
          sed.nombre_sede,
          cc.NOMBRE_DEPEND AS nombre_depend,
          resp.nombre_completo AS responsable,
          usuf.nombre_completo AS usuario,
          cnt.NOMBRE_PROV AS proveedor,
          CONVERT(VARCHAR(10), pat.FECHA_COMPRA, 23) AS fecha_compra,
          pat.VALOR_COMPRA AS valor_compra,
          CONVERT(VARCHAR(10), pat.FECHA_ALTA, 23) AS fecha_alta,
          pat.VALOR_INICIAL AS valor_inicial,
          ubi.UBICAC_FISICA AS ubicacion_fisica,
          cat.NOMBRE_ITEM AS nombre_item,
          pat.CODIGO_BARRA AS codigo_barra,
          pat.MODELO AS modelo,
          pat.MEDIDAS AS medidas,
          (ISNULL(pat.HVALOR_INICIAL,0) - ISNULL(pat.HDEPR_INICIAL,0)) AS valor_neto,
          pat.NRO_SERIE AS serie,
          mrc.NOMBRE AS marca,
          pat.CENTRO_COSTO AS centro_costo,
          cc.ABREVIADO_DEPEND AS abreviatura,
          col.NOMBRE AS color,
          pat.CARACTERISTICAS AS caracteristicas,
          pat.OBSERVACIONES AS observaciones
        FROM SIG_PATRIMONIO pat
        LEFT JOIN SIG_SEDES sed
          ON pat.SEDE = sed.sede AND pat.PLIEGO = sed.pliego
        LEFT JOIN SIG_CENTRO_COSTO cc
          ON pat.CENTRO_COSTO = cc.CENTRO_COSTO
          AND pat.SEC_EJEC = cc.SEC_EJEC
          AND pat.ANO_EJE = cc.ANO_EJE
        LEFT JOIN SIG_PERSONAL resp
          ON pat.SEC_EJEC = resp.sec_ejec AND pat.EMPLEADO = resp.empleado
        LEFT JOIN SIG_PERSONAL usuf
          ON pat.SEC_EJEC = usuf.sec_ejec AND pat.EMPLEADO_FINAL = usuf.empleado
        LEFT JOIN SIG_CONTRATISTAS cnt
          ON pat.PROVEEDOR = cnt.PROVEEDOR
        LEFT JOIN SIG_UBICAC_FISICA ubi
          ON pat.TIPO_UBICAC = ubi.TIPO_UBICAC AND pat.COD_UBICAC = ubi.COD_UBICAC
        LEFT JOIN MARCA mrc
          ON pat.MARCA = mrc.MARCA AND pat.TIPO_MARCA = mrc.TIPO_MARCA
        LEFT JOIN CATALOGO_BIEN_SERV cat
          ON pat.SEC_EJEC = cat.SEC_EJEC
          AND pat.GRUPO_BIEN = cat.GRUPO_BIEN
          AND pat.CLASE_BIEN = cat.CLASE_BIEN
          AND pat.FAMILIA_BIEN = cat.FAMILIA_BIEN
          AND pat.ITEM_BIEN = cat.ITEM_BIEN
        OUTER APPLY (
          SELECT TOP 1 col2.NOMBRE
          FROM SIG_ESPECIF_TECNICA_ACTIVO eta
          LEFT JOIN SIG_COLORES col2 ON eta.CODIGO_COLOR = col2.CODIGO_COLOR
          WHERE eta.SEC_EJEC = pat.SEC_EJEC
            AND eta.TIPO_MODALIDAD = pat.TIPO_MODALIDAD
            AND eta.SECUENCIA = pat.SECUENCIA
            AND eta.CODIGO_COLOR IS NOT NULL
        ) col
        WHERE pat.ESTADO = 1
          AND pat.FECHA_ALTA >= @ini
          AND pat.FECHA_ALTA < DATEADD(DAY, 1, @fin)
        ORDER BY pat.FECHA_ALTA DESC, pat.CODIGO_ACTIVO
      `)

    return result.recordset as BienPatrimonial[]
  } catch (error) {
    console.error("Error al buscar bienes por fecha de alta:", error)
    throw error
  }
}

// Verificar conexión a SIGA
export async function verificarConexion(): Promise<boolean> {
  try {
    const poolConnection = await getConnection()
    await poolConnection.request().query("SELECT 1")
    return true
  } catch (error) {
    console.error("Error de conexión a SIGA:", error)
    return false
  }
}
