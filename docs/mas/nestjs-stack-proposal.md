# Propuesta de Stack NestJS + React para MAS

## Resumen Ejecutivo

Esta propuesta introduce el stack `nestjs-react` como nueva opción aprobada para
proyectos MAS. El stack implementa una arquitectura de monorepo con API backend
desacoplada y frontend SPA, ofreciendo una alternativa moderna basada en
TypeScript para casos de uso donde se requiere una API independiente.

## Identificador Canónico

**ID**: `nestjs-react`  
**Display Name**: NestJS + React (API + SPA)  
**Preset**: `mas-stack-nestjs-react`

### Justificación del ID

Se eligió `nestjs-react` sobre alternativas como `nestjs-prisma-react` o
`nestjs-prisma-postgres` porque:

1. **Claridad**: Identifica los dos frameworks principales visibles al
   desarrollador (NestJS para API, React para frontend)
2. **Consistencia**: Sigue el patrón de `laravel-inertia-react` que nombra
   framework-bridge-frontend
3. **Flexibilidad**: Prisma y PostgreSQL son decisiones de implementación que
   podrían cambiar; NestJS y React son las fronteras arquitectónicas fijas

## Arquitectura Decidida

### Estructura de Monorepo Modular

```
proyecto/
├── apps/
│   ├── api/                    # NestJS + TypeScript + Prisma + PostgreSQL
│   │   ├── src/
│   │   │   ├── modules/        # Un módulo por bounded context
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── __tests__/
│   │   │   │   │   └── index.ts      # Barrel: exports públicos
│   │   │   │   └── products/
│   │   │   │       └── ...
│   │   │   └── common/         # Módulos de infraestructura (delgados)
│   │   │       ├── prisma/
│   │   │       ├── config/
│   │   │       └── auth/
│   │   └── prisma/
│   │       ├── schema.prisma   # O schema/ para multi-file
│   │       └── migrations/
│   └── web/                    # React + TypeScript + Vite
│       └── src/
│           ├── features/       # Una feature por dominio
│           │   ├── users/
│           │   │   ├── components/
│           │   │   ├── hooks/
│           │   │   ├── api/
│           │   │   ├── routes/
│           │   │   ├── __tests__/
│           │   │   └── index.ts  # Barrel: exports públicos
│           │   └── products/
│           │       └── ...
│           ├── shared/         # UI compartida
│           └── app/            # Router con lazy-loading
├── packages/
│   └── contracts/              # ÚNICO acoplamiento entre api y web
│       ├── types/
│       └── generated/          # Cliente OpenAPI generado
├── package.json                # Configuración de workspaces
├── turbo.json                  # Opcional: Turborepo
└── .eslintrc.js                # Con eslint-plugin-boundaries
```

### Stack Tecnológico Fijo

| Componente | Decisión | Justificación |
|------------|----------|---------------|
| **Runtime** | Node.js LTS | Soporte a largo plazo, estabilidad |
| **Package Manager** | pnpm | Workspaces, frozen-lockfile, workspace protocol |
| **Framework Backend** | NestJS (última estable) | DI estructurada, modular, TypeScript-first |
| **ORM** | Prisma | Type-safe, migraciones explícitas, excelente DX |
| **Base de Datos** | PostgreSQL | Robustez, features avanzados, estándar empresarial |
| **Validación** | Zod v4.2+ (única) | Unificado en API, MCP y React; no class-validator |
| **DTOs REST** | nestjs-zod | `createZodDto()` + `ZodValidationPipe` + OpenAPI |
| **API Style** | REST + OpenAPI obligatorio | `@nestjs/swagger` + nestjs-zod integration |
| **MCP** | @nestjs/mcp (oficial) | Tools per domain module, OAuth 2.1, Zod schemas |
| **HTTP Adapter** | Express | Ecosistema de middleware, compatibilidad |
| **Framework Frontend** | React + TypeScript | Ecosistema maduro, tipado estricto |
| **Bundler Frontend** | Vite | Builds rápidos, HMR, configuración mínima |
| **Router** | TanStack Router | Type-safe routes, file-based, lazy loading |
| **Server State** | TanStack Query | Cache, mutations, query hooks per feature |
| **Global State** | Zustand (solo UI) | Theme, modals, sidebar; NO server data |
| **Forms** | React Hook Form + zodResolver | Schemas de packages/contracts |
| **Styling** | Tailwind CSS + shadcn/ui | Paridad con laravel-inertia-react |
| **Testing API** | Jest + supertest + MCP test client | Unit, e2e, MCP tools |
| **Testing Web** | Vitest + Testing Library + Playwright | Unit/component + E2E |

### Autenticación y Seguridad

**Decisión**: HttpOnly cookies + CSRF protection (NO JWT en localStorage)

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| **Tokens de sesión** | HttpOnly cookies | Inmunes a XSS, no accesibles desde JS |
| **Protección CSRF** | Token en cookie/header | Previene ataques cross-site |
| **CORS** | Allowlist explícita | Solo orígenes autorizados |
| **Refresh tokens** | En cookies seguras | Rotación sin exponer a frontend |

### Autorización: @nestjs/authorization + CASL

**Decisión**: RBAC/ABAC granular con permisos `resource:action`, condiciones a nivel de registro, y restricciones a nivel de campo.

| Componente | Decisión | Propósito |
|------------|----------|-----------|
| **Enforcement** | `@nestjs/authorization` + `@Can()` | Punto de aplicación en REST y MCP; deny-by-default |
| **Permission Engine** | CASL (`@casl/ability`) | Definición y evaluación de abilities |
| **Record Filtering** | `@casl/prisma` `accessibleBy()` | Filtrar queries por condiciones del usuario |
| **Frontend UI** | `@casl/react` | Visibilidad UI; API siempre enforce |

#### Granularidad de Permisos

| Nivel | Ejemplo | Implementación |
|-------|---------|----------------|
| **Acción** | `article:read`, `user:update` | Código verifica permisos, NUNCA nombres de roles |
| **Registro** | `{ tenantId: user.tenantId }`, `{ status: 'draft' }` | Condiciones JSON en tabla `Permission`; `accessibleBy()` |
| **Campo** | `can('read', 'User', ['email', 'name'])` | JSON `fields` en permiso; filtrado en serialización/DTO |

#### Esquema de Permisos (PostgreSQL/Prisma)

```prisma
model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  permissions RolePermission[]
  users       UserRole[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model Permission {
  id         String           @id @default(uuid())
  resource   String           // e.g., "article", "user"
  action     String           // e.g., "read", "update", "delete"
  conditions Json?            // e.g., { "tenantId": "${user.tenantId}" }
  fields     Json?            // e.g., ["email", "name"] for field-level
  roles      RolePermission[]
  users      UserPermission[]
  createdAt  DateTime         @default(now())
  @@unique([resource, action])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}

model UserPermission {
  userId       String
  permissionId String
  user         User       @relation(fields: [userId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([userId, permissionId])
}
```

#### Uso en Código

```typescript
// Controller con @Can()
@Controller('articles')
export class ArticlesController {
  @Get()
  @Can('article:read')
  async findAll(@CurrentUser() user: User) {
    return this.articlesService.findAccessible(user);
  }

  @Patch(':id')
  @Can('article:update')
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() user: User) {
    return this.articlesService.update(id, dto, user);
  }
}

// Service con accessibleBy()
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService, private casl: CaslAbilityFactory) {}

  async findAccessible(user: User) {
    const ability = await this.casl.createForUser(user);
    return this.prisma.article.findMany({
      where: accessibleBy(ability, 'article', 'read').Article,
    });
  }
}

// MCP Tool con @Can()
@Tool({
  name: 'get_articles',
  description: 'List articles accessible to user',
  parameters: z.object({}),
})
@Can('article:read')
async getArticles(@CurrentUser() user: User) {
  return this.articlesService.findAccessible(user);
}
```

#### Anti-patrones de Autorización

- ❌ `if (user.role === 'admin')` — verificar roles en código
- ❌ Autorizar solo en UI con `@casl/react`
- ❌ Queries de lista sin `accessibleBy()` filtering
- ❌ Retornar campos restringidos sin filtrar
- ❌ Aceptar updates de campos que el usuario no puede modificar
- ❌ Hardcodear permisos en código
- ❌ Omitir audit logging de cambios de permisos

### Contraste con Laravel + Inertia + React

| Aspecto | Laravel + Inertia + React | NestJS + React |
|---------|---------------------------|----------------|
| **Arquitectura** | Monolito server-rendered | API + SPA desacoplados |
| **Flujo de datos** | Controller → Inertia props → React | API → HTTP → React client |
| **Despliegue** | Una unidad | Independiente API y frontend |
| **Caso de uso** | Admin panels, herramientas internas | APIs multi-cliente, escalado independiente |
| **SSR** | Sí (via Inertia) | No (SPA puro) |

## Decisiones Tomadas (Removidas de Decisiones Abiertas)

Las siguientes decisiones fueron tomadas por MAS y están reflejadas en el stack:

1. **ID Canónico**: `nestjs-react`
2. **Package Manager**: pnpm (NO npm, NO yarn)
3. **ORM**: Prisma (no TypeORM, MikroORM, ni Drizzle)
4. **Base de Datos**: PostgreSQL
5. **Frontend**: React + Vite (no Next.js, no SSR)
6. **HTTP Adapter**: Express (no Fastify)
7. **Autenticación**: HttpOnly cookies + CSRF (no JWT en localStorage)
8. **Validación**: Zod v4.2+ unificado (NO class-validator/class-transformer)
9. **DTOs REST**: nestjs-zod (`createZodDto()` + `ZodValidationPipe`)
10. **API Documentation**: REST + OpenAPI obligatorio via `@nestjs/swagger` + nestjs-zod
11. **MCP**: `@nestjs/mcp` oficial (NO `@rekog/mcp-nest`)
12. **Router Frontend**: TanStack Router (type-safe, file-based)
13. **Server State**: TanStack Query (NO server data en Zustand)
14. **Global State**: Zustand solo para UI state
15. **Forms**: React Hook Form + zodResolver
16. **Styling**: Tailwind CSS + shadcn/ui
17. **Testing API**: Jest + supertest + MCP test client
18. **Testing Web**: Vitest + Testing Library + Playwright
19. **Estructura**: Monorepo modular con `apps/api`, `apps/web`, `packages/contracts`, `packages/ui`

## Package Manager: pnpm

### Decisión

**pnpm** es el gestor de paquetes exclusivo para el monorepo. NO usar npm ni yarn.

### Configuración Requerida

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json (root)
{
  "packageManager": "pnpm@9.x.x",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  }
}
```

### Workspace Protocol

Paquetes internos se referencian con protocolo workspace:

```json
// apps/api/package.json
{
  "dependencies": {
    "@project/contracts": "workspace:*"
  }
}

// apps/web/package.json
{
  "dependencies": {
    "@project/contracts": "workspace:*",
    "@project/ui": "workspace:*"
  }
}
```

### CI con pnpm

```yaml
# GitHub Actions ejemplo
- uses: pnpm/action-setup@v4
  with:
    version: 9
- run: pnpm install --frozen-lockfile
- run: pnpm -r build
- run: pnpm -r test
- run: pnpm audit
```

### Comandos Comunes

| Comando | Propósito |
|---------|-----------|
| `pnpm install --frozen-lockfile` | CI install (lockfile estricto) |
| `pnpm -r <script>` | Ejecutar script en todos los workspaces |
| `pnpm --filter <app> <script>` | Ejecutar script en workspace específico |
| `pnpm add -w <pkg>` | Añadir dependencia al root |
| `pnpm add --filter <app> <pkg>` | Añadir dependencia a workspace |
| `pnpm audit` | Auditoría de seguridad |

### Anti-patrones pnpm

- ❌ Commitear `package-lock.json` o `yarn.lock`
- ❌ Usar `npm install` o `yarn install`
- ❌ Usar `^` o `~` para dependencias internas (usar `workspace:*`)
- ❌ Usar `npm audit` o `yarn audit`

## Validación Unificada: Zod Everywhere

### Decisión

**Zod v4.2+** es la ÚNICA librería de validación en todo el stack. NO se usa class-validator ni class-transformer.

### Implementación

| Capa | Herramienta | Uso |
|------|-------------|-----|
| **REST DTOs** | `nestjs-zod` | `createZodDto(schema)` + `ZodValidationPipe` global |
| **MCP Tools** | Zod directo | Schemas para inputs de herramientas |
| **React Forms** | `zodResolver` | React Hook Form + schemas de `packages/contracts` |
| **OpenAPI** | `nestjs-zod` | Generación automática desde Zod schemas |

### Configuración

```typescript
// Zod schema (packages/contracts)
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
}).strict(); // Reject unknown keys

// API DTO (apps/api)
import { createZodDto } from 'nestjs-zod';
export class CreateUserDto extends createZodDto(createUserSchema) {}

// React Form (apps/web)
import { zodResolver } from '@hookform/resolvers/zod';
const form = useForm({ resolver: zodResolver(createUserSchema) });
```

## REST API con OpenAPI Obligatorio

### Requisitos

1. **Documentación completa**: Cada endpoint debe tener:
   - `@ApiTags('domain')` - Agrupación por dominio
   - `@ApiOperation({ summary, description })` - Descripción
   - `@ApiResponse({ status, type })` - Respuestas documentadas (200, 400, 401, 403, 404, 422)
   - `@ApiCookieAuth()` o `@ApiBearerAuth()` - Autenticación declarada

2. **Versionado URI**: `/api/v1/...`

3. **Errores RFC 9457**: Problem Details format para todos los errores

4. **Paginación estándar**: Schema documentado para endpoints de lista

5. **OpenAPI en CI**:
   - Export `openapi.json` versionado en el repo
   - `openapi-diff` detecta breaking changes
   - Generación de cliente tipado (orval, @hey-api/openapi-ts)

6. **Swagger UI**: `/docs` solo fuera de producción o detrás de auth

## MCP Support (`@nestjs/mcp`)

### Decisión

Usar el paquete OFICIAL `@nestjs/mcp` de NestJS. NO usar `@rekog/mcp-nest` (community).

### Instalación

```bash
pnpm add @nestjs/mcp @modelcontextprotocol/server zod
```

### Arquitectura

```typescript
// app.module.ts
@Module({
  imports: [
    McpModule.forRoot({
      name: 'my-api',
      version: '1.0.0',
      instructions: 'API tools for domain operations',
    }),
    // ... domain modules
  ],
})
export class AppModule {}

// modules/users/users.mcp.ts (per-domain MCP tools)
@Injectable()
export class UsersMcpTools {
  constructor(private usersService: UsersService) {} // Reuse domain service

  @Tool({
    name: 'get_user',
    description: 'Get user by ID',
    parameters: z.object({ id: z.string().uuid() }),
  })
  async getUser({ id }: { id: string }) {
    return this.usersService.findById(id); // Call service, NOT Prisma directly
  }
}
```

### Seguridad MCP

- Endpoint `/mcp` autenticado como OAuth 2.1 resource server
- Mismos guards y policies que REST
- Tools destructivos requieren autorización explícita y descripciones claras
- Rate limiting en invocaciones
- Audit logging de todas las llamadas
- No secrets ni data excesiva en outputs
- Inputs tratados como untrusted (prompt-injection awareness)

### Testing MCP

```typescript
import { McpTestClient } from '@nestjs/mcp/testing';

describe('UsersMcpTools', () => {
  let client: McpTestClient;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({ ... }).compile();
    client = module.get(McpTestClient);
  });

  it('should get user', async () => {
    const result = await client.callTool('get_user', { id: 'uuid' });
    expect(result).toMatchObject({ id: 'uuid', name: 'Test' });
  });
});
```

## Frontend Technology Stack

### TanStack Router

- Type-safe routes y search params
- File-based routing per feature
- Lazy loading integrado
- Integración con TanStack Query loaders

### TanStack Query

- Cache, revalidation, mutations
- Query keys organizados per feature
- Hooks wrapping el cliente OpenAPI generado

### Zustand

- SOLO para UI state (theme, sidebar, modals)
- NO server data — usar TanStack Query
- React Context solo para dependency injection

### React Hook Form + Zod

- `zodResolver` con schemas de `packages/contracts`
- Validación compartida entre API y frontend

### Tailwind CSS + shadcn/ui

- Paridad con el stack laravel-inertia-react
- Componentes en `packages/ui` o `src/shared/ui/`

## Recursos de Referencia

### Documentación Oficial

- [NestJS Documentation](https://docs.nestjs.com/) - Framework principal
- [NestJS Security](https://docs.nestjs.com/security/authentication) - Autenticación y autorización
- [@nestjs/mcp](https://docs.nestjs.com/recipes/mcp) - MCP oficial
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) - Zod integration para DTOs y OpenAPI
- [Prisma Documentation](https://www.prisma.io/docs/) - ORM y migraciones
- [React Documentation](https://react.dev/) - Frontend framework
- [TanStack Router](https://tanstack.com/router/latest) - Type-safe routing
- [TanStack Query](https://tanstack.com/query/latest) - Server state management
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [Vite Documentation](https://vitejs.dev/) - Bundler frontend

### Guías de Seguridad

- [OWASP Node.js Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)

### Best Practices Consultadas

- [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills) - Prácticas NestJS para agentes AI (consultado; sin licencia declarada, contenido adaptado en palabras propias)

### Repositorios de Referencia (MIT Licensed)

- [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) - Mejores prácticas Node.js
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) - Reglas NestJS para agentes
- [2muchcoffeecom/nestjs-manifesto](https://github.com/2muchcoffeecom/nestjs-manifesto) - Convenciones NestJS

### Skills de Agente

El stack incluye skills externos de:

- **vercel-labs/agent-skills**: `vercel-react-best-practices` (React)
- **HoangNguyen0403/agent-skills-standard**: `nestjs-architecture`, `nestjs-security` (NestJS)

## Reglas de Seguridad Implementadas

### API (`apps/api`)

1. **Guard Global**: `AuthGuard` deny-by-default, rutas públicas con `@Public()`
2. **Autenticación**: Cookies HttpOnly, Secure, SameSite=Lax
3. **CSRF**: Token obligatorio en requests mutantes
4. **Validación**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
5. **Prisma**: Solo `$queryRaw` tagged templates, nunca `$queryRawUnsafe` con interpolación
6. **Respuestas**: DTOs con `select`/`omit` para evitar filtrar campos sensibles
7. **Migraciones**: `prisma migrate deploy` obligatorio, `db push` solo en local
8. **Passwords**: Argon2id obligatorio
9. **Rate Limiting**: `@nestjs/throttler` en login, reset, endpoints sensibles
10. **Headers**: Helmet habilitado
11. **CORS**: Allowlist explícita, nunca `origin: '*'` con credentials
12. **Uploads**: Validación MIME server-side, límites de tamaño, sin ejecutables
13. **Errores**: Exception filter global, sin stack traces en producción

### Frontend (`apps/web`)

1. **Tokens**: Nunca en localStorage, solo HttpOnly cookies
2. **CSRF**: Token incluido en todos los requests mutantes
3. **XSS**: Nunca `dangerouslySetInnerHTML` sin DOMPurify
4. **API Client**: Generado desde OpenAPI, nunca endpoints hardcodeados
5. **CSP**: Headers configurados para mitigar XSS

## Archivos de Memoria Generados

Al ejecutar `specify init --stack nestjs-react`, se generan:

### `.specify/memory/stack.md`

Contiene:
- ID canónico y display name
- Propósito del stack
- Fronteras fijas (monorepo, NestJS, Prisma, PostgreSQL, React)
- Casos de uso apropiados e inapropiados
- Contraste con Laravel + Inertia + React
- Validación de planes

### `.specify/memory/security-guidelines.md`

Contiene:
- Perfil de seguridad del stack
- Controles de seguridad para API (14 controles)
- Controles de seguridad para Frontend (5 controles)
- Superficies de datos sensibles
- Errores de seguridad comunes (pitfalls)
- Evidencia de seguridad requerida en planes

### `.specify/memory/stack-context.md`

Contiene:
- Restricciones core (monorepo, TypeScript strict, etc.)
- Riesgos típicos
- Anti-patrones
- Artefactos esperados (por app)
- Prácticas preferidas
- Checks de validación de planes
- Forma típica del proyecto

## Decisiones Abiertas para Discusión Futura

Las siguientes decisiones pueden reconsiderarse en futuras iteraciones:

1. **Monorepo Tool**: ¿Turborepo, Nx, o workspaces nativos?
2. **State Management**: ¿TanStack Query, Zustand, o alternativas?
3. **Queues/Background Jobs**: ¿BullMQ, Agenda, o alternativas?
4. **File Storage**: ¿S3, local, o abstracción?
5. **Observability**: ¿Pino, Winston, OpenTelemetry?
6. **Email**: ¿Nodemailer, SendGrid, Resend?
7. **Versión de NestJS**: Actualmente "última estable", ¿fijar versión específica?
8. **Fuente de Skills**: ¿HoangNguyen0403/agent-skills-standard o crear mas-nestjs en MAS-Consultores/mas-skills?

## Validación de la Propuesta

### Tests Incluidos

- `test_mas_stack_nestjs_react_metadata`: Verifica metadatos del stack
- `test_init_with_nestjs_react_stack_writes_memory_files`: Verifica generación de archivos
- `test_nestjs_react_stack_contrasts_with_laravel`: Verifica contraste con Laravel
- `test_resolve_stack_external_skills_nestjs_react`: Verifica skills externos

### E2E Validado

- `specify init <dir> --stack nestjs-react` genera correctamente:
  - `.specify/memory/stack.md` con contenido NestJS
  - `.specify/memory/security-guidelines.md` con controles API y Frontend
  - `.specify/memory/stack-context.md` con estructura monorepo
  - Preset `mas-stack-nestjs-react` instalado

## Verificación de Modularidad

El stack `nestjs-react` implementa una arquitectura modular explícita. A continuación
se documenta cómo cada regla de modularidad se mapea al contenido del stack:

### Reglas de Modularidad API (`apps/api`)

| Regla | Ubicación en Stack |
|-------|-------------------|
| Un módulo NestJS por bounded context | `core_constraints`: "One NestJS feature module per bounded context or domain: `src/modules/<domain>/`" |
| Estructura de módulo completa | `likely_project_shape`: controller, service, DTOs, repository, tests, index.ts por módulo |
| Exportaciones explícitas via barrel | `core_constraints`: "Modules expose only what they explicitly export via `@Module({ exports })` and barrel `index.ts`" |
| Prohibición de imports internos | `anti_patterns`: "Do not import another module's internal files; use only the module's public exports" |
| Comunicación cross-module via servicios/eventos | `core_constraints`: "cross-module communication uses exported services or the event system (`@nestjs/event-emitter`)" |
| forwardRef prohibido | `anti_patterns`: "Do not use `forwardRef()` to resolve circular dependencies; refactor to events" |
| Módulos de infraestructura delgados | `core_constraints`: "Shared infrastructure modules must remain thin: provide cross-cutting services, not domain logic" |
| Schema Prisma separable por dominio | `core_constraints`: "Prisma schema can be split per domain using `prismaSchemaFolder`" |
| No queries cross-domain directas | `anti_patterns`: "Do not query another domain's Prisma models directly; call the owning module's service" |

### Reglas de Modularidad Frontend (`apps/web`)

| Regla | Ubicación en Stack |
|-------|-------------------|
| Estructura feature-based | `core_constraints`: "Feature-based directory structure: `src/features/<domain>/`" |
| Estructura de feature completa | `likely_project_shape`: components, hooks, api, routes, tests, index.ts por feature |
| Barrel público por feature | `core_constraints`: "Each feature exposes a public surface via `index.ts` barrel" |
| Prohibición de imports cross-feature | `anti_patterns`: "Do not create cross-feature imports; features expose public APIs only" |
| UI compartida en shared/packages | `core_constraints`: "Shared UI primitives live in `src/shared/` or `packages/ui`" |
| Rutas lazy-loaded | `core_constraints`: "Routes are lazy-loaded per feature using `React.lazy()`" |
| Anti-pattern: eager loading | `anti_patterns`: "Do not skip lazy-loading for feature routes" |

### Reglas de Modularidad Monorepo

| Regla | Ubicación en Stack |
|-------|-------------------|
| packages/contracts como único acoplamiento | `core_constraints`: "Shared types and contracts live in `packages/contracts`; this is the ONLY coupling between API and Web" |
| Enforcement via ESLint | `core_constraints`: "Use `eslint-plugin-boundaries`, `@nx/enforce-module-boundaries`, or `dependency-cruiser`" |
| Detección de ciclos en CI | `expected_artifacts`: "CI step running `madge --circular` or `dependency-cruiser`" |

### Validación de Plan para Modularidad

| Check | Ubicación en Stack |
|-------|-------------------|
| Módulo dedicado por feature API | `plan_validation_checks`: "confirm it is a dedicated NestJS module under `src/modules/<domain>/`" |
| Documentar exports y dependencias | `plan_validation_checks`: "document its public exports and its dependencies" |
| Rechazar imports internos | `plan_validation_checks`: "Reject direct imports of another module's internal files" |
| Rechazar forwardRef | `plan_validation_checks`: "Reject `forwardRef()` usage" |
| Feature dedicado en frontend | `plan_validation_checks`: "confirm it is under `src/features/<domain>/`" |
| Rechazar imports cross-feature | `plan_validation_checks`: "confirm no deep imports from other features" |
| Confirmar lazy-loading | `plan_validation_checks`: "Confirm feature routes are lazy-loaded" |
| Validar acoplamiento via contracts | `plan_validation_checks`: "Confirm `packages/contracts` is the only coupling between API and Web" |
| Requerir boundary rules | `plan_validation_checks`: "Require ESLint boundary rules or dependency-cruiser config" |

### Herramientas de Enforcement Sugeridas

| Herramienta | Propósito | Configuración |
|-------------|-----------|---------------|
| `eslint-plugin-boundaries` | Reglas de import entre zonas | Definir zones para modules/, features/, shared/, packages/ |
| `@nx/enforce-module-boundaries` | Si se usa Nx, reglas de dependencia | Tags en project.json, constraints en nx.json |
| `dependency-cruiser` | Análisis de dependencias configurable | .dependency-cruiser.js con reglas allow/forbid |
| `madge --circular` | Detección de ciclos | Comando en CI: `madge --circular src/` |

### Ejemplo de Configuración eslint-plugin-boundaries

```javascript
// .eslintrc.js (ejemplo)
module.exports = {
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'modules', pattern: 'src/modules/*' },
      { type: 'common', pattern: 'src/common/*' },
      { type: 'features', pattern: 'src/features/*' },
      { type: 'shared', pattern: 'src/shared/*' },
    ],
  },
  rules: {
    'boundaries/element-types': [2, {
      default: 'disallow',
      rules: [
        { from: 'modules', allow: ['common', 'modules'] },
        { from: 'features', allow: ['shared', 'features'] },
      ],
    }],
    'boundaries/entry-point': [2, {
      default: 'disallow',
      rules: [
        { target: ['modules', 'features'], allow: 'index.ts' },
      ],
    }],
  },
};
```

## Prácticas NestJS Incorporadas

Se consultó el repositorio [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills)
como referencia de buenas prácticas NestJS para agentes AI. **Nota: El repositorio no tiene
licencia declarada, por lo que el contenido ha sido adaptado en palabras propias y NO se
incluye en `stack-skills.yml`.**

### Prácticas Arquitectónicas Incorporadas

Las siguientes prácticas fueron adaptadas e incorporadas al stack:

| Categoría | Práctica Adaptada | Ubicación en Stack |
|-----------|-------------------|-------------------|
| **Arquitectura** | Evitar dependencias circulares usando eventos o módulos compartidos | `preferred_practices`, `anti_patterns` |
| **Arquitectura** | Organizar por feature modules, no por capas técnicas | `preferred_practices`, `core_constraints` |
| **Arquitectura** | Servicios con responsabilidad única (no god services) | `preferred_practices`, `anti_patterns` |
| **Arquitectura** | Patrón repositorio para acceso a datos | `preferred_practices` |
| **Arquitectura** | Arquitectura event-driven para desacoplamiento | `preferred_practices`, `core_constraints` |
| **DI** | Preferir constructor injection sobre property injection | `preferred_practices`, `anti_patterns` |
| **DI** | Evitar service locator anti-pattern (ModuleRef.get dinámico) | `preferred_practices`, `anti_patterns` |
| **DI** | Entender scopes de providers (singleton, request, transient) | `preferred_practices` |
| **DI** | No proveer el mismo servicio en múltiples módulos | `preferred_practices`, `anti_patterns` |
| **Errores** | Exception filter global para errores consistentes | `preferred_practices`, `security_controls` |
| **Errores** | Manejo apropiado de errores async | `preferred_practices` |
| **Errores** | Nunca swallow errors silently | `anti_patterns` |
| **Performance** | Lifecycle hooks async implementados correctamente | `preferred_practices` |
| **Performance** | Caching estratégico con cache-manager | `preferred_practices` |
| **Performance** | Lazy loading de módulos grandes | `preferred_practices` |
| **Performance** | Evitar N+1 queries con Prisma include/select | `preferred_practices`, `typical_risks` |
| **Database** | Transacciones para operaciones multi-step | `preferred_practices` |
| **Database** | Siempre usar migraciones, nunca db push en producción | `preferred_practices`, `security_controls` |
| **Testing** | Test.createTestingModule() para unit tests | `preferred_practices` |
| **Testing** | supertest para E2E tests | `preferred_practices` |
| **Testing** | Mock external services en tests | `preferred_practices` |
| **API** | Interceptors para cross-cutting concerns | `preferred_practices` |

### Prácticas NO Incorporadas

Algunas prácticas del repositorio consultado no aplican a nuestro stack debido a
nuestras decisiones arquitectónicas:

- **JWT Authentication**: Nosotros usamos HttpOnly cookies + CSRF, no JWT en localStorage
- **class-validator/class-transformer**: Usamos Zod v4.2+ exclusivamente via nestjs-zod
- **TypeORM patterns**: Usamos Prisma exclusivamente
- **Microservices patterns**: El stack es monolito modular, no microservicios
- **GraphQL patterns**: El stack usa REST + OpenAPI exclusivamente

## Próximos Pasos

1. **Revisión MAS**: Discutir propuesta y decisiones abiertas
2. **Aprobación**: Confirmar stack para merge a main
3. **PR**: Abrir pull request tras aprobación
4. **Documentación Usuario**: Añadir guía de inicio rápido si se aprueba
