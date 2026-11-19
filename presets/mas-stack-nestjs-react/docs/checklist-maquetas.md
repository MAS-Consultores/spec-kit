# Checklist de maquetas para producto

El equipo de producto entrega el diseño. El andamiaje del prototipo no se porta. El diseño del shell sí.

## Separar andamiaje y diseño del shell

No forma parte del diseño y no se porta:

- Tailwind por CDN y el `<script>` que lo carga
- jQuery, el `<script>` CDN de Font Awesome u otra librería de íconos, y otros scripts de prototipo
- sim-bar y controles que solo existen para navegar el HTML

Sí forma parte del diseño y se porta, aunque `handoff.md` diga que el shell no se toca:

- header
- riel y menú, incluidos anchos, gradiente y estados contraído y móvil
- colores, tipografía, radios, sombras y espaciados del shell
- íconos: la misma librería y los mismos glifos (`fa-solid fa-gauge`, Material Symbols, Lucide). Se instalan por npm, con imports por ícono, en `apps/web/src/icons`. `lucide-react` solo si la maqueta no define librería. El color se compara computado, también en hover y activo, no leyendo variables de `:root`

## Nombres

- El CSS del prototipo se llama `styles-prototype.css` (no `styles-laravel.css` ni el nombre de otro framework)
- Los tokens van en CSS y también en `tokens.json` (colores, fuentes, pesos, radios, sombras, espaciados, breakpoints)
- Los elementos del shell y los logos llevan `data-testid` estable (`app-header`, `app-rail`, `app-rail-collapsed`, `brand-logo`)

## Qué copiar

- Logos, SVG, ilustraciones y favicon, con la ruta de origen
- Fuentes autoalojadas, los mismos pesos que usa la maqueta
- `@keyframes`, transiciones y easing, con `prefers-reduced-motion`

No copiar fotos ni avatares de demostración. El logo no se reemplaza por texto.
