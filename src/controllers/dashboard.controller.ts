// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const counts = { usuarios: 0, productos: 0, servicios: 0, citas: 0 };

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

        // 4. Contar Citas
        try {
            const c = await pool.query('SELECT COUNT(*) FROM operations.appointments');
            counts.citas = parseInt(c.rows[0].count);
        } catch (e: any) { console.log("Info: Tabla citas no encontrada o error:", e.message); }

        res.json(counts);
    } catch (error) {
        console.error("Error crítico obteniendo resumen:", error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
};