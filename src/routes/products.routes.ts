// src/routes/products.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { 
    getProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    getActiveProducts,
    toggleProductStatus,
    importProductsCSV
} from '../controllers/products.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Configuramos Multer para guardar archivos en la memoria temporal (RAM)
const upload = multer({ storage: multer.memoryStorage() });

// RUTAS GENERALES
router.get('/', getProducts);
router.get('/active', getActiveProducts);

// RUTAS ADMIN
// Importante: /import/csv va antes de /:id para que Express no se confunda
router.post('/import/csv', verifyToken, isAdmin, upload.single('file'), importProductsCSV);

// Rutas con subida de imagen (upload.single('image'))
router.post('/', verifyToken, isAdmin, upload.single('image'), createProduct);
router.put('/:id', verifyToken, isAdmin, upload.single('image'), updateProduct);

router.get('/:id', getProductById);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);
router.patch('/:id/toggle', verifyToken, isAdmin, toggleProductStatus);

export default router;