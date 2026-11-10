import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { createRegisterHandler } from '../handlers/register';

export const register = createRegisterHandler({
    query: (sql, values) => pool.query(sql, values),
    hashPassword: password => bcrypt.hash(password, 10),
    reportFailure: code => console.error('Error al registrar cliente', { code }),
});

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        // 1. Buscar usuario
        // FIX: Cambiamos 'users' por 'auth.users'
        const result = await pool.query('SELECT * FROM auth.users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];

        // ==========================================
        // 🚨 NUEVA SEGURIDAD: VERIFICACIÓN DE BANEO
        // ==========================================
        if (user.is_active === false) {
            return res.status(403).json({ 
                error: 'Tu cuenta ha sido suspendida. Por favor, contacta a la administración de la estética.' 
            });
        }

        // 2. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Contraseña incorrecta' });

        // 3. Generar Token (Llave digital)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET as string, 
            { expiresIn: '1d' }
        );

        res.json({ message: 'Bienvenido', token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
};
