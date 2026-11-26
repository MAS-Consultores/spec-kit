---
name: clean-code-php
description: Reglas de código limpio en PHP que PHPMD y jscpd no cubren solas. Medidas sobre el diff.
---

# clean-code-php

Reglas de lenguaje neutro, aplicadas a PHP. En cakephp2 y moodle3 informan. En moodle5 y en el back de laravel bloquean solo hallazgos nuevos respecto del baseline.

- El nombre dice el efecto. Un método que escribe no se llama `get`.
- Una función hace una sola cosa y cabe en una pantalla.
- Nada de números o strings mágicos: van a constantes o a configuración.
- Sin duplicación. jscpd mira los archivos del diff.
- El error se maneja explícitamente. No se traga una excepción vacía.
- No se deja código comentado ni muerto.

PHPMD usa `.specify/templates/phpmd.xml` (complejidad, tamaño, nombres, código sin uso) solo sobre los PHP del diff. El baseline vive en `.specify/clean-baseline.txt`.
