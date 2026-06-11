// src/controllers/services.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = (fileBuffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'estetica_servicios', transformation: [{ fetch_format: 'auto', quality: 'auto' }] },
            (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

export const getServices = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM operations.services ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los servicios' });
    }
};

export const getActiveServices = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM operations.services WHERE is_active = TRUE ORDER BY category ASC, name ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener servicios activos' });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM operations.services WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el servicio' });
    }
};

// ✨ CREAR (Ahora con Categoría)
export const createService = async (req: Request, res: Response): Promise<void> => {
    const { name, description, duration_minutes, price, category } = req.body;
    try {
        let imageUrl = '';
        if (req.file) imageUrl = await uploadImageToCloudinary(req.file.buffer);

        const result = await pool.query(
            `INSERT INTO operations.services (name, description, duration_minutes, price, category, image_url, is_active) 
            VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
            [name, description, duration_minutes, price, category || 'General', imageUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error crear servicio:", error);
        res.status(500).json({ error: 'Error al crear' });
    }
};

// 🔄 ACTUALIZAR (Ahora con Categoría)
export const updateService = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, duration_minutes, price, category } = req.body;
    
    try {
        let updateQuery = `UPDATE operations.services SET name=$1, description=$2, duration_minutes=$3, price=$4, category=$5`;
        let queryParams: any[] = [name, description, duration_minutes, price, category || 'General'];

        if (req.file) {
            const newImageUrl = await uploadImageToCloudinary(req.file.buffer);
            updateQuery += `, image_url=$6 WHERE id=$7 RETURNING *`;
            queryParams.push(newImageUrl, id);
        } else {
            updateQuery += ` WHERE id=$6 RETURNING *`;
            queryParams.push(id);
        }

        const result = await pool.query(updateQuery, queryParams);
        if (result.rows.length === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar' });
    }
};

export const toggleServiceStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE operations.services SET is_active = NOT is_active WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
        res.json({ message: 'Estado actualizado', service: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar el estado' });
    }
};