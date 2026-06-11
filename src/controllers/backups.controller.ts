// src/controllers/backups.controller.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pool from '../config/db';
import { spawn } from 'child_process'; // NUEVO: Para ejecutar pg_dump nativo
import cron, { ScheduledTask } from 'node-cron'; 

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🌟 ESTADO EN MEMORIA RAM
let tareaRespaldoAutomatica: ScheduledTask | null = null;
let configRespaldo = { hora: '23:00', diasRetencion: 5, activo: false, frecuencia: 'diario', customFrecuencia: 2 };

// 🌟 LOGS
const logActivity = async (type: string, description: string) => {
    try {
        await pool.query(
            'INSERT INTO operations.backup_logs (event_type, description) VALUES ($1, $2)',
            [type, description]
        );
    } catch (e) {
        console.error("Error guardando log:", e);
    }
};

// 🌟 GENERAR RESPALDO NATIVO (.backup)
const generateAndUploadBackup = async (folderName: string, options: { customName?: string, tables?: string[] } = {}): Promise<string> => {
    const { customName, tables } = options;

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
    const baseName = customName && customName.trim() !== '' 
        ? customName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') 
        : 'backup';

    // CAMBIO 1: La extensión ahora es .backup (Formato Custom de PostgreSQL)
    const fileName = `${baseName}_${dateStr}.backup`;

    return new Promise((resolve, reject) => {
        // CAMBIO 2: Obtenemos la URL de la base de datos de tus variables de entorno
        let dbUrl = process.env.DATABASE_URL;
        
        // Si no tienes DATABASE_URL, intentamos armarla con las variables clásicas
        if (!dbUrl) {
            const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
            if (DB_USER && DB_PASSWORD && DB_HOST && DB_NAME) {
                dbUrl = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;
            } else {
                return reject(new Error("No se encontraron las credenciales de BD en el .env"));
            }
        }

        // CAMBIO 3: Opciones para pg_dump: -F c (Custom format) es el aceptado por DBeaver
        const args = [dbUrl, '-F', 'c'];

        if (tables && tables.length > 0 && tables[0] !== 'all') {
            for (const t of tables) {
                args.push('-t', t);
            }
        }

        // Ejecutamos la herramienta nativa de PostgreSQL
        const pgDump = spawn('pg_dump', args);

        // Preparamos la subida a Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', folder: folderName, public_id: fileName, format: '' },
            (error, result) => {
                if (error || !result) reject(error);
                else resolve(result.secure_url);
            }
        );

        // Conectamos la salida de pg_dump DIRECTAMENTE a Cloudinary (Streming)
        pgDump.stdout.pipe(uploadStream);

        pgDump.stderr.on('data', (data) => {
            console.log(`pg_dump info: ${data}`);
        });

        pgDump.on('error', (err) => {
            console.error('Error ejecutando pg_dump. Verifica que PostgreSQL esté instalado.', err);
            reject(err);
        });

        pgDump.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`pg_dump falló con código ${code}`));
            }
        });
    });
};

const toDownloadUrl = (secureUrl: string): string => secureUrl.replace('/upload/', '/upload/fl_attachment/');

// 1. OBTENER CONFIGURACIÓN Y LOGS
export const getSettingsAndLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await cloudinary.api.resources({ type: 'upload', resource_type: 'raw', prefix: 'estetica_backups/', max_results: 100 });
        const totalBytes = result.resources.reduce((acc: number, file: Record<string, unknown>) => acc + Number(file.bytes || 0), 0);
        const spaceUsed = totalBytes < 1048576 ? (totalBytes / 1024).toFixed(2) + ' KB' : (totalBytes / 1024 / 1024).toFixed(2) + ' MB';

        const logsRes = await pool.query(`
            SELECT id, event_type, description, 
                   to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at 
            FROM operations.backup_logs 
            ORDER BY id DESC LIMIT 20
        `);

        res.json({ config: configRespaldo, spaceUsed, logs: logsRes.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener configuraciones.' });
    }
};

// 2. CREAR MANUAL
export const createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customName, tables } = req.body;
        const url = await generateAndUploadBackup('estetica_backups/manuales', { customName, tables });
        await logActivity('MANUAL', `Respaldo manual creado: ${customName || 'Generado Automáticamente'}`);
        res.status(201).json({ message: 'Respaldo manual creado', url: toDownloadUrl(url) });
    } catch (error) {
        await logActivity('ERROR', 'Fallo al intentar crear un respaldo manual.');
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

// 3. LIMPIEZA
const ejecutarLimpieza = async (dias: number): Promise<number> => {
    const result = await cloudinary.search.expression('folder:estetica_backups/*').execute();
    const limiteMs = dias * 24 * 60 * 60 * 1000;
    const ahora = new Date().getTime();
    let borrados = 0;
    
    for (const file of result.resources) {
        if (ahora - new Date(file.created_at).getTime() > limiteMs) {
            await cloudinary.uploader.destroy(file.public_id, { resource_type: 'raw' });
            borrados++;
        }
    }
    return borrados;
};

export const forceCleanup = async (req: Request, res: Response): Promise<void> => {
    try {
        const borrados = await ejecutarLimpieza(configRespaldo.diasRetencion);
        await logActivity('CLEANUP', `Limpieza forzada. Se eliminaron ${borrados} archivos viejos.`);
        res.json({ message: `Se borraron ${borrados} respaldos viejos.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al limpiar.' });
    }
};

// 4. CONFIGURAR AUTOMÁTICO
export const configureAutoBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hora, diasRetencion, activo, frecuencia, customFrecuencia } = req.body; 
        
        configRespaldo = { 
            hora, 
            diasRetencion: Number(diasRetencion), 
            activo: Boolean(activo),
            frecuencia: frecuencia || 'diario',
            customFrecuencia: Number(customFrecuencia) || 2
        };

        if (tareaRespaldoAutomatica) tareaRespaldoAutomatica.stop();

        if (configRespaldo.activo) {
            const [horas, minutos] = hora.split(':');
            let cronExpression = `${minutos} ${horas} * * *`;

            if (configRespaldo.frecuencia === 'semanal') {
                cronExpression = `${minutos} ${horas} * * 0`; 
            } else if (configRespaldo.frecuencia === 'mensual') {
                cronExpression = `${minutos} ${horas} 1 * *`; 
            } else if (configRespaldo.frecuencia === 'otro') {
                cronExpression = `${minutos} ${horas} */${configRespaldo.customFrecuencia} * *`; 
            }
            
            tareaRespaldoAutomatica = cron.schedule(cronExpression, async () => {
                try {
                    await generateAndUploadBackup('estetica_backups/automaticos', { customName: 'Respaldo_Automatico' });
                    const borrados = await ejecutarLimpieza(configRespaldo.diasRetencion);
                    await logActivity('AUTO', `Respaldo automático exitoso. Limpieza: ${borrados} borrados.`);
                } catch (err) { 
                    await logActivity('ERROR', 'Fallo respaldo automático.');
                    console.error(err); 
                }
            });
            
            const frecLabel = configRespaldo.frecuencia === 'otro' ? `cada ${configRespaldo.customFrecuencia} días` : configRespaldo.frecuencia;
            await logActivity('CONFIG', `Motor activado: ${frecLabel} a las ${hora} hrs (${diasRetencion} días ret.).`);
        } else {
            await logActivity('CONFIG', 'Respaldo automático pausado.');
        }

        res.status(200).json({ message: 'Configuración actualizada.' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Error al programar.' }); 
    }
};

// 5. LISTAR
export const listBackups = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await cloudinary.api.resources({ type: 'upload', resource_type: 'raw', prefix: 'estetica_backups/', max_results: 100 });

        const backups = result.resources.map((file: Record<string, unknown>) => {
            const bytes = Number(file.bytes || 0);
            return {
                fileName: String(file.public_id).split('/').pop(),
                public_id: String(file.public_id),
                url: toDownloadUrl(String(file.secure_url)),
                size: bytes < 1048576 ? (bytes / 1024).toFixed(2) + ' KB' : (bytes / 1024 / 1024).toFixed(2) + ' MB',
                createdAt: String(file.created_at),
                type: String(file.public_id).includes('manuales') ? 'Manual' : 'Automático'
            };
        });

        backups.sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
            new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
        );
        res.json(backups);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Error al listar' }); 
    }
};

// 6. ELIMINAR
export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const publicId = req.query.public_id as string;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        await logActivity('CLEANUP', `Archivo eliminado: ${publicId.split('/').pop()}`);
        res.json({ message: 'Respaldo eliminado.' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar.' }); 
    }
};

// 7. DESCARGAR
export const downloadBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const publicId = req.query.public_id as string;
        const signedUrl = cloudinary.utils.private_download_url(publicId, '', {
            resource_type: 'raw', type: 'upload', attachment: true, expires_at: Math.floor(Date.now() / 1000) + 300
        });
        res.redirect(signedUrl);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Error enlace.' }); 
    }
};