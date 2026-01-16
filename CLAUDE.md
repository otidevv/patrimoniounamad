# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Gestión de Patrimonio para la Universidad Nacional Amazónica de Madre de Dios (UNAMAD), Perú. Interfaz moderna que mejora la experiencia del módulo de patrimonio del SIGA (Sistema Integrado de Gestión Administrativa).

### Dominio del Sistema

- **Bienes patrimoniales**: Activos fijos de la universidad (equipos, mobiliario, vehículos, infraestructura)
- **Control de inventario**: Registro, seguimiento y estado de bienes
- **Operaciones**: Altas, bajas, transferencias entre dependencias
- **Usuarios**: Personal administrativo de UNAMAD encargado del control patrimonial

## Development Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router
- **React**: 19.2.3
- **Styling**: Tailwind CSS 4 with tw-animate-css
- **UI Components**: shadcn/ui (new-york style) with Lucide icons
- **Language**: TypeScript with strict mode

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  layout.tsx            # Root layout with SidebarProvider
  page.tsx              # Dashboard principal
  globals.css           # Global styles and CSS variables
components/
  app-sidebar.tsx       # Sidebar de navegación principal
  ui/                   # Componentes shadcn/ui (button, card, sidebar, etc.)
hooks/
  use-mobile.ts         # Hook para detectar dispositivos móviles
lib/
  utils.ts              # Utilidad cn() para class merging
public/                 # Static assets
```

## Architecture

### Layout Structure

El layout usa `SidebarProvider` de shadcn/ui:
- `AppSidebar`: Navegación lateral con menús agrupados (Principal, Patrimonio, Catálogos, Reportes)
- `SidebarInset`: Área de contenido principal con header

### Navigation Structure

```
Principal:     Inicio, Buscar Bien
Patrimonio:    Bienes, Inventario, Altas, Bajas, Transferencias
Catálogos:     Categorías, Dependencias, Responsables
Reportes:      Reportes, Documentos
```

## Code Conventions

### Path Aliases

Use `@/` prefix for imports:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

### Styling

Use `cn()` for conditional class merging:
```typescript
cn("base-class", condition && "conditional-class")
```

### Idioma

- UI text and comments in Spanish
- Code (variables, functions) in English or descriptive Spanish
