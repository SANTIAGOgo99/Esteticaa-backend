// src/routes/services.routes.ts
import { Router } from 'express';
import multer from 'multer'; // <-- Importamos multer
import { 
    getServices, 
    getActiveServices, 
    getServiceById, 
    createService, 
    updateService, 
    toggleServiceStatus 
} from '../controllers/services.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Configuramos Multer para guardar el archivo en la memoria temporal (RAM)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// RUTAS PÚBLICAS / GENERALES
// ==========================================
router.get('/active', getActiveServices); 
router.get('/', getServices);             
router.get('/:id', getServiceById);

// ==========================================
// RUTAS PROTEGIDAS (Solo Administradores)
// ==========================================

// Usamos upload.single('image') para decirle que espere un archivo llamado 'image' desde el frontend
router.post('/', verifyToken, isAdmin, upload.single('image'), createService);

// Al actualizar, también le permitimos recibir una foto nueva
router.put('/:id', verifyToken, isAdmin, upload.single('image'), updateService);

router.patch('/:id/toggle', verifyToken, isAdmin, toggleServiceStatus);

export default router;