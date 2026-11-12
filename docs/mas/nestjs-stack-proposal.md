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

**Decisión**: `@nestjs/passport` + `@nestjs/jwt` en `AuthModule` dedicado (separado de `AuthzModule`)

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| **Paquetes** | `@nestjs/passport` + `@nestjs/jwt` | Official NestJS packages |
| **Guard order** | `JwtAuthGuard` (global) → `PermissionsGuard` | Auth antes de authz; `@Public()` opt-out |
| **Access token** | ~15 min, HttpOnly + Secure + SameSite | Corta vida, inmune a XSS |
| **Refresh token** | ~7-30 días, hash en DB, family tracking | Rotación con detección de reuso |
| **CSRF** | Token en cookie/header | Previene ataques cross-site |
| **Passwords** | Argon2id (`argon2` package) | Estado del arte para hashing |
| **Throttling** | `@nestjs/throttler` en login/reset | Anti brute-force |

#### IdPs Externos (OPCIONAL, deshabilitado por defecto)

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| **Providers** | Google, Microsoft Entra ID | OIDC (authorization code + PKCE) |
| **Estrategia** | Generic OIDC (`openid-client`) | Una implementación para ambos providers |
| **NO usar** | `passport-azure-ad` | Archivado, unmaintained |
| **Microsoft tenant** | Single tenant o `organizations` | NUNCA `common` sin whitelist |
| **Sesión post-callback** | Nuestras cookies, no IdP tokens | IdP tokens no se usan como sesión |
| **Habilitación** | Env flags (`OIDC_GOOGLE_ENABLED`) | Deshabilitado por defecto |

#### Identity Linking

| Campo | Descripción |
|-------|-------------|
| `provider` | `'local'`, `'google'`, `'microsoft'` |
| `providerSubject` | Único por provider (IdP `sub` claim) |
| `userId` | FK a `User` |
| `email` | Email del IdP (informativo) |
| `linkedAt` | Timestamp de vinculación |

**Reglas**: Link por `provider + providerSubject`, NUNCA por email solo. Solo vincular si `email_verified: true` y confirmación explícita. JIT provisioning OFF por defecto; nuevo IdP user sin permisos hasta asignar rol.

### Autorización: @nestjs/authorization + CASL

**Decisión**: RBAC/ABAC granular con permisos organizados por CATEGORÍA y ACCIÓN, condiciones a nivel de registro, y restricciones a nivel de campo.

| Componente | Decisión | Propósito |
|------------|----------|-----------|
| **Enforcement** | `@nestjs/authorization` + `@Can()` | Punto de aplicación en REST y MCP; deny-by-default |
| **Permission Engine** | CASL (`@casl/ability`) | Definición y evaluación de abilities |
| **Record Filtering** | `@casl/prisma` `accessibleBy()` | Filtrar queries por condiciones del usuario |
| **Manifest Sync** | `pnpm permissions:sync` | Sincroniza manifiestos a BD sin tocar asignaciones |
| **Frontend UI** | `@casl/react` | Visibilidad UI; API siempre enforce |

#### Organización por Categoría y Acción

Los permisos se organizan por **CATEGORÍA** (una por módulo de dominio) con **ACCIONES** individuales:

| Categoría | Acciones Estándar | Acciones Soft Delete | Acciones Custom |
|-----------|-------------------|----------------------|-----------------|
| `usuarios` | `listar`, `ver`, `crear`, `editar`, `exportar` | `eliminar`*, `restaurar`, `eliminar_permanente` | `desactivar`, `resetear_password` |
| `pedidos` | `listar`, `ver`, `crear`, `editar`, `exportar` | `eliminar`*, `restaurar`, `eliminar_permanente` | `aprobar`, `rechazar`, `cancelar` |
| `articulos` | `listar`, `ver`, `crear`, `editar`, `exportar` | `eliminar`*, `restaurar`, `eliminar_permanente` | `publicar`, `archivar` |

*`eliminar` = soft delete (default); `restaurar` = restore; `eliminar_permanente` = hard delete (restringido, auditado)

**Formato**: `categoria:accion` (e.g., `usuarios:listar`, `pedidos:aprobar`, `usuarios:restaurar`)

#### Granularidad de Permisos

| Nivel | Ejemplo | Implementación |
|-------|---------|----------------|
| **Acción** | `usuarios:crear`, `pedidos:aprobar` | `@Can('categoria:accion')` en endpoints y MCP tools |
| **Registro** | `{ tenantId: user.tenantId }`, `{ status: 'draft' }` | Condiciones JSON en `Permission`; `accessibleBy()` |
| **Campo** | `['email', 'name']` para lectura/escritura | JSON `fields` en permiso; filtrado en serialización/DTO |

#### Permission Manifests

Cada módulo de dominio declara su manifiesto de permisos en `<domain>.permissions.ts`:

```typescript
// src/modules/usuarios/usuarios.permissions.ts
export const UsuariosPermissions = {
  category: 'usuarios',
  displayName: 'Usuarios',
  actions: [
    { code: 'listar', description: 'Ver lista de usuarios' },
    { code: 'ver', description: 'Ver detalle de usuario' },
    { code: 'crear', description: 'Crear nuevo usuario' },
    { code: 'editar', description: 'Editar usuario existente' },
    { code: 'eliminar', description: 'Eliminar usuario' },
    { code: 'exportar', description: 'Exportar usuarios a CSV/Excel' },
    { code: 'desactivar', description: 'Desactivar cuenta de usuario' },
    { code: 'resetear_password', description: 'Forzar reset de contraseña' },
  ],
  fields: ['email', 'name', 'phone', 'role', 'status', 'createdAt'],
} as const;
```

#### Sincronización de Permisos

```bash
# Sincronizar manifiestos a BD (idempotente)
pnpm permissions:sync
```

El script:
- Upserta categorías y acciones sin modificar asignaciones de roles existentes
- Marca permisos removidos como `deprecated` para revisión (no elimina)
- Se ejecuta en deploy/seed

#### CI Test de Permisos

```typescript
// tests/permissions.spec.ts
describe('Permission Manifests', () => {
  it('all @Can() permissions are declared in manifests', () => {
    // Escanea código por @Can() y verifica contra manifiestos
  });

  it('all manifest actions are used by endpoints or MCP tools', () => {
    // Verifica que no hay acciones huérfanas
  });
});
```

#### Esquema de Permisos (PostgreSQL/Prisma)

```prisma
model PermissionCategory {
  id          String       @id @default(uuid())
  code        String       @unique  // e.g., "usuarios", "pedidos"
  displayName String                // e.g., "Usuarios", "Pedidos"
  permissions Permission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Permission {
  id          String             @id @default(uuid())
  categoryId  String
  category    PermissionCategory @relation(fields: [categoryId], references: [id])
  action      String             // e.g., "listar", "crear", "aprobar"
  description String             // e.g., "Ver lista de usuarios"
  conditions  Json?              // e.g., { "tenantId": "${user.tenantId}" }
  fields      Json?              // e.g., ["email", "name"] for field-level
  deprecated  Boolean            @default(false)  // Flagged on removal
  roles       RolePermission[]
  users       UserPermission[]
  createdAt   DateTime           @default(now())
  @@unique([categoryId, action])
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  permissions RolePermission[]
  users       UserRole[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
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
// Controller con @Can() usando category:action
@Controller('articulos')
export class ArticulosController {
  @Get()
  @Can('articulos:listar')
  async findAll(@CurrentUser() user: User) {
    return this.articulosService.findAccessible(user);
  }

  @Get(':id')
  @Can('articulos:ver')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articulosService.findOneAccessible(id, user);
  }

  @Post()
  @Can('articulos:crear')
  async create(@Body() dto: CreateArticuloDto, @CurrentUser() user: User) {
    return this.articulosService.create(dto, user);
  }

  @Patch(':id')
  @Can('articulos:editar')
  async update(@Param('id') id: string, @Body() dto: UpdateArticuloDto, @CurrentUser() user: User) {
    return this.articulosService.update(id, dto, user);
  }

  @Post(':id/publicar')
  @Can('articulos:publicar')  // Acción custom
  async publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articulosService.publish(id, user);
  }
}

// Service con accessibleBy()
@Injectable()
export class ArticulosService {
  constructor(private prisma: PrismaService, private casl: CaslAbilityFactory) {}

  async findAccessible(user: User) {
    const ability = await this.casl.createForUser(user);
    return this.prisma.articulo.findMany({
      where: accessibleBy(ability, 'articulos', 'listar').Articulo,
    });
  }
}

// MCP Tool con @Can() usando category:action
@Tool({
  name: 'listar_articulos',
  description: 'Listar artículos accesibles al usuario',
  parameters: z.object({}),
})
@Can('articulos:listar')
async listarArticulos(@CurrentUser() user: User) {
  return this.articulosService.findAccessible(user);
}

@Tool({
  name: 'publicar_articulo',
  description: 'Publicar un artículo (acción custom)',
  parameters: z.object({ id: z.string().uuid() }),
})
@Can('articulos:publicar')
async publicarArticulo({ id }: { id: string }, @CurrentUser() user: User) {
  return this.articulosService.publish(id, user);
}
```

#### Anti-patrones de Autorización

- ❌ `if (user.role === 'admin')` — verificar roles en código en vez de permisos
- ❌ Autorizar solo en UI con `@casl/react` — API debe siempre enforce
- ❌ Queries de lista sin `accessibleBy()` filtering
- ❌ Retornar campos restringidos sin filtrar
- ❌ Aceptar updates de campos que el usuario no puede modificar
- ❌ Hardcodear permisos en código en vez de almacenar en BD
- ❌ Omitir audit logging de cambios de permisos
- ❌ Agregar endpoints/MCP tools sin actualizar el manifiesto de permisos
- ❌ Olvidar ejecutar `pnpm permissions:sync` tras cambiar manifiestos
- ❌ Declarar acciones no usadas o usar permisos no declarados (CI debe fallar)

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

## Validación Unificada: Ambos Lados, Única Fuente

### Decisión

**Zod v4.2+** es la ÚNICA librería de validación. Schemas compartidos en `packages/contracts`
son la ÚNICA FUENTE DE VERDAD. TODO se valida en AMBOS frontend (UX) y backend (autoritativo).

### Principio Fundamental

| Lado | Propósito | ¿Suficiente solo? |
|------|-----------|-------------------|
| **Frontend** | UX (feedback inmediato) | ❌ NO — puede ser bypassed |
| **Backend** | Autoritativo (seguridad) | ✅ SÍ — siempre re-valida |

### Implementación

| Capa | Herramienta | Schema Source |
|------|-------------|---------------|
| **REST Body/Query/Params** | `nestjs-zod` + `ZodValidationPipe` | `packages/contracts` |
| **MCP Tool Inputs** | Zod directo | `packages/contracts` |
| **React Forms** | React Hook Form + `zodResolver` | `packages/contracts` (mismo schema) |
| **Route Search Params** | TanStack Router `validateSearch` | `packages/contracts` |
| **API Responses** | `.safeParse()` en dev | `packages/contracts` |
| **Business Rules (DB)** | Service + RFC 9457 errors | `packages/contracts` (error schema) |

### Ejemplo Completo

```typescript
// packages/contracts/src/usuarios/create-usuario.schema.ts
export const createUsuarioSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  name: z.string().min(2, { message: 'Nombre muy corto' }),
  password: z.string().min(8, { message: 'Mínimo 8 caracteres' }),
}).strict();

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

// packages/contracts/src/common/rfc9457.schema.ts
export const fieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

export const problemDetailSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(), // Field-level errors
});
```

```typescript
// apps/api - Backend validation (autoritativo)
import { createZodDto } from 'nestjs-zod';
import { createUsuarioSchema } from '@project/contracts';

export class CreateUsuarioDto extends createZodDto(createUsuarioSchema) {}

@Controller('usuarios')
export class UsuariosController {
  @Post()
  @Can('usuarios:crear')
  async create(@Body() dto: CreateUsuarioDto) { // ZodValidationPipe valida
    return this.usuariosService.create(dto);
  }
}

// Business rule validation in service
@Injectable()
export class UsuariosService {
  async create(dto: CreateUsuarioInput) {
    const existing = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({
        type: 'https://api.example.com/errors/email-taken',
        title: 'Email already registered',
        status: 409,
        errors: [{ field: 'email', code: 'EMAIL_TAKEN', message: 'Este email ya está registrado' }],
      });
    }
    // ... create user
  }
}
```

```typescript
// apps/web - Frontend validation (UX)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUsuarioSchema, CreateUsuarioInput } from '@project/contracts';

function CreateUsuarioForm() {
  const form = useForm<CreateUsuarioInput>({
    resolver: zodResolver(createUsuarioSchema), // MISMO schema que backend
  });

  const mutation = useMutation({
    mutationFn: api.usuarios.create,
    onError: (error) => {
      // Map RFC 9457 errors to form fields
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(({ field, message }) => {
          form.setError(field as keyof CreateUsuarioInput, { message });
        });
      }
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
      <Input {...form.register('email')} error={form.formState.errors.email?.message} />
      <Input {...form.register('name')} error={form.formState.errors.name?.message} />
      <Input type="password" {...form.register('password')} error={form.formState.errors.password?.message} />
    </form>
  );
}
```

```typescript
// apps/web - Route search params validation
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import { usuariosSearchSchema } from '@project/contracts';

export const Route = createFileRoute('/usuarios/')({
  validateSearch: usuariosSearchSchema, // Type-safe + validated
});

// usuariosSearchSchema in packages/contracts
export const usuariosSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
```

### Anti-patrones

- ❌ Validar solo en frontend — backend SIEMPRE re-valida
- ❌ Duplicar reglas fuera de `packages/contracts`
- ❌ Ignorar errores RFC 9457 en frontend — mapear a form fields
- ❌ Schemas no-strict — siempre `.strict()` para rechazar keys desconocidas
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
- Componentes shadcn/ui en `packages/ui`; app shell/layout en `apps/web/src/shared/`

## Soft Delete (Por Defecto)

### Decisión

**Soft delete es obligatorio** cuando sea posible. Los modelos Prisma incluyen `deletedAt DateTime?`
(opcionalmente `deletedBy String?` para auditoría). No se elimina físicamente por defecto.

### Implementación

| Componente | Implementación |
|------------|----------------|
| **Prisma Schema** | `deletedAt DateTime?`, `deletedBy String?` en cada modelo |
| **Prisma Extension** | Intercept `delete()` → `update({ deletedAt })`, filter `deletedAt: null` en reads |
| **Unique Constraints** | Partial indexes: `@@unique([email], where: { deletedAt: null })` via migrations |
| **Restore** | Permiso separado: `<category>:restaurar` |
| **Hard Delete** | Permiso restringido: `<category>:eliminar_permanente` (solo legal/retention) |
| **Cascades** | Soft-delete parent → soft-delete o detach children (consistente) |

### Prisma Schema

```prisma
model Usuario {
  id        String    @id @default(cuid())
  email     String
  name      String
  
  deletedAt DateTime?
  deletedBy String?
  
  // Partial unique index (migration SQL required)
  // @@unique([email]) WHERE deletedAt IS NULL
  
  @@index([deletedAt])
}
```

### Prisma Client Extension

```typescript
// apps/api/src/prisma/soft-delete.extension.ts
import { Prisma } from '@prisma/client';

export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        // Convert delete to soft delete
        return (prisma as any)[model].update({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany({ model, args, query }) {
        return (prisma as any)[model].updateMany({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      async findMany({ model, args, query }) {
        // Filter out soft-deleted by default
        if (!args?.includeDeleted) {
          args = { ...args, where: { ...args?.where, deletedAt: null } };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (!args?.includeDeleted) {
          args = { ...args, where: { ...args?.where, deletedAt: null } };
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        const result = await query(args);
        if (result?.deletedAt && !args?.includeDeleted) return null;
        return result;
      },
      async count({ model, args, query }) {
        if (!args?.includeDeleted) {
          args = { ...args, where: { ...args?.where, deletedAt: null } };
        }
        return query(args);
      },
    },
  },
});

// Usage
const prisma = new PrismaClient().$extends(softDeleteExtension);
```

### Migration para Partial Unique Index

```sql
-- migrations/XXXXXX_add_partial_unique_email.sql
CREATE UNIQUE INDEX "Usuario_email_unique_active" 
ON "Usuario"("email") 
WHERE "deletedAt" IS NULL;
```

### Permisos de Soft Delete

```typescript
// src/modules/usuarios/usuarios.permissions.ts
export const usuariosPermissions: PermissionManifest = {
  category: 'usuarios',
  actions: [
    { code: 'listar', description: 'Ver lista de usuarios' },
    { code: 'ver', description: 'Ver detalle de usuario' },
    { code: 'crear', description: 'Crear nuevos usuarios' },
    { code: 'editar', description: 'Editar usuarios existentes' },
    { code: 'eliminar', description: 'Soft-delete usuarios' },  // DEFAULT
    { code: 'restaurar', description: 'Restaurar usuarios eliminados' },  // SEPARATE
    { code: 'eliminar_permanente', description: 'Hard-delete (solo legal/retention)' },  // RESTRICTED
    { code: 'exportar', description: 'Exportar lista de usuarios' },
  ],
};
```

### Controller con Soft Delete

```typescript
@Controller('usuarios')
export class UsuariosController {
  @Delete(':id')
  @Can('usuarios:eliminar')  // Soft delete
  async softDelete(@Param('id') id: string) {
    return this.usuariosService.softDelete(id);
  }

  @Post(':id/restore')
  @Can('usuarios:restaurar')  // Separate permission
  async restore(@Param('id') id: string) {
    return this.usuariosService.restore(id);
  }

  @Delete(':id/permanent')
  @Can('usuarios:eliminar_permanente')  // Restricted, audited
  async hardDelete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usuariosService.hardDelete(id, user.id, 'Legal erasure request #123');
  }
}
```

### Service con Audit

```typescript
@Injectable()
export class UsuariosService {
  async softDelete(id: string, deletedById?: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: deletedById },
    });
  }

  async restore(id: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
      includeDeleted: true,  // Opt-in to see soft-deleted
    });
  }

  async hardDelete(id: string, actorId: string, reason: string) {
    // Audit log BEFORE delete
    await this.auditService.log({
      action: 'HARD_DELETE',
      entity: 'Usuario',
      entityId: id,
      actorId,
      reason,
    });
    
    // Actual hard delete (bypasses extension)
    return this.prisma.$executeRaw`DELETE FROM "Usuario" WHERE id = ${id}`;
  }
}
```

### Anti-patrones

- ❌ Usar hard delete sin justificación (legal/retention)
- ❌ Queries sin filtro de soft-delete (extension lo maneja)
- ❌ Bypass de Prisma extension para raw deletes
- ❌ Unique constraints sin partial index
- ❌ Restore sin permiso `<category>:restaurar`
- ❌ Hard delete sin permiso `<category>:eliminar_permanente` y audit log
- ❌ Cascades inconsistentes (parent soft-deleted, children huérfanos)

## Auditoría Comprehensiva (Principio Constitucional)

### Decisión

**TODA acción relevante DEBE ser auditada**—esto es un principio fundacional del stack, no opcional.
Implementación mediante módulo `audit` reutilizable requerido en cada proyecto (no código detallado en constitución).

### Campos del Registro de Auditoría

| Campo | Descripción |
|-------|-------------|
| `userId` | Usuario que ejecutó la acción |
| `clientId` | Cliente/aplicación (para service accounts) |
| `action` | Acción ejecutada (create, update, delete, etc.) |
| `permission` | Permiso utilizado (categoria:accion) |
| `timestamp` | Fecha y hora |
| `entity` | Tipo de entidad |
| `recordId` | ID del registro afectado |
| `beforeValue` | Valor anterior (masked) |
| `afterValue` | Valor posterior (masked) |
| `origin` | Origen: REST, MCP, job |
| `ip` | Dirección IP |
| `userAgent` | User agent del cliente |
| `requestId` | ID de request para correlación |

### Acciones Auditadas

| Categoría | Acciones |
|-----------|----------|
| **CRUD** | create, update, soft delete, restore, hard delete |
| **Permisos** | role assignment, permission grant, permission revoke |
| **Auth** | login (success/failed), logout, password change, token refresh |
| **Exports** | data export (PDF, CSV, Excel) |
| **MCP** | tool calls (entrada, salida, errores) |

### Implementación

```typescript
// src/audit/audit.module.ts
@Module({
  imports: [PrismaModule],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService],
})
export class AuditModule {}

// src/audit/audit.service.ts
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    // Mask sensitive fields before logging
    const masked = this.maskSensitiveFields(entry);
    
    await this.prisma.auditLog.create({
      data: {
        userId: masked.userId,
        clientId: masked.clientId,
        action: masked.action,
        permission: masked.permission,
        entity: masked.entity,
        recordId: masked.recordId,
        beforeValue: masked.beforeValue,
        afterValue: masked.afterValue,
        origin: masked.origin,
        ip: masked.ip,
        userAgent: masked.userAgent,
        requestId: masked.requestId,
      },
    });
  }

  private maskSensitiveFields(entry: AuditEntry): AuditEntry {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'ssn'];
    // Mask fields in beforeValue and afterValue
    return {
      ...entry,
      beforeValue: this.maskObject(entry.beforeValue, sensitiveFields),
      afterValue: this.maskObject(entry.afterValue, sensitiveFields),
    };
  }
}
```

### Prisma Schema

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  clientId  String?
  action    String
  permission String?
  entity    String
  recordId  String?
  beforeValue Json?
  afterValue  Json?
  origin    String   // REST, MCP, job
  ip        String?
  userAgent String?
  requestId String?
  createdAt DateTime @default(now())
  
  // NO deletedAt - append-only table
  // NO @@map("audit_logs") si se prefiere convención
  
  @@index([userId])
  @@index([entity, recordId])
  @@index([action])
  @@index([createdAt])
}
```

### NestJS Interceptor

```typescript
// src/audit/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(async (response) => {
        const auditMeta = Reflect.getMetadata('audit', context.getHandler());
        if (auditMeta) {
          await this.auditService.log({
            userId: request.user?.id,
            action: auditMeta.action,
            permission: auditMeta.permission,
            entity: auditMeta.entity,
            recordId: request.params?.id,
            origin: 'REST',
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            requestId: request.headers['x-request-id'],
          });
        }
      }),
    );
  }
}

// Decorator para marcar acciones auditadas
export const Audited = (meta: AuditMetadata) => SetMetadata('audit', meta);
```

### Uso en Controller

```typescript
@Controller('usuarios')
export class UsuariosController {
  @Post()
  @Can('usuarios:crear')
  @Audited({ action: 'create', entity: 'Usuario', permission: 'usuarios:crear' })
  async create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Delete(':id')
  @Can('usuarios:eliminar')
  @Audited({ action: 'soft_delete', entity: 'Usuario', permission: 'usuarios:eliminar' })
  async softDelete(@Param('id') id: string) {
    return this.usuariosService.softDelete(id);
  }
}
```

### Permisos de Auditoría

```typescript
// src/audit/audit.permissions.ts
export const auditoriaPermissions: PermissionManifest = {
  category: 'auditoria',
  actions: [
    { code: 'ver', description: 'Ver registros de auditoría' },
    { code: 'exportar', description: 'Exportar datos de auditoría' },
  ],
};
```

### Frontend: Vista de Auditoría

```typescript
// apps/web/src/features/audit/pages/AuditLogPage.tsx
function AuditLogPage() {
  const search = Route.useSearch(); // TanStack Router search params
  
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['audit-logs', search],
    queryFn: ({ pageParam }) => api.audit.list({ ...search, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return (
    <Can permission="auditoria:ver">
      <AuditFilters />
      <VirtualizedAuditTable 
        data={data?.pages.flatMap(p => p.items) ?? []}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
      />
      <Can permission="auditoria:exportar">
        <ExportAuditButton filters={search} />
      </Can>
    </Can>
  );
}
```

### Retención y Archivado

```typescript
// Configuración de retención
export const AUDIT_RETENTION_DAYS = process.env.AUDIT_RETENTION_DAYS 
  ? parseInt(process.env.AUDIT_RETENTION_DAYS) 
  : 365; // 1 año por defecto

// Job de archivado (ejecutar periódicamente)
@Injectable()
export class AuditArchiveService {
  async archiveOldRecords() {
    const cutoffDate = subDays(new Date(), AUDIT_RETENTION_DAYS);
    
    // Mover a tabla de archivo o storage externo
    const oldRecords = await this.prisma.auditLog.findMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    
    await this.archiveToStorage(oldRecords); // S3, etc.
    
    // Solo después de confirmar archivo exitoso
    await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
  }
}
```

### Anti-patrones

- ❌ Features sin audit trail (auditoría es constitucional)
- ❌ Loggear passwords, tokens, secrets, PII sin máscara
- ❌ UPDATE o DELETE en tabla AuditLog (append-only)
- ❌ Bypass del interceptor/extension de auditoría
- ❌ Exponer audit logs sin permiso `auditoria:ver`
- ❌ Ignorar MCP tool calls en auditoría
- ❌ Sin política de retención configurada

### Nota

El módulo `audit` podría convertirse posteriormente en un paquete interno compartido o template
para consistencia entre proyectos del stack.

## Principios de Performance (Nivel Constitucional)

### Decisión

**Performance es un requisito de primera clase**—estos principios son fundacionales, no optimizaciones opcionales.

### 1. Sin N+1 ni Queries Repetidas

```typescript
// ❌ N+1: query por cada usuario
const orders = await prisma.order.findMany();
for (const order of orders) {
  order.user = await prisma.user.findUnique({ where: { id: order.userId } }); // N queries!
}

// ✅ Una sola query con include
const orders = await prisma.order.findMany({
  include: { user: { select: { id: true, name: true, email: true } } },
});

// ✅ Batch lookup cuando no se puede usar include
const userIds = orders.map(o => o.userId);
const users = await prisma.user.findMany({
  where: { id: { in: userIds } },
  select: { id: true, name: true, email: true },
});
const userMap = new Map(users.map(u => [u.id, u]));
orders.forEach(o => o.user = userMap.get(o.userId));
```

### 2. Cargar Solo lo Necesario

```typescript
// ❌ Cargar entidad completa
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Select explícito
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }, // Solo campos necesarios
});
```

### 3. Índices

```prisma
model Order {
  id        String   @id @default(cuid())
  userId    String
  status    String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])              // Relación
  @@index([status])              // WHERE frecuente
  @@index([createdAt])           // ORDER BY frecuente
  @@index([userId, status])      // Query compuesta frecuente
}
```

```sql
-- Revisar queries pesadas
EXPLAIN ANALYZE SELECT * FROM "Order" WHERE status = 'pending' ORDER BY "createdAt" DESC;
```

### 4. Trabajo Pesado Async

```typescript
// Opción 1: @nestjs/event-emitter (simple, fire-and-forget)
@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.prisma.order.create({ data: dto });
    
    // Async: no bloquea la respuesta HTTP
    this.eventEmitter.emit('order.created', order);
    
    return order;
  }
}

@Injectable()
export class OrderListeners {
  @OnEvent('order.created')
  async handleOrderCreated(order: Order) {
    await this.emailService.sendConfirmation(order); // Async
    await this.inventoryService.reserve(order);       // Async
  }
}

// Opción 2: @nestjs/schedule (cron jobs)
@Injectable()
export class ReportScheduler {
  @Cron('0 6 * * *') // 6 AM diario
  async generateDailyReport() {
    await this.reportService.generateAndSend();
  }
}

// Opción 3: BullMQ + Redis (SOLO si se necesitan retries, durabilidad, o volumen alto)
// NO mandatorio por defecto - evaluar caso por caso
```

### 5. Transacciones Cortas

```typescript
// ❌ Llamadas externas dentro de transacción
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await this.emailService.send(order); // ¡BLOQUEA la transacción!
  await this.paymentService.charge(order); // ¡HTTP dentro de tx!
});

// ✅ Transacción corta + async después
const order = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await tx.inventory.update({ where: { id: item.id }, data: { qty: { decrement: 1 } } });
  return order;
});
// Después de la transacción
this.eventEmitter.emit('order.created', order);
```

```typescript
// ❌ Loop con operaciones individuales
for (const item of items) {
  await prisma.item.create({ data: item }); // N operaciones
}

// ✅ Bulk operation
await prisma.item.createMany({ data: items }); // 1 operación
```

### 6. Performance Budget Medible

```typescript
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    // Log slow queries (> 100ms)
    this.$on('query', (e) => {
      if (e.duration > 100) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }
}
```

```typescript
// OpenTelemetry setup (main.ts)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  // Exporter configurado para tu backend (Jaeger, Zipkin, OTLP)
});
sdk.start();
```

| Métrica | Target |
|---------|--------|
| p95 response time | < 300 ms |
| Slow query threshold | > 100 ms (logged) |
| Transaction duration | < 50 ms típico |

### 7. Frontend Ligero

| Técnica | Implementación |
|---------|----------------|
| **Lazy routes** | `React.lazy()` + `Suspense` por feature |
| **Code splitting** | `import()` dinámico para componentes pesados |
| **Virtualización** | TanStack Virtual para listas > 50 items |
| **Lazy images** | `loading="lazy"` + srcsets |
| **Memoization** | `useMemo`, `useCallback` para evitar re-renders |
| **Query caching** | TanStack Query con `staleTime` apropiado |

### Anti-patrones

- ❌ Query dentro de loops (N+1)
- ❌ Cargar entidades completas sin `select` explícito
- ❌ Columnas en WHERE/ORDER BY sin índice
- ❌ HTTP requests bloqueados por trabajo pesado
- ❌ Llamadas externas dentro de transacciones
- ❌ Loops con operaciones individuales (usar bulk)
- ❌ Mandar BullMQ/Redis para todo (solo si se necesita)
- ❌ Ignorar slow query logging
- ❌ Frontend sin lazy loading ni code splitting
- ❌ Listas grandes sin virtualización

### Nota sobre Caching

MAS gestionará sus propias estrategias de caching. Este stack **NO** manda Redis/backend caching.
TanStack Query proporciona caching en cliente como ya está definido.

## Paginación Obligatoria (Server-Side)

### Requisitos API

- **TODOS** los endpoints de lista/colección DEBEN ser paginados server-side
- NO listas sin límite; rechazar requests que excedan max page size
- Schema Zod estándar en `packages/contracts`; documentado en OpenAPI

### Tipos de Paginación

| Tipo | Uso | Implementación |
|------|-----|----------------|
| **Cursor-based** | Listas grandes/infinitas | `cursor`, `take`; mejor performance, sin drift |
| **Offset/Page** | Tablas admin acotadas | `page`, `pageSize`, `skip`, `take` |

### Prisma + CASL

```typescript
// Paginación cursor-based con accessibleBy()
async findPaginated(user: User, cursor?: string, take = 20) {
  const ability = await this.casl.createForUser(user);
  return this.prisma.articulo.findMany({
    where: accessibleBy(ability, 'articulos', 'listar').Articulo,
    take: Math.min(take, 100), // Max enforced
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // Stable sort
  });
}
```

### Zod Schema Estándar

```typescript
// packages/contracts/src/pagination.ts
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    meta: z.object({
      total: z.number().optional(),
      page: z.number().optional(),
      pageSize: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().optional(),
    }),
  });
```

### MCP Tools Paginados

```typescript
@Tool({
  name: 'listar_articulos',
  description: 'Listar artículos con paginación cursor-based',
  parameters: CursorPaginationSchema,
})
@Can('articulos:listar')
async listarArticulos(params: CursorPagination, @CurrentUser() user: User) {
  const result = await this.articulosService.findPaginated(user, params.cursor, params.take);
  return {
    items: result,
    meta: { hasMore: result.length === params.take, nextCursor: result.at(-1)?.id },
  };
}
```

## Frontend: Tablas y Listas

### TanStack Table con Paginación Server-Side

```typescript
// State en TanStack Router search params
const searchParams = Route.useSearch();
const [pagination, setPagination] = useState({
  pageIndex: searchParams.page ? searchParams.page - 1 : 0,
  pageSize: searchParams.pageSize ?? 20,
});

// Query con paginación
const { data, isLoading } = useQuery({
  queryKey: ['articulos', pagination, filters, sorting],
  queryFn: () => api.articulos.list({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    ...filters,
    ...sorting,
  }),
  keepPreviousData: true,
});

// Sync con URL
useEffect(() => {
  navigate({ search: { page: pagination.pageIndex + 1, pageSize: pagination.pageSize } });
}, [pagination]);
```

### Infinite Scroll con useInfiniteQuery

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['articulos', 'infinite', filters],
  queryFn: ({ pageParam }) => api.articulos.list({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.meta.hasMore ? lastPage.meta.nextCursor : undefined,
});
```

## Lazy Loading

### Routes Lazy-Loaded

```typescript
// src/routes/index.tsx
const ArticulosFeature = lazy(() => import('../features/articulos'));
const UsuariosFeature = lazy(() => import('../features/usuarios'));

<Route path="/articulos" element={
  <Suspense fallback={<LoadingSpinner />}>
    <ArticulosFeature />
  </Suspense>
} />
```

### Virtualization (TanStack Virtual)

```typescript
// Listas largas (>50 items) DEBEN usar virtualización
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
  overscan: 5,
});
```

### Anti-patrones

- ❌ Endpoints sin paginación (listas sin límite)
- ❌ Fetch full dataset + paginación client-side
- ❌ Offset pagination para datasets infinitos
- ❌ Sort/filter arbitrarios sin whitelist
- ❌ Eager-loading de todas las rutas
- ❌ Listas largas sin virtualización

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
