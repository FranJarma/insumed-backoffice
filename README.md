# Insumed — Sistema de Gestión Interno

Dashboard interno para gestión de ventas, compras y clientes de Insumed.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Drizzle ORM
- PostgreSQL (Neon)
- Tailwind CSS + shadcn/ui

---

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

1. Crear un proyecto en [neon.tech](https://neon.tech)
2. Copiar la connection string
3. Crear `.env.local` en la raíz:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

### 3. Crear las tablas

```bash
npm run db:push
```

> Esto aplica el schema directamente sin generar archivos de migración. Ideal para desarrollo inicial.

### 4. Cargar datos de prueba (opcional)

```bash
npm run db:seed
```

Carga 5 clientes, 9 ventas y 5 compras de ejemplo.

### 5. Iniciar el servidor

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Estructura del Proyecto

```
src/
├── app/                    # Páginas (Next.js App Router)
│   ├── dashboard/
│   ├── sales/
│   ├── clients/
│   └── purchases/
├── features/               # Lógica por dominio
│   ├── clients/
│   │   ├── actions/        # Server Actions
│   │   ├── components/     # Componentes React
│   │   └── types/          # Schemas Zod + tipos
│   ├── sales/
│   ├── purchases/
│   └── dashboard/
├── components/ui/          # Componentes shadcn/ui
├── db/
│   ├── schema.ts           # Schema Drizzle
│   ├── index.ts            # Conexión DB
│   └── seed.ts             # Datos de prueba
└── lib/
    └── utils.ts            # Helpers (cn, formatCurrency, formatDate)
```

---

## Reglas de Negocio

| Regla | Detalle |
|---|---|
| Venta CANCELLED | Requiere número y URL de nota de crédito |
| Ventas CANCELLED | No se incluyen en totales ni en cuentas a cobrar |
| Cuentas a cobrar | Son todas las ventas con status = PENDING |
| Dashboard mensual | Filtra ventas y compras por el mes actual |

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:push` | Aplica schema a la DB (sin migraciones) |
| `npm run db:generate` | Genera archivos de migración |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga datos de prueba |
| `npm run db:studio` | Abre Drizzle Studio (UI para la DB) |
