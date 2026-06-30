// src/controllers/users.controller.ts
import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware'; 

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const result = await pool.query(
            'SELECT id, full_name, email, phone, role, is_active FROM auth.users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("🔥 ERROR OBTENIENDO PERFIL:", error);
        res.status(500).json({ error: 'Error del servidor al obtener perfil' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const cleanName = String(req.body?.full_name || '').trim();
    const cleanPhone = String(req.body?.phone || '').trim();

    if (!userId) {
        return res.status(401).json({ error: 'No se pudo identificar al usuario' });
    }

    if (!cleanName || cleanName.length < 3) {
        return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
    }

    if (cleanPhone && !/^[0-9+\-\s()]{7,20}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'El telefono no tiene un formato valido' });
    }

    try {
        const result = await pool.query(
            `UPDATE auth.users
             SET full_name = $1,
                 phone = $2
             WHERE id = $3
             RETURNING id, full_name, email, phone, role, is_active`,
            [cleanName, cleanPhone, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Perfil actualizado correctamente',
            user: result.rows[0],
        });
    } catch (error) {
        console.error("ðŸ”¥ ERROR ACTUALIZANDO PERFIL:", error);
        res.status(500).json({ error: 'Error del servidor al actualizar perfil' });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, email, phone, role, is_active, 
                   TO_CHAR(created_at, 'YYYY-MM-DD') as fecha_registro 
            FROM auth.users 
            ORDER BY id DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("🔥 ERROR OBTENIENDO USUARIOS:", error);
        res.status(500).json({ error: 'Error del servidor al obtener usuarios' });
    }
};

export const updateUserByAdmin = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { full_name, email, phone, role, is_active } = req.body;

    const allowedRoles = ['admin', 'employee', 'client'];
    const cleanName = String(full_name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const isActiveValue = typeof is_active === 'boolean' ? is_active : String(is_active) === 'true';

    if (!cleanName || !cleanEmail) {
        return res.status(400).json({ error: 'El nombre y correo son obligatorios' });
    }

    if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rol no permitido' });
    }

    if (req.user?.id === parseInt(String(id), 10) && !isActiveValue) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    try {
        const result = await pool.query(
            `UPDATE auth.users
             SET full_name = $1,
                 email = $2,
                 phone = $3,
                 role = $4,
                 is_active = $5
             WHERE id = $6
             RETURNING id, full_name, email, phone, role, is_active,
                       TO_CHAR(created_at, 'YYYY-MM-DD') as fecha_registro`,
            [
                cleanName,
                cleanEmail,
                cleanPhone,
                role || 'client',
                isActiveValue,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado correctamente', user: result.rows[0] });
    } catch (error: any) {
        console.error("ðŸ”¥ ERROR ACTUALIZANDO USUARIO:", error);

        if (error.code === '23505') {
            return res.status(400).json({ error: 'El correo ya está registrado por otro usuario' });
        }

        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    // FIX TYPESCRIPT DEFINITIVO: Convertimos a String explícitamente
    if (req.user?.id === parseInt(String(id), 10)) {
        return res.status(400).json({ error: 'No puedes bloquear tu propia cuenta' });
    }

    try {
        const result = await pool.query(
            'UPDATE auth.users SET is_active = NOT is_active WHERE id = $1 RETURNING id, full_name, is_active', 
            [id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        const nuevoEstado = result.rows[0].is_active ? 'desbloqueado' : 'bloqueado';
        res.json({ message: `Usuario ${nuevoEstado} correctamente`, user: result.rows[0] });
    } catch (error) {
        console.error("🔥 ERROR AL BLOQUEAR/DESBLOQUEAR USUARIO:", error);
        res.status(500).json({ error: 'Error al cambiar el estado del usuario' });
    }
};
