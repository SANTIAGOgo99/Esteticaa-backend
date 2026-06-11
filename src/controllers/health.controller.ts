import { Request, Response } from 'express';
import pool from '../config/db';

export const getPing = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            status: 'OK', 
            message: 'Servidor Estética funcionando correctamente 🚀', 
            db_time: result.rows[0].now,
            server_port: process.env.PORT || 3000
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al conectar con la base de datos' });
    }
};