import { Router } from 'express';
import {
  askAlexaAssistant,
  getAlexaCatalog,
} from '../controllers/alexa.controller';

const router = Router();

router.get('/catalog', getAlexaCatalog);
router.post('/assistant', askAlexaAssistant);

export default router;
