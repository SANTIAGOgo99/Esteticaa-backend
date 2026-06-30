import { Request, Response } from 'express';
import pool from '../config/db';
import stream from 'stream';
import csv from 'csv-parser';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🛠️ FUNCIÓN AUXILIAR: Sube la imagen a Cloudinary
const uploadImageToCloudinary = (fileBuffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'estetica_productos', transformation: [{ fetch_format: 'auto', quality: 'auto' }] },
            (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// 🔍 OBTENER TODOS (incluye size)
export const getProducts = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, name, brand, category, price, stock, min_stock, size, image_url, is_active FROM inventory.products ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

// 🛒 OBTENER ACTIVOS (incluye size)
export const getActiveProducts = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, name, brand, category, price, stock, size, image_url FROM inventory.products WHERE is_active = TRUE AND stock > 0 ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener activos' });
    }
};

// 🆔 OBTENER POR ID
export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, name, brand, category, price, stock, min_stock, size, image_url, is_active FROM inventory.products WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener' });
    }
};

// ✨ CREAR (incluye size)
export const createProduct = async (req: Request, res: Response) => {
    const { name, brand, category, price, stock, min_stock, size } = req.body;
    try {
        let imageUrl = null;
        if (req.file) imageUrl = await uploadImageToCloudinary(req.file.buffer);

        const result = await pool.query(
            `INSERT INTO inventory.products (name, brand, category, price, stock, min_stock, size, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, brand, category, price, stock, min_stock, size || null, imageUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear' });
    }
};

// 🔄 ACTUALIZAR (incluye size)
export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, brand, category, price, stock, min_stock, size } = req.body;

    try {
        let query = '';
        let values = [];

        if (req.file) {
            const newImageUrl = await uploadImageToCloudinary(req.file.buffer);
            query = `UPDATE inventory.products
                     SET name=$1, brand=$2, category=$3, price=$4, stock=$5, min_stock=$6, size=$7, image_url=$8
                     WHERE id=$9 RETURNING *`;
            values = [name, brand, category, price, stock, min_stock, size || null, newImageUrl, id];
        } else {
            query = `UPDATE inventory.products
                     SET name=$1, brand=$2, category=$3, price=$4, stock=$5, min_stock=$6, size=$7
                     WHERE id=$8 RETURNING *`;
            values = [name, brand, category, price, stock, min_stock, size || null, id];
        }

        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
};

// 🗑️ ELIMINAR
export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM inventory.products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
};

// 👁️ CAMBIAR ESTADO
export const toggleProductStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE inventory.products SET is_active = NOT is_active WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Estado actualizado', product: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// 📥 IMPORTACIÓN MASIVA INTELIGENTE (con soporte para tamaño)
export const importProductsCSV = async (req: Request, res: Response) => {
    const { action } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No se subió archivo' });

    const fileContent = file.buffer.toString('utf-8');
    const lines = fileContent.split(/\r?\n/);
    const firstLine = lines[0] || '';
    const detectSeparator = firstLine.includes(';') ? ';' : ',';

    const results: any[] = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    bufferStream
        .pipe(csv({
            separator: detectSeparator,
            mapHeaders: ({ header }) => header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/"/g, '')
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const dbRes = await pool.query('SELECT id, name FROM inventory.products');
                const dbProducts = dbRes.rows;

                const nuevos: any[] = [];
                const repetidos: any[] = [];

                for (const row of results) {
                    const nombre = row['nombre'] || row['producto'] || row['articulo'] || row['name'] || '';
                    const id_csv = parseInt(row['id'] || row['id_producto']) || null;

                    if (!nombre) continue;

                    const existe = dbProducts.find(p => p.id === id_csv || p.name.toLowerCase() === nombre.trim().toLowerCase());

                    const rawEstado = (row['estado'] || row['status'] || '').toString().trim().toLowerCase();
                    const isActive = rawEstado === 'activo' || rawEstado === 'true' || rawEstado === '1';

                    const rawPrecio = (row['precio'] || row['price'] || '').toString().replace(/[^0-9.]/g, '');
                    const rawStock = (row['stock'] || row['cantidad'] || row['qty'] || '').toString().replace(/[^0-9]/g, '');

                    // 🌟 TAMAÑO: mapeamos posibles nombres de columna
                    const rawSize = (row['tamaño'] || row['size'] || row['volumen'] || '').toString().trim();

                    const prod = {
                        id: existe?.id || null,
                        name: nombre.trim(),
                        brand: (row['marca'] || row['brand'] || '').trim(),
                        category: (row['categoria'] || row['category'] || '').trim(),
                        price: parseFloat(rawPrecio) || 0,
                        stock: parseInt(rawStock) || 0,
                        size: rawSize || null,
                        is_active: isActive
                    };

                    if (existe) repetidos.push(prod);
                    else nuevos.push(prod);
                }

                if (action === 'preview') return res.json({ nuevos, repetidos });

                for (const n of nuevos) {
                    await pool.query(
                        `INSERT INTO inventory.products (name, brand, category, price, stock, is_active, size)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [n.name, n.brand, n.category, n.price, n.stock, n.is_active, n.size]
                    );
                }

                if (action === 'update') {
                    for (const r of repetidos) {
                        await pool.query(
                            `UPDATE inventory.products
                             SET name=$1, brand=$2, category=$3, price=$4, stock=$5, is_active=$6, size=$7
                             WHERE id=$8`,
                            [r.name, r.brand, r.category, r.price, r.stock, r.is_active, r.size, r.id]
                        );
                    }
                }
                res.json({ message: 'Importación exitosa' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al procesar el archivo CSV' });
            }
        });
};