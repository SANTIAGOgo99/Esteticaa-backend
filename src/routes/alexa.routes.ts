import { Router } from 'express';
import {
  askAlexaAssistant,
  getAlexaCatalog,
} from '../controllers/alexa.controller';
import { getAlexaDurationSlots } from '../controllers/alexaAgenda.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/catalog', getAlexaCatalog);
router.get('/slots', verifyToken, getAlexaDurationSlots);
router.post('/assistant', askAlexaAssistant);

export default router;
