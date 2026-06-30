import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

const passwordPolicy = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const register = async (req: Request, res: Response) => {
    const fullName = String(req.body?.full_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '').trim();

    if (fullName.length < 3) {
        return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Correo electronico invalido' });
    }

    if (!passwordPolicy.test(password)) {
        return res.status(400).json({
            error: 'La contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial',
        });
    }

    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
        return res.status(400).json({ error: 'Telefono invalido' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO auth.users (full_name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'client')
             RETURNING id, full_name, email, role`,
            [fullName, email, hashedPassword, phone]
        );

        res.status(201).json({ message: 'Usuario registrado', user: result.rows[0] });
    } catch (error: any) {
        console.error('ERROR AL REGISTRAR:', error);

        if (error.code === '23505') {
            return res.status(400).json({ error: 'El correo ya esta registrado' });
        }

        res.status(500).json({ error: 'Error del servidor al registrar usuario' });
    }
};

export const login = async (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    try {
        const result = await pool.query('SELECT * FROM auth.users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({
                error: 'Tu cuenta ha sido suspendida. Por favor, contacta a la administracion de la estetica.',
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(400).json({ error: 'Contrasena incorrecta' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Configuracion de seguridad incompleta.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ message: 'Bienvenido', token, role: user.role });
    } catch (error) {
        console.error('ERROR AL INICIAR SESION:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
