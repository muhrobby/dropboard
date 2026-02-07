# Database Commands

## Prerequisites

Pastikan `DATABASE_URL` sudah di-set di file `.env`:

```bash
DATABASE_URL=postgresql://postress:aX0K6Dz4pHEP5Jj71dy5@43.133.147.104:5433/Postgress
```

## Available Commands

### `pnpm db:push`
Push schema changes directly to database (tanpa migration file).

**Gunakan saat:**
- Development
- Rapid prototyping
- Saat schema sering berubah

```bash
pnpm db:push
```

### `pnpm db:generate`
Generate migration file dari perubahan schema.

**Gunakan saat:**
- Production
- Saat ingin tracking perubahan schema
- Saat ingin version control untuk schema

```bash
pnpm db:generate
```

Migration file akan dibuat di `db/migrations/`.

### `pnpm db:migrate`
Apply migration yang sudah ada ke database.

**Gunakan saat:**
- Deployment ke production
- Apply migration ke database baru

```bash
pnpm db:migrate
```

### `pnpm db:studio`
Buka Drizzle Studio untuk melihat dan edit database secara visual.

```bash
pnpm db:studio
```

Studio akan terbuka di `http://localhost:4983`.

### `pnpm db:pull`
Pull schema dari database yang sudah ada (introspect).

**Gunakan saat:**
- Database sudah ada dan ingin generate schema
- Reverse engineering dari database yang sudah ada

```bash
pnpm db:pull
```

## Workflow

### Development Workflow

1. Edit schema di `db/schema/`
2. Push perubahan ke database:
   ```bash
   pnpm db:push
   ```
3. Lanjutkan development

### Production Workflow

1. Edit schema di `db/schema/`
2. Generate migration:
   ```bash
   pnpm db:generate
   ```
3. Review migration file di `db/migrations/`
4. Apply migration:
   ```bash
   pnpm db:migrate
   ```
5. Commit migration file ke git

### Initial Setup

Untuk setup database pertama kali:

```bash
# Push schema langsung ke database
pnpm db:push
```

Atau jika ingin menggunakan migration:

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate
```

## Troubleshooting

### Error: Connection Refused

Pastikan:
- Database server berjalan
- `DATABASE_URL` di `.env` benar
- Firewall tidak memblokir koneksi

### Error: Schema Mismatch

Jika schema di database tidak sesuai dengan code:

```bash
# Push ulang schema (development)
pnpm db:push

# Atau generate migration baru (production)
pnpm db:generate
pnpm db:migrate
```

### Drizzle Studio Tidak Terbuka

Pastikan port 4983 tidak digunakan oleh aplikasi lain:

```bash
# Cek port yang digunakan
netstat -tlnp | grep 4983
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |

Format `DATABASE_URL`:
```
postgresql://username:password@host:port/database
```

Contoh:
```
postgresql://postress:aX0K6Dz4pHEP5Jj71dy5@43.133.147.104:5433/Postgress
```
