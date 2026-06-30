// src/routes/backups.routes.ts
import { Router } from 'express';
import { 
    createBackup, 
    listBackups, 
    deleteBackup, 
    downloadBackup, 
    configureAutoBackup,
    forceCleanup,
    getSettingsAndLogs
} from '../controllers/backups.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// ⚙️ RUTAS DE CONFIGURACIÓN Y LOGS (NUEVAS)
// ==========================================

// 0. OBTENER CONFIGURACIÓN: Trae la configuración de RAM, espacio ocupado y logs
router.get('/settings', verifyToken, isAdmin, getSettingsAndLogs);

// ==========================================
// 🗄️ RUTAS CRUD DE RESPALDOS
// ==========================================

// 1. LISTAR: Trae los respaldos (manuales y automáticos) desde Cloudinary
router.get('/', verifyToken, isAdmin, listBackups);

// 2. CREAR MANUAL: Se ejecuta cuando presionas el botón en tu página
router.post('/', verifyToken, isAdmin, createBackup);

// 3. ELIMINAR: Borra un archivo específico (recibe ?public_id=...)
router.delete('/', verifyToken, isAdmin, deleteBackup);

// 4. DESCARGAR: Ruta segura para descargar el archivo
router.get('/download', verifyToken, isAdmin, downloadBackup);

// ==========================================
// 🤖 RUTAS DE RESPALDO AUTOMÁTICO
// ==========================================

// 5. PROGRAMAR AUTOMÁTICO: Recibe la configuración desde el Frontend para node-cron
router.post('/schedule', verifyToken, isAdmin, configureAutoBackup);

// 6. AUTO-LIMPIEZA FORZADA: Botón de emergencia para borrar respaldos viejos
router.post('/cleanup', verifyToken, isAdmin, forceCleanup);

export default router;