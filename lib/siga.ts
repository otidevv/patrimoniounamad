import sql from "mssql"

// Configuración de conexión a SQL Server (SIGA)
const config: sql.config = {
  server: process.env.DB_HOST_MSSQL || "localhost",
  port: parseInt(process.env.DB_PORT_MSSQL || "1433"),
  database: process.env.DB_DATABASE_MSSQL || "SIGA_1030",
  user: process.env.DB_USERNAME_MSSQL || "sa",
  password: process.env.DB_PASSWORD_MSSQL || "",
  options: {
    encrypt: process.env.DB_SQL_ENCRYPT === "yes",
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
