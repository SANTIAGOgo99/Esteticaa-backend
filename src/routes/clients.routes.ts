import { Router } from 'express';
import {
  createClientNote,
  deleteClientNote,
  getClientById,
  getClients,
  updateClientNote,
} from '../controllers/clients.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyToken, isAdmin, getClients);
router.get('/:id', verifyToken, isAdmin, getClientById);
router.post('/:id/notes', verifyToken, isAdmin, createClientNote);
router.put('/:id/notes/:noteId', verifyToken, isAdmin, updateClientNote);
router.delete('/:id/notes/:noteId', verifyToken, isAdmin, deleteClientNote);

export default router;
