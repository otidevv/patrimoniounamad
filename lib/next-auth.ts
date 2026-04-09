import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email ?? ""
        if (!email.endsWith("@unamad.edu.pe")) {
          return false
        }

        const googleImage = (profile as any)?.picture ?? profile?.image ?? null

        // Auto-registro: si no existe, crear usuario con rol USUARIO
        const existe = await prisma.usuario.findUnique({
          where: { email },
        })

        if (!existe) {
          const rolUsuario = await prisma.rol.findUnique({
            where: { codigo: "USUARIO" },
          })
          if (!rolUsuario) return false

          const nombre = profile?.name ?? email.split("@")[0]
          const partes = nombre.split(" ")
          const randomPwd = await bcrypt.hash(crypto.randomUUID(), 10)

          await prisma.usuario.create({
            data: {
              email,
              password: randomPwd,
              nombre: partes[0] ?? nombre,
              apellidos: partes.slice(1).join(" ") || "",
              rolId: rolUsuario.id,
              activo: true,
              fotoGoogle: googleImage,
            },
          })
        } else if (!existe.activo) {
          return false
        } else {
          // Usuario existente: actualizar foto de Google en cada login
          await prisma.usuario.update({
            where: { email },
            data: { fotoGoogle: googleImage },
          })
        }

        return true
      }
      return true
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        // Cargar datos del usuario desde la BD para el token
        const usuario = await prisma.usuario.findUnique({
          where: { email: profile.email },
          include: { rol: true },
        })
        if (usuario) {
          token.dbUserId = usuario.id
          token.rol = usuario.rol.codigo
          token.rolId = usuario.rolId
          token.dependenciaId = usuario.dependenciaId
          token.nombre = usuario.nombre
          token.apellidos = usuario.apellidos
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as Record<string, unknown>
        ;(session as any).dbUserId = t.dbUserId
        ;(session as any).rol = t.rol
        ;(session as any).rolId = t.rolId
        ;(session as any).dependenciaId = t.dependenciaId
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
