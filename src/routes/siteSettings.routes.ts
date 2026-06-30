import { Router } from 'express';
import {
    getAdminSiteSettings,
    getPublicSiteSettings,
    updateSiteSettings,
} from '../controllers/siteSettings.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/public', getPublicSiteSettings);
router.get('/', verifyToken, isAdmin, getAdminSiteSettings);
router.put('/', verifyToken, isAdmin, updateSiteSettings);

export default router;
