# Módulo común: importación tabular

Guía de esqueleto. No es código de negocio. Una feature que importa archivos tabulares o un webservice con filas MUST vivir en un módulo común, no dentro del módulo del dominio que consume el resultado.

Ruta sugerida: `apps/api/src/modules/tabular-import/`.

## Pipeline

El módulo expone un solo pipeline, independiente de la fuente:

1. **Parse.** Archivo xlsx con `exceljs` (streaming). CSV con `csv-parse`. Un webservice entrega filas ya parseadas al mismo contrato. No se usa el paquete `xlsx` ni un parser a mano.
2. **Normalizar.** Nombres de columna, trim, tipos y zona horaria a un DTO común.
3. **Validar.** zod sobre cada fila. Los errores vuelven por fila, sin escribir todavía.
4. **Reconciliar.** El dominio inyecta una estrategia (alta, match, conflicto). El módulo común no conoce el modelo de negocio.
5. **Aplicar por lotes.** El repositorio del dominio escribe en transacciones acotadas. El módulo común no importa Prisma.

## Contrato

`index.ts` exporta `TabularImportService` y el tipo de fila normalizada. Los módulos de negocio importan solo ese index.
