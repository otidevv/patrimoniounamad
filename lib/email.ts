import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME || "SIGA Patrimonio UNAMAD"}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  }

  return transporter.sendMail(mailOptions)
}

export function getPasswordResetEmailTemplate(
  nombre: string,
  resetUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                SIGA Patrimonio
              </h1>
              <p style="color: rgba(255, 255, 255, 0.8); margin: 5px 0 0 0; font-size: 14px;">
                Universidad Nacional Amazónica de Madre de Dios
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 20px;">
                Hola ${nombre},
              </h2>
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Gestión Patrimonial de la UNAMAD.
              </p>
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0;">
                Haz clic en el siguiente botón para crear una nueva contraseña:
              </p>

              <!-- Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #db0455;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Restablecer Contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Este enlace expirará en <strong>1 hora</strong> por motivos de seguridad.
              </p>
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.
              </p>

              <!-- Alternative Link -->
              <div style="margin-top: 30px; padding: 20px; background-color: #f7fafc; border-radius: 6px;">
                <p style="color: #4a5568; font-size: 13px; margin: 0 0 10px 0;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>
                <p style="color: #3182ce; font-size: 12px; word-break: break-all; margin: 0;">
                  ${resetUrl}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                Este es un correo automático del Sistema de Gestión Patrimonial.
              </p>
              <p style="color: #718096; font-size: 12px; margin: 5px 0 0 0;">
                © ${new Date().getFullYear()} UNAMAD - Oficina de Control Patrimonial
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
