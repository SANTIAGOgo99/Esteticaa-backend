import { Request, Response } from 'express';
import pool from '../config/db';

const BUSINESS_HOURS_TEXT =
  'Nuestro horario es de lunes a sabado de nueve de la manana a siete de la tarde. Los domingos no abrimos.';

const normalizeText = (value: unknown): string => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const formatMoney = (value: unknown): string => {
  const price = Number(value || 0);
  return Number.isFinite(price) ? price.toFixed(0) : '0';
};

const SERVICE_STOP_WORDS = new Set([
  'servicio',
  'servicios',
  'tratamiento',
  'tratamientos',
  'catalogo',
  'precio',
  'precios',
  'cuanto',
  'cuesta',
  'costo',
  'dura',
  'duracion',
  'tiempo',
  'tienen',
  'ofrecen',
  'dime',
  'informacion',
  'sobre',
  'que',
  'cual',
  'los',
  'las',
  'del',
  'con',
  'para',
  'una',
  'uno',
  'por',
  'de',
  'el',
  'la',
  'y',
]);

const tokenizeServiceText = (value: unknown): string[] => {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !SERVICE_STOP_WORDS.has(token));
};

const getActiveServices = async () => {
  const result = await pool.query(`
    SELECT id, name, description, duration_minutes, price, category, image_url
FROM operations.services
    WHERE is_active = TRUE
    ORDER BY category ASC, name ASC
  `);

  return result.rows;
};

const getActiveProducts = async () => {
  const result = await pool.query(`
    SELECT id, name, brand, category, price, stock, size, image_url
FROM inventory.products
    WHERE is_active = TRUE AND stock > 0
    ORDER BY name ASC
  `);

  return result.rows;
};

const buildServicesAnswer = (services: any[]) => {
  if (!services.length) {
    return 'Por el momento no encontre servicios activos en el catalogo.';
  }

  const list = services
    .slice(0, 8)
    .map((service) => service.name)
    .join(', ');

  return `Estos son nuestros servicios principales: ${list}. Si quieres, preguntame por uno y te digo su costo y duracion.`;
};

const buildServiceDetailAnswer = (service: any) => {
  const duration = service.duration_minutes
    ? ` y dura aproximadamente ${service.duration_minutes} minutos`
    : '';

  return `El servicio ${service.name} cuesta ${formatMoney(service.price)} pesos${duration}.`;
};

const findServiceMatches = (question: string, services: any[]) => {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = new Set(tokenizeServiceText(question));

  return services
    .map((service) => {
      const normalizedName = normalizeText(service.name);
      const searchableText = `${service.name || ''} ${service.category || ''}`;
      const serviceTokens = tokenizeServiceText(searchableText);
      const matchedTokens = serviceTokens.filter((token) => {
        return questionTokens.has(token) || normalizedQuestion.includes(token);
      });

      const exactNameMatch = normalizedName.length > 0 && normalizedQuestion.includes(normalizedName);
      const ratio = serviceTokens.length > 0 ? matchedTokens.length / serviceTokens.length : 0;

      return {
        service,
        exactNameMatch,
        ratio,
        matchedCount: matchedTokens.length,
      };
    })
    .filter((match) => {
      return match.exactNameMatch || match.ratio >= 0.5 || (match.matchedCount > 0 && questionTokens.size <= 3);
    })
    .sort((a, b) => {
      if (a.exactNameMatch !== b.exactNameMatch) return a.exactNameMatch ? -1 : 1;
      if (a.ratio !== b.ratio) return b.ratio - a.ratio;
      return b.matchedCount - a.matchedCount;
    });
};

const buildServiceAnswerForQuestion = (question: string, services: any[]) => {
  const matches = findServiceMatches(question, services);

  if (matches.length === 1) {
    return buildServiceDetailAnswer(matches[0].service);
  }

  if (matches.length > 1) {
    const strongMatches = matches.filter((match) => match.exactNameMatch || match.ratio >= 0.8);

    if (strongMatches.length === 1) {
      return buildServiceDetailAnswer(strongMatches[0].service);
    }

    const names = matches
      .slice(0, 4)
      .map((match) => match.service.name)
      .join(', ');

    return `Tengo varios servicios relacionados: ${names}. Dime cual te interesa y te digo costo y duracion.`;
  }

  return buildServicesAnswer(services);
};

const buildProductsAnswer = (products: any[]) => {
  if (!products.length) {
    return 'Por el momento no encontre productos disponibles en inventario.';
  }

  const list = products
    .slice(0, 6)
    .map((product) => {
      const brand = product.brand ? ` de ${product.brand}` : '';
      const size = product.size ? `, presentacion ${product.size}` : '';
      return `${product.name}${brand}${size}, cuesta ${formatMoney(product.price)} pesos`;
    })
    .join('. ');

  return `Estos son algunos productos disponibles: ${list}.`;
};

export const getAlexaCatalog = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [services, products] = await Promise.all([
      getActiveServices(),
      getActiveProducts(),
    ]);

    res.json({
      success: true,
      business_hours: BUSINESS_HOURS_TEXT,
      services,
      products,
    });
  } catch (error) {
    console.error('Error al obtener catalogo para Alexa:', error);
    res.status(500).json({
      success: false,
      answer: 'No pude consultar el catalogo de la estetica en este momento.',
    });
  }
};

export const askAlexaAssistant = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = normalizeText(req.body?.question || req.body?.consulta || req.query?.question);

    if (!question) {
      res.status(400).json({
        success: false,
        answer: 'No recibi una pregunta para consultar.',
      });
      return;
    }

    if (
      question.includes('horario') ||
      question.includes('hora') ||
      question.includes('abren') ||
      question.includes('cierran') ||
      question.includes('sabado') ||
      question.includes('domingo')
    ) {
      res.json({
        success: true,
        intent: 'horario',
        answer: BUSINESS_HOURS_TEXT,
      });
      return;
    }

    if (
      question.includes('producto') ||
      question.includes('productos') ||
      question.includes('articulo') ||
      question.includes('articulos') ||
      question.includes('inventario') ||
      question.includes('shampoo') ||
      question.includes('aceite') ||
      question.includes('cera')
    ) {
      const products = await getActiveProducts();
      res.json({
        success: true,
        intent: 'productos',
        answer: buildProductsAnswer(products),
        products,
      });
      return;
    }

    if (
      question.includes('servicio') ||
      question.includes('servicios') ||
      question.includes('catalogo') ||
      question.includes('tratamiento') ||
      question.includes('tratamientos') ||
      question.includes('corte') ||
      question.includes('color') ||
      question.includes('ceja') ||
      question.includes('pestana') ||
      question.includes('pestanas') ||
      question.includes('depilacion') ||
      question.includes('planchado') ||
      question.includes('rizado') ||
      question.includes('peinado')
    ) {
      const services = await getActiveServices();
      res.json({
        success: true,
        intent: 'servicios',
        answer: buildServiceAnswerForQuestion(question, services),
        services,
      });
      return;
    }

    const [services, products] = await Promise.all([
      getActiveServices(),
      getActiveProducts(),
    ]);

    res.json({
      success: true,
      intent: 'general',
      answer:
        'Puedo ayudarte con servicios, productos y horarios. ' +
        `${buildServicesAnswer(services)} Tambien puedo decirte productos disponibles. ${products.length ? `Tenemos ${products.length} productos activos en inventario.` : ''}`,
    });
  } catch (error) {
    console.error('Error en asistente de Alexa:', error);
    res.status(500).json({
      success: false,
      answer: 'No pude consultar la informacion de la estetica en este momento.',
    });
  }
};
