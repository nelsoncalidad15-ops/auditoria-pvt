# Auditoría OR Postventa VW

Aplicación web para auditorías de postventa orientada a uso móvil, con persistencia en Firebase y sincronización opcional con Google Sheets mediante Apps Script.

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS 4
- Firebase Auth + Firestore
- Recharts para reportes

## Funcionalidades actuales

- Auditoría móvil optimizada por categoría
- Estructura configurable de categorías e ítems
- Ítems obligatorios y opcionales con validación al cierre
- Persistencia principal en Firestore
- Sincronización opcional con Google Sheets mediante Apps Script

## Requisitos

- Node.js 20 o superior
- Proyecto Firebase configurado
- Endpoint publicado de Google Apps Script si querés enviar auditorías a Sheets
- URL pública CSV de Google Sheets si querés sincronizar historial desde Sheets

## Variables de entorno

Copiá [.env.example](.env.example) a `.env.local` y completá lo necesario.

- `VITE_APP_TITLE`: nombre visible de la aplicación
- `VITE_APPS_SCRIPT_URL`: endpoint `exec` de Apps Script para alta de auditorías
- `VITE_SHEET_CSV_URL`: URL pública CSV del Google Sheet para sincronización de datos

## Arquitectura recomendada de datos

- Firestore como base principal y fuente de verdad
- Google Sheets como espejo operativo y soporte de reportes

### Firestore

Colección principal: `audits`

Campos recomendados por documento:

- `id`
- `date`
- `auditorId`
- `location`
- `staffName`
- `role`
- `items`
- `totalScore`
- `notes`
- `createdAt`
- `userEmail`

Cada ítem dentro de `items` guarda:

- `id`
- `question`
- `category`
- `status`
- `comment`

### Google Sheets

Usar dos pestañas:

- `Auditorias`: una fila por auditoría
- `AuditoriaItems`: una fila por respuesta auditada

La app ya envía un payload estable para este modelo y el Apps Script listo quedó en [apps-script/Code.gs](apps-script/Code.gs).

La guía operativa de alta quedó en [apps-script/README.md](apps-script/README.md).

## Desarrollo local

1. Instalá dependencias con `npm install`
2. Configurá `.env.local`
3. Ejecutá `npm run dev`
4. Abrí `http://localhost:3000`

La estructura de auditoría se administra desde la pantalla de Reportes.

## Scripts

- `npm run dev`: servidor local
- `npm run typecheck`: validación TypeScript
- `npm run build`: build de producción
- `npm run preview`: previsualización local de la build

## Alta técnica

Antes de publicar, verificá:

1. [firebase-applet-config.json](firebase-applet-config.json) apunta al proyecto Firebase correcto.
2. [firestore.rules](firestore.rules) están desplegadas y alineadas con los usuarios reales.
3. Las URLs de Apps Script y CSV público están configuradas por entorno o desde la pantalla de Reportes.
4. El login de Google está habilitado en Firebase Authentication.
5. Existe una colección `audits` en Firestore con permisos válidos para lectura/escritura.
6. Si usás Sheets, publicaste el Apps Script como aplicación web y cargaste su URL `exec`.

## Estado actual

- `npm run typecheck`: OK
- `npm run build`: OK
- La build usa división manual de chunks para mejorar la entrega inicial
