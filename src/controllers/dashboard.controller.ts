// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const counts = {
            usuarios: 0,
            productos: 0,
            servicios: 0,
            citas: 0,
            citas_completadas: 0,
            citas_por_cerrar: 0,
            citas_no_show: 0,
            ingresos_servicios: 0,
        };

        // 1. Contar Usuarios (Ajusta 'auth.users' si tu tabla se llama diferente)
        try {
            const u = await pool.query('SELECT COUNT(*) FROM auth.users');
            counts.usuarios = parseInt(u.rows[0].count);
        } catch (e: any) { console.log("Info: Tabla usuarios no encontrada o error:", e.message); }

        // 2. Contar Productos (Ajusta 'inventory.products' si es diferente)
        try {
            const p = await pool.query('SELECT COUNT(*) FROM inventory.products');
            counts.productos = parseInt(p.rows[0].count);
        } catch (e: any) { console.log("Info: Tabla productos no encontrada o error:", e.message); }

        // 3. Contar Servicios (Esta sabemos que sí es operations.services)
        try {
            const s = await pool.query('SELECT COUNT(*) FROM operations.services');
            counts.servicios = parseInt(s.rows[0].count);
        } catch (e: any) { console.log("Info: Tabla servicios no encontrada o error:", e.message); }

        // 4. Contar Citas y generar metricas para reportes
        try {
            const c = await pool.query(`
                SELECT
                    COUNT(a.id)::int AS total,
                    COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed,
                    COUNT(a.id) FILTER (WHERE a.status = 'no_show')::int AS no_show,
                    COUNT(a.id) FILTER (
                        WHERE a.status IN ('pending', 'confirmed')
                        AND NOW() >= (
                            a.appointment_date +
                            (COALESCE(s.duration_minutes, 0) || ' minutes')::interval
                        )
                    )::int AS pending_review,
                    COALESCE(SUM(
                        CASE
                            WHEN a.status = 'completed' THEN COALESCE(a.total_amount, 0)
                            ELSE 0
                        END
                    ), 0)::numeric AS service_revenue
                FROM operations.appointments a
                LEFT JOIN operations.services s ON s.id = a.service_id
            `);

            counts.citas = Number(c.rows[0].total || 0);
            counts.citas_completadas = Number(c.rows[0].completed || 0);
            counts.citas_no_show = Number(c.rows[0].no_show || 0);
            counts.citas_por_cerrar = Number(c.rows[0].pending_review || 0);
            counts.ingresos_servicios = Number(c.rows[0].service_revenue || 0);
        } catch (e: any) { console.log("Info: Tabla citas no encontrada o error:", e.message); }

        res.json(counts);
    } catch (error) {
        console.error("Error crítico obteniendo resumen:", error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
};
