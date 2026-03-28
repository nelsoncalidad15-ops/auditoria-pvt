# Apps Script para Google Sheets

Este script recibe la auditoría desde la app y la escribe en dos hojas:

- Auditorias: una fila por auditoría
- AuditoriaItems: una fila por ítem auditado

## Pasos

1. Crear un Google Sheet nuevo o usar uno existente.
2. Abrir Extensiones > Apps Script.
3. Pegar el contenido de [Code.gs](Code.gs).
4. En Configuración del proyecto > Propiedades del script, crear `SPREADSHEET_ID` con el ID del Google Sheet.
5. Implementar como aplicación web:
   - Ejecutar como: tu usuario
   - Quién tiene acceso: Cualquiera con el enlace
6. Copiar la URL terminada en `exec`.
7. Pegar esa URL en la app, dentro de Reportes > Configuración de integraciones.

## Hojas esperadas

El script crea automáticamente estas pestañas si no existen:

- `Auditorias`
- `AuditoriaItems`

## Columnas de Auditorias

- `auditId`
- `submittedAt`
- `auditDate`
- `location`
- `auditorId`
- `auditorName`
- `role`
- `staffName`
- `totalScore`
- `passCount`
- `failCount`
- `naCount`
- `answeredCount`
- `itemsCount`
- `notes`
- `submittedByEmail`

## Columnas de AuditoriaItems

- `auditId`
- `submittedAt`
- `auditDate`
- `location`
- `auditorName`
- `role`
- `staffName`
- `questionIndex`
- `question`
- `status`
- `statusLabel`
- `comment`