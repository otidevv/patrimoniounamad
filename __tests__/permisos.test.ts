import { construirPermisosMap, type PermisoRolDB } from "@/lib/validaciones"

// Subconjunto representativo de los módulos del sistema (enum Modulo)
const MODULOS = ["DASHBOARD", "BIENES", "INVENTARIO", "REPORTES", "USUARIOS"]

describe("Verificación de permisos por rol", () => {
  it("ADMIN obtiene todos los permisos en todos los módulos", () => {
    const map = construirPermisosMap(true, [], MODULOS)
    for (const modulo of MODULOS) {
      expect(map[modulo]).toEqual({
        ver: true,
        crear: true,
        editar: true,
        eliminar: true,
        reportes: true,
      })
    }
  })

  it("un rol sin permisos en BD tiene todo en false", () => {
    const map = construirPermisosMap(false, [], MODULOS)
    for (const modulo of MODULOS) {
      expect(map[modulo]).toEqual({
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      })
    }
  })

  it("aplica los permisos de la BD solo a los módulos correspondientes", () => {
    const permisosDB: PermisoRolDB[] = [
      { modulo: "BIENES", ver: true, crear: true, editar: false, eliminar: false, reportes: true },
    ]
    const map = construirPermisosMap(false, permisosDB, MODULOS)

    // BIENES toma los valores de la BD
    expect(map.BIENES).toEqual({
      ver: true,
      crear: true,
      editar: false,
      eliminar: false,
      reportes: true,
    })
    // Los demás siguen en false
    expect(map.DASHBOARD.ver).toBe(false)
    expect(map.REPORTES.ver).toBe(false)
  })

  it("incluye todos los módulos en el mapa aunque no estén en la BD", () => {
    const map = construirPermisosMap(false, [], MODULOS)
    expect(Object.keys(map).sort()).toEqual([...MODULOS].sort())
  })

  it("un rol de solo lectura puede ver pero no modificar", () => {
    const permisosDB: PermisoRolDB[] = MODULOS.map((modulo) => ({
      modulo,
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      reportes: false,
    }))
    const map = construirPermisosMap(false, permisosDB, MODULOS)

    expect(map.INVENTARIO.ver).toBe(true)
    expect(map.INVENTARIO.crear).toBe(false)
    expect(map.INVENTARIO.eliminar).toBe(false)
  })
})
