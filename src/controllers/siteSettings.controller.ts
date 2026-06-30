import { Request, Response } from 'express';
import pool from '../config/db';

const DEFAULT_SETTINGS: Record<string, string> = {
    terms_text:
        'Terminos y Condiciones\n\nInformacion General: Ezequiel Castillo Angeles Hair Designer.\n\nDomicilio: Velazquez Ibarra 22, colonia Centro, Huejutla, Hidalgo, C.P. 43011, Mexico.\n\nPara confirmar una cita, la estetica puede solicitar un anticipo. Los servicios, productos, garantias y responsabilidades se informan al cliente antes de finalizar cualquier compra o reservacion.',
    privacy_text:
        'Politica de Privacidad\n\nEzequiel Castillo Hair Designer es responsable del uso y proteccion de los datos personales proporcionados por sus clientes.\n\nLos datos se utilizan para agendar citas, confirmar servicios, dar seguimiento a compras, enviar avisos importantes y mejorar la atencion al cliente.',
    cancellation_text:
        'Politica de Cancelacion\n\nLas citas pueden reprogramarse avisando con anticipacion. En cancelaciones de ultimo momento o inasistencias, la estetica puede retener el anticipo o aplicar condiciones especiales segun el servicio reservado.\n\nLos productos de cuidado personal abiertos o usados no aplican para devolucion salvo defecto de fabricacion.',
    business_address: 'Velazquez Ibarra 22, Centro, Huejutla, Hgo. C.P. 43011',
    phone_primary: '771 202 8110',
    phone_secondary: '771 342 5696',
    business_hours_weekdays: 'Lunes a Viernes: 11:00 - 19:00 h',
    business_hours_saturday: 'Sabados: 11:00 - 15:00 h',
    location_description:
        'Un espacio disenado para la relajacion y el cuidado personal. Ven y descubre el lujo en cada detalle, ubicado en el corazon de Huejutla.',
    instagram_url: 'https://www.instagram.com/ezequielcastillohairdesigner/',
    facebook_url: 'https://www.facebook.com/EzequielCastilloAngeles',
};

const EDITABLE_KEYS = Object.keys(DEFAULT_SETTINGS);

const buildMapEmbedUrl = (address: string) => {
    const query = encodeURIComponent(address || DEFAULT_SETTINGS.business_address);
    return `https://www.google.com/maps?q=${query}&output=embed`;
};

const ensureSettingsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.site_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await pool.query(
            `INSERT INTO public.site_settings (setting_key, setting_value)
             VALUES ($1, $2)
             ON CONFLICT (setting_key) DO NOTHING`,
            [key, value]
        );
    }
};

const readSettings = async () => {
    await ensureSettingsTable();

    const result = await pool.query(
        'SELECT setting_key, setting_value FROM public.site_settings'
    );

    const settings = { ...DEFAULT_SETTINGS };

    for (const row of result.rows) {
        if (row.setting_key in settings) {
            settings[row.setting_key] = row.setting_value;
        }
    }

    return {
        ...settings,
        map_embed_url: buildMapEmbedUrl(settings.business_address),
        updated_at: new Date().toISOString(),
    };
};

export const getPublicSiteSettings = async (_req: Request, res: Response) => {
    try {
        const settings = await readSettings();
        res.json(settings);
    } catch (error) {
        console.error('ERROR OBTENIENDO CONFIGURACION PUBLICA:', error);
        res.status(500).json({ error: 'Error al obtener configuracion del sitio' });
    }
};

export const getAdminSiteSettings = async (_req: Request, res: Response) => {
    try {
        const settings = await readSettings();
        res.json(settings);
    } catch (error) {
        console.error('ERROR OBTENIENDO CONFIGURACION ADMIN:', error);
        res.status(500).json({ error: 'Error al obtener configuracion del sitio' });
    }
};

export const updateSiteSettings = async (req: Request, res: Response) => {
    const entries = Object.entries(req.body || {}).filter(([key]) =>
        EDITABLE_KEYS.includes(key)
    );

    if (entries.length === 0) {
        return res.status(400).json({ error: 'No hay campos validos para actualizar' });
    }

    const validatedEntries: [string, string][] = [];

    for (const [key, value] of entries) {
        if (typeof value !== 'string') {
            return res.status(400).json({ error: `El campo ${key} debe ser texto` });
        }

        if (value.length > 20000) {
            return res.status(400).json({ error: `El campo ${key} es demasiado largo` });
        }

        validatedEntries.push([key, value]);
    }

    try {
        await ensureSettingsTable();

        for (const [key, value] of validatedEntries) {
            await pool.query(
                `INSERT INTO public.site_settings (setting_key, setting_value, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (setting_key)
                 DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
                [key, value.trim()]
            );
        }

        const settings = await readSettings();
        res.json({ message: 'Configuracion actualizada correctamente', settings });
    } catch (error) {
        console.error('ERROR ACTUALIZANDO CONFIGURACION:', error);
        res.status(500).json({ error: 'Error al actualizar configuracion del sitio' });
    }
};
