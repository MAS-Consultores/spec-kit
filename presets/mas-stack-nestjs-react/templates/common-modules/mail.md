# Módulo común: correo

Guía de esqueleto. No es código de negocio. Enviar correo es una capacidad transversal y MUST vivir en un módulo común.

Ruta sugerida: `apps/api/src/modules/mail/`.

## Qué concentra

- Plantillas `.mjml` compiladas con `mjml2html` y `validationLevel: 'strict'`.
- Interpolación con Handlebars y `{{ }}` (escapado). `{{{ }}}` solo con supresión justificada.
- El dominio pasa un nombre de plantilla y datos ya validados. No arma `<html`, `<table` ni `<body` en strings.
- El módulo común no decide reglas de negocio ni lee Prisma.

`index.ts` exporta el servicio de envío. Los módulos de negocio importan solo ese index.
