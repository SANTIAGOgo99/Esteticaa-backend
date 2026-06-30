import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

interface UserPayload {
    id: number;
    role: string;
    email?: string;
}

export interface AuthRequest extends Request {
    user?: UserPayload;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const [scheme, token] = authHeader?.split(' ') || [];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Acceso denegado. Se requiere token.' });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: 'Configuracion de seguridad incompleta.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET) as UserPayload;

        const result = await pool.query(
            'SELECT id, email, role, is_active FROM auth.users WHERE id = $1',
            [verified.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado o sesion invalida.' });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ error: 'Cuenta suspendida. Contacta a la administracion.' });
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        console.error('JWT Error:', error);
        res.status(401).json({ error: 'Token invalido o expirado' });
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acceso denegado. No tienes permisos suficientes.' });
        }

        next();
    };
};

export const isAdmin = requireRole('admin');
