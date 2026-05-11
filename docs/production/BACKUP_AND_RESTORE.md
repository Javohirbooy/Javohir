# Backup and restore

## PostgreSQL (Neon)

### Automatic strategy (recommended)

1. Use Neon **built-in backups** and **Point-in-Time Recovery (PITR)** per your plan.
2. Enable **branching** for pre-migration snapshots: create a branch before risky `migrate deploy`.
3. Restrict console access with **MFA** and least-privilege roles.

### Logical dumps (optional second line)

Schedule `pg_dump` (or Neon “dump” features) to encrypted object storage in a **different** account than production app credentials.

Example (operator machine with network access — adjust connection string):

```bash
pg_dump "$DATABASE_URL" -Fc -f "backup-$(date -u +%Y%m%dT%H%MZ).dump"
```

Restore (destructive — target empty DB or new instance):

```bash
pg_restore --clean --if-exists -d "$DIRECT_URL" backup.dump
```

**Note:** use **`DIRECT_URL`** (non-pooler) for `pg_dump` / `pg_restore` where Neon recommends it.

## Vercel Blob

- Configure **retention** and access policies in the Vercel dashboard.
- For compliance-heavy files, maintain an **async copy** (e.g. nightly export) to WORM or versioned storage.

## Application config

- Export **Vercel env var list** (names only, not values) into runbooks so rebuilds are reproducible.
- Store **infrastructure as code** or documented manual steps for DNS, domains, and HSTS.

## Restore validation

After any DB restore:

1. Run `prisma migrate status` (or equivalent) against restored DB.
2. Hit **`GET /api/health`** — `database: true`.
3. Spot-check **auth** and **role-gated** routes.
