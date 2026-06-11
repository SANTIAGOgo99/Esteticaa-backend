import multer from 'multer';
import path from 'path';

// Configuración de dónde y cómo se guardan las imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Asegúrate de crear esta carpeta en la raíz del backend
    },
    filename: (req, file, cb) => {
        // Renombramos el archivo para que sea único: fecha-nombreoriginal.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });