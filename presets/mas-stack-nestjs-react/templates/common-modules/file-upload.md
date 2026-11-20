# Módulo común: subida de archivos e imágenes

Guía de esqueleto. No es código de negocio. Subir archivos o imágenes es una capacidad transversal y MUST vivir en un módulo común.

Ruta sugerida: `apps/api/src/modules/file-upload/`.

## Qué concentra

- `multipart/form-data` con `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor` o `AnyFilesInterceptor`, siempre con `limits.fileSize`.
- Tipo real con `file-type` (magic bytes). No alcanza `originalname` ni `mimetype`.
- Imágenes: solo PNG y JPG de entrada. `sharp` aplica `.rotate()`, quita EXIF, recorta al centro (`fit: 'cover'`, `position: 'centre'`) y escribe variantes fijas (avatar 128 y 512, banner 1600x500, cover 1280x720) en JPEG o WebP a calidad 80. El navegador no recibe el original. Se reutiliza `apps/api/src/images/normalize-image.ts`.
- El módulo de negocio recibe el archivo ya validado o las variantes. No abre Multer ni Prisma en el controller.

`index.ts` es la única entrada pública.
