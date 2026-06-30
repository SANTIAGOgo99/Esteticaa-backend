// src/controllers/stats.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';

export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
        // ── 1. Info general de la base de datos ──────────────────────────────
        const dbQuery = `
            SELECT 
                (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
                (SELECT count(*) FROM pg_stat_activity) AS total_connections,
                pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty,
                pg_database_size(current_database()) AS db_size_bytes,
                version() AS db_version,
                tup_inserted, tup_updated, tup_deleted, tup_returned,
                blks_read, blks_hit,
                xact_commit, xact_rollback,
                deadlocks, conflicts,
                temp_files, temp_bytes
            FROM pg_stat_database 
            WHERE datname = current_database();
        `;

        // ── 2. Tablas más grandes (top 8) ────────────────────────────────────
        const tablesQuery = `
            SELECT 
                schemaname || '.' || relname AS table_name,
                pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                pg_total_relation_size(relid) AS size_bytes,
                n_live_tup AS row_count,
                n_dead_tup AS dead_rows,
                last_autovacuum,
                last_autoanalyze
            FROM pg_stat_user_tables
            ORDER BY size_bytes DESC
            LIMIT 8;
        `;

        // ── 3. Consultas más lentas (si pg_stat_statements está disponible) ──
        const slowQueriesQuery = `
            SELECT 
                schemaname || '.' || relname AS table_name,
                seq_scan,
                idx_scan,
                CASE WHEN (seq_scan + idx_scan) > 0 
                     THEN round((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 1)
                     ELSE 0 END AS index_usage_pct,
                n_live_tup AS rows
            FROM pg_stat_user_tables
            WHERE seq_scan + idx_scan > 0
            ORDER BY seq_scan DESC
            LIMIT 6;
        `;

        // ── 4. Conexiones por estado ─────────────────────────────────────────
        const connectionsQuery = `
            SELECT state, count(*) AS count
            FROM pg_stat_activity
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY count DESC;
        `;

        // ── 5. Conteo de objetos por schema ──────────────────────────────────
        const schemaQuery = `
            SELECT 
                schemaname,
                count(*) AS table_count,
                sum(n_live_tup) AS total_rows
            FROM pg_stat_user_tables
            GROUP BY schemaname
            ORDER BY table_count DESC;
        `;

        // ── 6. Actividad de escritura por tabla (top 6) ──────────────────────
        const writeActivityQuery = `
            SELECT 
                relname AS table_name,
                n_tup_ins AS inserts,
                n_tup_upd AS updates,
                n_tup_del AS deletes,
                n_tup_ins + n_tup_upd + n_tup_del AS total_writes
            FROM pg_stat_user_tables
            ORDER BY total_writes DESC
            LIMIT 6;
        `;

        const [dbRes, tablesRes, slowRes, connRes, schemaRes, writeRes] = await Promise.all([
            pool.query(dbQuery),
            pool.query(tablesQuery),
            pool.query(slowQueriesQuery),
            pool.query(connectionsQuery),
            pool.query(schemaQuery),
            pool.query(writeActivityQuery),
        ]);

        const db = dbRes.rows[0];
        const blksTotal = parseInt(db.blks_hit || '0') + parseInt(db.blks_read || '0');
        const cacheHitPct = blksTotal > 0
            ? ((parseInt(db.blks_hit) / blksTotal) * 100).toFixed(1)
            : '100';

        const xactTotal = parseInt(db.xact_commit || '0') + parseInt(db.xact_rollback || '0');
        const commitPct = xactTotal > 0
            ? ((parseInt(db.xact_commit) / xactTotal) * 100).toFixed(1)
            : '100';

        res.status(200).json({
            // ── Panel superior ───────────────────────────────────────────────
            server: {
                status: 'Online',
                activeConnections: parseInt(db.active_connections || '0'),
                totalConnections: parseInt(db.total_connections || '0'),
                sizeFormatted: db.db_size_pretty || '0 MB',
                sizeBytes: parseInt(db.db_size_bytes || '0'),
                version: (db.db_version || 'PostgreSQL').split(',')[0].replace('PostgreSQL ', 'PG '),
            },

            // ── Salud general ────────────────────────────────────────────────
            health: {
                cacheHitPct: parseFloat(cacheHitPct),
                commitPct: parseFloat(commitPct),
                deadlocks: parseInt(db.deadlocks || '0'),
                conflicts: parseInt(db.conflicts || '0'),
                rollbacks: parseInt(db.xact_rollback || '0'),
                tempFiles: parseInt(db.temp_files || '0'),
                tempBytes: parseInt(db.temp_bytes || '0'),
            },

            // ── Operaciones acumuladas ───────────────────────────────────────
            writes: [
                { name: 'Lecturas', count: parseInt(db.tup_returned || '0') },
                { name: 'Inserciones', count: parseInt(db.tup_inserted || '0') },
                { name: 'Actualizaciones', count: parseInt(db.tup_updated || '0') },
                { name: 'Eliminaciones', count: parseInt(db.tup_deleted || '0') },
            ],

            // ── Cache hit ratio ──────────────────────────────────────────────
            cache: [
                { name: 'RAM (Caché)', count: parseInt(db.blks_hit || '0') },
                { name: 'Disco', count: parseInt(db.blks_read || '0') },
            ],

            // ── Índices ──────────────────────────────────────────────────────
            indexes: [
                { name: 'Con índice', count: parseInt(db.blks_hit || '0') },
                { name: 'Sin índice', count: parseInt(db.blks_read || '0') },
            ],

            // ── Top tablas por tamaño ────────────────────────────────────────
            topTables: tablesRes.rows.map(r => ({
                name: r.table_name,
                size: r.total_size,
                sizeBytes: parseInt(r.size_bytes || '0'),
                rows: parseInt(r.row_count || '0'),
                deadRows: parseInt(r.dead_rows || '0'),
                lastVacuum: r.last_autovacuum,
                lastAnalyze: r.last_autoanalyze,
            })),

            // ── Uso de índices por tabla ─────────────────────────────────────
            indexUsage: slowRes.rows.map(r => ({
                name: r.table_name,
                seqScans: parseInt(r.seq_scan || '0'),
                idxScans: parseInt(r.idx_scan || '0'),
                indexUsagePct: parseFloat(r.index_usage_pct || '0'),
                rows: parseInt(r.rows || '0'),
            })),

            // ── Conexiones por estado ────────────────────────────────────────
            connectionsByState: connRes.rows.map(r => ({
                state: r.state,
                count: parseInt(r.count || '0'),
            })),

            // ── Schemas ──────────────────────────────────────────────────────
            schemas: schemaRes.rows.map(r => ({
                name: r.schemaname,
                tables: parseInt(r.table_count || '0'),
                rows: parseInt(r.total_rows || '0'),
            })),

            // ── Escrituras por tabla ─────────────────────────────────────────
            writeByTable: writeRes.rows.map(r => ({
                name: r.table_name,
                inserts: parseInt(r.inserts || '0'),
                updates: parseInt(r.updates || '0'),
                deletes: parseInt(r.deletes || '0'),
                total: parseInt(r.total_writes || '0'),
            })),
        });

    } catch (error) {
        console.error('🚨 ERROR SQL EN STATS:', error);
        res.status(200).json({
            server: { status: 'Modo Seguro', activeConnections: 0, totalConnections: 0, sizeFormatted: 'N/A', sizeBytes: 0, version: 'PostgreSQL' },
            health: { cacheHitPct: 0, commitPct: 0, deadlocks: 0, conflicts: 0, rollbacks: 0, tempFiles: 0, tempBytes: 0 },
            writes: [],
            cache: [],
            indexes: [],
            topTables: [],
            indexUsage: [],
            connectionsByState: [],
            schemas: [],
            writeByTable: [],
        });
    }
};