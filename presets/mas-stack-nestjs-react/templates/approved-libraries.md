# Librerías aprobadas para formatos estándar

Este archivo viaja con el preset. `specify init --stack nestjs-react` copia el directorio del preset a `.specify/presets/mas-stack-nestjs-react/`, así que la copia del proyecto queda en:

`.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`

No se escribe un parser ni un lector a mano para un formato estándar. Si esta lista no nombra una librería, el plan la consulta o la justifica. No se inventa una aprobación.

Una excepción en código lleva `// eslint-disable-next-line mas/no-handrolled-format-parsers -- <motivo>`. `mas/require-disable-justification` exige el motivo.

## Excel / xlsx

| Uso | Librería | Estado |
| --- | --- | --- |
| Leer xlsx en streaming y escribir xlsx | `exceljs` | Aprobada |
| Leer o escribir xlsx | `xlsx` (SheetJS) | Prohibida. Congelada en npm y con CVE conocidos. `pnpm lint` falla el import o `require` de `xlsx` y de `xlsx/*` (`mas/no-handrolled-format-parsers` y `no-restricted-imports`). Un `package.json` o el lockfile que declare `xlsx` falla `scripts/check-prerelease.mjs` |
| Importar xlsx | `typed-xlsx` | Descartada para importar: solo escribe |

## CSV

| Uso | Librería | Estado |
| --- | --- | --- |
| Leer CSV | `csv-parse` | Aprobada |
| Partir líneas de un archivo subido con `.split(',')` o `.split(';')` | — | Prohibido (`mas/no-handrolled-format-parsers`) |

## Subida de archivos

| Uso | Librería | Estado |
| --- | --- | --- |
| Recibir el archivo | Multer con `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor` o `AnyFilesInterceptor` | Aprobada, con las reglas de **Subida de archivos**: `limits.fileSize` y validación de tipo |

Esas reglas siguen siendo `mas/multipart-upload-limits`, `mas/no-base64-file-upload` y `mas/base64-upload-max-length`.

## ZIP

No hay librería aprobada para leer o escribir ZIP.

`node:zlib` / `zlib` con `inflate`, `inflateRaw`, `unzip`, `gunzip` y sus variantes sync o stream es un lector casero y falla `mas/no-handrolled-format-parsers` en el código de la app. Comprimir con `gzip` no es leer un ZIP y no dispara la regla.

El plan MUST consultar o justificar la librería elegida. No se inventa una aprobación y no se escribe el parser a mano.

## XML

No hay librería aprobada para leer o escribir XML.

Una expresión regular sobre `<row`, `<c`, `<sheetData` o `sheet1.xml` es un parser casero y falla `mas/no-handrolled-format-parsers`.

El plan MUST consultar o justificar la librería elegida. No se inventa una aprobación y no se escribe el parser a mano.

## PDF

| Uso | Librería | Estado |
| --- | --- | --- |
| Generar un PDF desde HTML o plantillas (certificados, reportes), reutilizando componentes y estilos | Playwright / Chromium `page.pdf()` | Aprobada |
| Armar o modificar un PDF: unir, formularios, estampar | `pdf-lib` | Aprobada |
| Extraer texto | `unpdf` (sobre pdfjs-dist) | Aprobada |
| Parser o generador de PDF escrito a mano | — | Prohibido |

Queda prohibido emitir un literal `%PDF-` o armar a mano una tabla xref (`xref`, `trailer`, `startxref`, `obj` / `endobj`) en código de la app. Eso falla `mas/no-handrolled-format-parsers`. La misma supresión justificada vale cuando el plan documenta el motivo.
