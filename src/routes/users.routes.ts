import { Router } from 'express';
import { getProfile, getAllUsers, updateUserByAdmin, toggleUserStatus } from '../controllers/users.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware'; // Asegúrate de importar isAdmin

const router = Router();

// Ruta para el cliente (Mi Perfil)
router.get('/profile', verifyToken, getProfile);

// NUEVA RUTA: Solo el Admin puede ver todos los usuarios
router.get('/', verifyToken, isAdmin, getAllUsers);
router.put('/:id', verifyToken, isAdmin, updateUserByAdmin);
router.patch('/:id/toggle-status', verifyToken, isAdmin, toggleUserStatus);

export default router;
