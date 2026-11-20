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

## Gráficos

| Uso | Librería | Estado |
| --- | --- | --- |
| Gráficos de la aplicación | Recharts | Aprobada. Es la única librería de gráficos |
| Sankey, y solo si el producto muestra un Sankey | `d3-sankey` | Aprobada en ese único caso |
| Heatmap | `<table>` accesible, sin librería | Aprobada |
| `chart.js`, `react-chartjs-2`, `echarts` y sus subrutas | — | Prohibidas (`no-restricted-imports`, error). `echarts` solo con `eslint-disable` justificado |

## Fechas y calendario

| Uso | Librería | Estado |
| --- | --- | --- |
| Aritmética de fechas y zonas | `date-fns` y `@date-fns/tz` | Aprobadas |
| Calendar de shadcn | `react-day-picker` | Aprobada |
| `moment`, `dayjs` y sus subrutas | — | Prohibidas |

`mas/no-manual-date-math` (warn) marca `getTime()` ± `86400000` (o `24 * 60 * 60 * 1000`) y `setDate(getDate() + n)`.

## Formularios

`react-hook-form` con `@hookform/resolvers/zod`. `mas/no-manual-form-errors` (error) marca un `useState` de error por campo.

## HTML

| Uso | Librería | Estado |
| --- | --- | --- |
| Sanitizar en el navegador | DOMPurify | Aprobada |
| Sanitizar en la API | `isomorphic-dompurify` o `sanitize-html` | Aprobadas |

`mas/no-regex-html-sanitize` (error) marca un `replace` que borra tags. `mas/no-dangerous-html-unsanitized` (error) solo admite `dangerouslySetInnerHTML` con el resultado de `.sanitize`.

## Imágenes y tipo real del archivo

| Uso | Librería | Estado |
| --- | --- | --- |
| Escalar, orientar y quitar metadatos | `sharp` | Aprobada. Ver el estándar de abajo |
| Tipo real por magic bytes | `file-type` | Aprobada |
| URL firmada de S3 | `@aws-sdk/s3-request-presigner` | Aprobada |
| Video | — | Solo peso y tipo real. No hay librería de duración |

Un video se limita por peso en la API, por ejemplo 100 MB con `limits.fileSize`, y el tipo real se comprueba con `file-type`. No se valida la duración en el servidor. No se usa `ffprobe` ni `fluent-ffmpeg`.

`mas/no-client-file-type-trust` (error) marca una decisión que solo mira `originalname` o `mimetype`. No repite `mas/multipart-upload-limits`: ese sigue pidiendo `limits.fileSize` y un validador; este solo mira el dato que manda el cliente. Si el archivo ya llama a `file-type`, el MIME puede quedar como pista.

### Estándar de imágenes con sharp

De entrada solo PNG y JPG. HEIC y WebP no se aceptan. El tipo lo decide `file-type` (magic bytes), no el `originalname` ni el `mimetype`. La salida sí puede ser JPEG o WebP.

Al subir, `sharp` MUST:

- llamar a `.rotate()` para aplicar la orientación EXIF
- no volver a escribir metadatos (sin `.withMetadata()`), así se quita el EXIF
- recortar al centro con `fit: 'cover'` y `position: 'centre'`
- generar las variantes fijas del tipo: avatar 128 px y 512 px, banner 1600×500, portada 16:9 de 1280×720
- no servir el original al navegador
- escribir JPEG o WebP con calidad fija `80` (`RASTER_OUTPUT_QUALITY` en `apps/api/src/images/normalize-image.ts`)

El test de subida MUST comprobar dimensiones, orientación y EXIF ausente. El de video MUST comprobar el límite de peso y el tipo real, no la duración. El esqueleto cubre el estándar en `normalize-image.spec.ts` con un JPEG de prueba cuya orientación EXIF es 6.

## Colas, cron y trabajos en background: pendiente de decisión (candidatos BullMQ+Redis o pg-boss sobre Postgres)

No hay mecanismo aprobado. BullMQ y `@nestjs/bullmq` no están en esta lista. `@nestjs/schedule`, `node-cron` y `agenda` tampoco están prohibidos mientras la decisión siga abierta.

`mas/no-timer-scheduling` (warn) marca `setInterval` en la API y `setTimeout` de 1000 ms o más. El plan MUST justificar el mecanismo elegido. Un `setTimeout` de menos de 1000 ms puede quedar para un timeout de protocolo.

## Correo

| Uso | Librería | Estado |
| --- | --- | --- |
| Plantilla de correo (el cliente usa Outlook) | `mjml`, versión estable, compilada con `mjml2html` y `validationLevel: 'strict'` | Aprobada |
| Interpolación | Handlebars con `{{ }}`, que escapa por defecto | Recomendada. Escapa HTML en clientes como Outlook sin armar el layout a mano. Otra elección MUST justificarse en el plan |
| `{{{ }}}` sin escape | — | Prohibido sin `eslint-disable` justificado |
| `react-email` y `@react-email/render` | — | No se usan |

`mas/no-handmade-email-html` (error) marca, en código de correo, un string o template con `<html`, `<table` o `<body`, y también el triple-stash `{{{`. Lo válido es una plantilla `.mjml` compilada con `mjml` / `mjml2html`. `pnpm lint` corre `scripts/check-mjml.mjs` en modo strict sobre `fixtures/email/`.

## IA y medios de la interfaz

| Uso | Librería | Estado |
| --- | --- | --- |
| Llamadas a un modelo | Vercel AI SDK, o el SDK oficial del proveedor, con la salida validada por zod | Aprobada |
| Transcripción | `@deepgram/sdk` | Aprobada |
| Confeti | `canvas-confetti` | Aprobada si respeta `prefers-reduced-motion` |
| Visor de imágenes | `yet-another-react-lightbox` | Aprobada |
| Visor PDF en el navegador | `react-pdf` | Aprobada solo como visor. Extraer texto sigue en `unpdf` |
| Soltar archivos | `react-dropzone` | Aprobada |
| Arrastrar y soltar | `@dnd-kit` | Aprobada |
| Cabeceras HTTP de la API | `helmet` | Aprobada. `apps/api/src/main.ts` la registra |
| Logs de la API | `nestjs-pino` | Aprobada. `no-console` está en error en `apps/api` |

`mas/no-direct-llm-fetch` (error) marca `fetch`, `axios` o `got` hacia `/chat/completions`, `/v1/messages`, `/completions` o `/embeddings`. `mas/no-secret-in-client` (error) marca un `VITE_*` con `KEY`, `SECRET` o `TOKEN` en `apps/web`. `mas/no-raw-process-env` (error) es el mismo contrato que `mas/no-process-env`: `process.env` solo en el módulo de config validado con zod. `mas/require-helmet` (error) exige `helmet()` en `main.ts`. `mas/require-throttle-sensitive` (error) exige `@Throttle` o `SensitiveThrottle` en auth, recuperación, IA y subidas. `mas/reduced-motion-animations` (error) exige `prefers-reduced-motion` en el confeti y en animaciones de gráficos. `mas/no-handmade-charts` (warn) marca un `<svg>` con coordenadas calculadas o `getContext('2d')`; un ícono con `d` literal puede quedar.

`socket.io`, `socket.io-client`, `ws` y sus subrutas están prohibidos (`no-restricted-imports`, error) salvo un requisito real con supresión justificada.

Toda supresión sigue el motivo existente: `// eslint-disable-next-line <regla> -- <motivo>`.
