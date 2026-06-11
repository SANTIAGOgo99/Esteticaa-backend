import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

export const register = async (req: Request, res: Response) => {
    const { full_name, email, password, phone, role } = req.body;
    try {
        // 1. Cifrar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Guardar en BD (Por defecto, si no mandan rol, es 'client')
        const userRole = role || 'client'; 
        
        // FIX: Cambiamos 'users' por 'auth.users'
        const result = await pool.query(
            'INSERT INTO auth.users (full_name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role',
            [full_name, email, hashedPassword, phone, userRole]
        );

        res.status(201).json({ message: 'Usuario registrado', user: result.rows[0] });
    } catch (error: any) {
        console.error("❌ ERROR AL REGISTRAR:", error); 
        
        if(error.code === '23505') return res.status(400).json({ error: 'El correo ya está registrado' });
        
        res.status(500).json({ error: 'Error del servidor', detalle: error.message, stack: error });
    }
};

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