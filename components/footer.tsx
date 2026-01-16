import { Package, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#152a3f] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Info institucional */}
          <div>
            <a href="/" className="flex items-center gap-3 mb-4 w-fit hover:opacity-90 transition-opacity">
              <div className="flex items-center justify-center size-10 rounded-lg bg-white/10">
                <Package className="size-5 text-[#db0455]" />
              </div>
              <div>
                <div className="font-semibold">SIGA Patrimonio</div>
                <div className="text-xs text-white/60">UNAMAD</div>
              </div>
            </a>
            <p className="text-sm text-white/70">
              Sistema de Gestión de Patrimonio Institucional de la Universidad
              Nacional Amazónica de Madre de Dios.
            </p>
          </div>

          {/* Enlaces */}
          <div>
            <h4 className="font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="https://www.unamad.edu.pe" className="hover:text-[#db0455] transition-colors">
                  Portal UNAMAD
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#db0455] transition-colors">
                  Manual de Usuario
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#db0455] transition-colors">
                  Normativa SBN
                </a>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="font-semibold mb-4">Soporte Técnico</h4>
            <div className="space-y-2 text-sm text-white/70">
              <p>Oficina de Tecnologías de Información (OTI)</p>
              <p className="flex items-center gap-2">
                <Phone className="size-4" />
                (082) 573532 - Anexo 120
              </p>
              <p>soporte@unamad.edu.pe</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Universidad Nacional Amazónica de Madre de Dios.
            Todos los derechos reservados.
          </p>
          <p className="text-sm text-white/60">
            Versión 1.0.0 | Desarrollado por OTI-UNAMAD
          </p>
        </div>
      </div>
    </footer>
  )
}
