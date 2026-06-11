import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Definimos la forma de los datos dentro del token
interface UserPayload {
    id: number;
    role: string;
    email: string;
}

export interface AuthRequest extends Request {
    user?: UserPayload;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(403).json({ error: 'Acceso denegado. Se requiere token.' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        req.user = verified;
        next();
    } catch (error) {
        console.error("JWT Error:", error);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Verificamos que exista el usuario y que sea admin
    if (!req.user || req.user.role !== 'admin') { 
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' }); 
    }
    next();
};