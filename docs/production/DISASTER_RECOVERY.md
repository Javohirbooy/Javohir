# Disaster recovery

## Scope of critical data

| Asset | Location | Recovery lever |
|--------|-----------|----------------|
| Relational data | Neon (PostgreSQL) | PITR / restore from backup; Neon branches |
| Uploaded files | Vercel Blob | Blob dashboard / re-upload from secondary copy if you maintain one |
| Sessions | JWT in cookies + optional Redis | Users re-login; Redis is ephemeral for rate limits |
| Secrets | Vercel env | Re-issue keys; rotate `AUTH_SECRET` forces re-login |

## Recovery checklist (incident)

1. **Declare** incident owner and comms channel.
2. **Stabilize:** Vercel **Instant Rollback** to last known good deployment if the app is the fault.
3. **Database:** stop destructive jobs; restore from **Neon backup / PITR** to a new branch or database if data corruption suspected (see [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)).
4. **Secrets:** if `DATABASE_URL`, `AUTH_SECRET`, or OAuth secrets leaked, **rotate** in Vercel and redeploy.
5. **Verify:** `/api/health`, auth, payment/mail if any, critical admin flows.
6. **Postmortem:** timeline, blast radius, permanent fixes (monitoring, backups, access).

## RTO / RPO (fill in for your org)

- **RPO (data):** Neon plan-dependent (often minutes with PITR).
- **RTO (app):** typically minutes on Vercel rollback + DNS if applicable.

## Backup environment separation

- Keep **production** backups in the **provider account** with restricted IAM.
- Optionally export encrypted dumps to a **different cloud account** or object store for ransomware resilience.

## Uploads / Blob

- Blob objects are **outside** Postgres; DR must include **Blob retention** or periodic export if files are legally critical.

## Migration rollback safety

- Prefer **expand/contract** migrations: backward-compatible deploy, then cleanup.
- If a migration **drops** or **truncates**, assume **no** safe rollback without restore — plan maintenance window and backup first.
