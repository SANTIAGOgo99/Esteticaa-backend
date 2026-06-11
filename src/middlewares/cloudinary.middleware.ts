// src/controllers/backups.controller.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import pool from '../config/db';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🛠️ FUNCIÓN AUXILIAR: Extrae la base de datos y la sube a la carpeta que le pidas
const generateAndUploadBackup = async (folderName: string) => {
    const tablesRes = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';");
    const backupData: any = {};

    for (const row of tablesRes.rows) {
        const tableName = row.tablename;
        const dataRes = await pool.query(`SELECT * FROM "${tableName}"`);
        backupData[tableName] = dataRes.rows;
    }

    const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_${dateStr}.json`; 

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', folder: folderName, public_id: fileName },
            (error: any, result: any) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

// 1. CREAR MANUAL (Botón de tu panel) -> Carpeta: manuales
export const createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const uploadResult: any = await generateAndUploadBackup('estetica_backups/manuales');
        res.status(201).json({ 
            message: 'Respaldo manual creado con éxito ☁️', 
            url: uploadResult.secure_url 
        });
    } catch (error) {
        console.error("Error creando backup manual:", error);
        res.status(500).json({ message: 'Error interno al generar el respaldo.' });
    }
};

// 2. CREAR AUTOMÁTICO (El sistema lo llama solo) -> Carpeta: automaticos
export const createAutoBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const uploadResult: any = await generateAndUploadBackup('estetica_backups/automaticos');
        res.status(201).json({ 
            message: 'Respaldo automático creado en la nube 🤖', 
            url: uploadResult.secure_url 
        });
    } catch (error) {
        console.error("Error creando backup automático:", error);
        res.status(500).json({ message: 'Error en respaldo automático.' });
    }
};

// 3. LISTAR AMBOS TIPOS
export const listBackups = async (req: Request, res: Response): Promise<void> => {
    try {
        // Busca en todas las subcarpetas dentro de estetica_backups
        const result = await cloudinary.search
            .expression('folder:estetica_backups/*')
            .sort_by('created_at', 'desc')
            .execute();

        const backups = result.resources.map((file: any) => {
            // Sabemos si es manual o automático por el nombre de la carpeta
            const type = file.folder.includes('manuales') ? 'Manual' : 'Automático';
            return {
                fileName: file.public_id.split('/').pop(), // Solo el nombre del archivo
                public_id: file.public_id, 
                url: file.secure_url,
                size: (file.bytes / 1024 / 1024).toFixed(2) + ' MB',
                createdAt: file.created_at,
                type: type // 🌟 Nuevo dato para que lo muestres en tu tabla
            };
        });

        res.json(backups);
    } catch (error) {
        console.error("Error al listar:", error);
        res.status(500).json({ message: 'Error al listar los respaldos' });
    }
};

// 4. ELIMINAR MANUALMENTE
export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
    try {
        const publicId = req.query.public_id as string; 
        if (!publicId) return;

        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        res.json({ message: 'Respaldo eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar.' });
    }
};

// 5. AUTO-LIMPIEZA (Borra de ambas carpetas los mayores a 7 días)
export const autoCleanupBackups = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await cloudinary.search.expression('folder:estetica_backups/*').execute();
        const sieteDiasMs = 7 * 24 * 60 * 60 * 1000;
        const ahora = new Date().getTime();
        let borrados = 0;

        for (const file of result.resources) {
            if (ahora - new Date(file.created_at).getTime() > sieteDiasMs) {
                await cloudinary.uploader.destroy(file.public_id, { resource_type: 'raw' });
                borrados++;
            }
        }
        res.json({ message: `Se borraron ${borrados} respaldos viejos.` });
    } catch (error) {
        res.status(500).json({ message: 'Error al limpiar.' });
    }
};