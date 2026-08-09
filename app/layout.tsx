import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { FirmaPeruScripts } from "@/components/firma-peru/firma-peru-scripts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIGA Patrimonio - UNAMAD",
  description: "Sistema de Gestión de Patrimonio - Universidad Nacional Amazónica de Madre de Dios",
  icons: {
    icon: "/logos/logo_single_min.png",
    shortcut: "/logos/logo_single_min.png",
    apple: "/logos/logo_single_min.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="siga-patrimonio-theme"
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        {/* jQuery 3.6.0 + contenedores DOM requeridos por Firma Perú (PCM) */}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
          strategy="lazyOnload"
          id="jquery-firma-peru"
        />
        <Script id="jquery-init-firma-peru" strategy="lazyOnload">{`
          (function check(){
            if(typeof jQuery!=='undefined'){
              var jq=jQuery.noConflict(true);
              window.jqFirmaPeru=jq;window.$=jq;window.jQuery=jq;
            } else { setTimeout(check,100); }
          })();
        `}</Script>
        <FirmaPeruScripts />
        {/* Contenedores ocultos requeridos por firmaperu.min.js para ClickOnce */}
        {/* firmaperu.min.js hace getElementById("addComponent").appendChild(...) para lanzar el cliente */}
        <div id="addComponent" style={{display:"none"}} />
        <div id="FirmaPeruContainer" style={{display:"none"}} />
        <div id="clickOnceDiv" style={{display:"none"}} />
        <iframe id="FirmaPeruFrame" name="FirmaPeruFrame" style={{display:"none",width:0,height:0,border:"none",position:"absolute"}} />
        <iframe id="iframeClickOnce" name="iframeClickOnce" style={{display:"none",width:0,height:0,border:"none",position:"absolute"}} />
      </body>
    </html>
  );
}
