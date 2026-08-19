miércoles 1:28
amzn1.ask.skill.5305e255-8f81-45d2-8844-adaefa80dba3.zip
Archivo Zip
hola quiero hacerle unos cambios a la skill con aol que te compartire ahorita, este skill es acerca del proyecto de la estetica, te apsar elo que mi comapnero empaso para realizar eso, el ya tiene uan version ero como no entregue con el el trabajo el dia de la entrega no me validaronla participacion asi que reprobe el parcial y tengo que presentar loq ue ya se tiene pero agregarle mas fucncioanlidades porque ahorita solo hace cpnsutas, pero para ello revisa que si fucnoe con lo que te pasare y que realmente este trauendo lso dats desde el sitio,  o dieme que ocupas,{ 
    "interactionModel": {
        "languageModel": {
            "invocationName": "ezequiel castillo",
            "intents": [
                {
                    "name": "AMAZON.CancelIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.HelpIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.StopIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.NavigateHomeIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.FallbackIntent",
                    "samples": []
                },
                {
                    "name": "ConsultarServiciosIntent",
                    "slots": [],
                    "samples": [
                        "servicios",
                        "dime los servicios",
                        "lista de servicios",
                        "catalogo de servicios",
                        "catálogo de servicios",
                        "ver catalogo de servicios",
                        "ver catálogo de servicios",
                        "mostrar catalogo de servicios",
                        "mostrar catálogo de servicios",
                        "abrir catalogo de servicios",
                        "abrir catálogo de servicios",
                        "que servicios tienen",
                        "qué servicios tienen",
                        "que tratamientos tienen",
                        "qué tratamientos tienen",
                        "tratamientos disponibles"
                    ]
                },
                {
                    "name": "ConsultarProductosIntent",
                    "slots": [],
                    "samples": [
                        "productos",
                        "dime los productos",
                        "lista de productos",
                        "catalogo de productos",
                        "catálogo de productos",
                        "ver catalogo de productos",
                        "ver catálogo de productos",
                        "mostrar catalogo de productos",
                        "mostrar catálogo de productos",
                        "abrir catalogo de productos",
                        "abrir catálogo de productos",
                        "productos disponibles",
                        "productos en existencia",
                        "inventario de productos",
                        "productos de la estetica",
                        "productos de la estética",
                        "que productos venden",
                        "qué productos venden"
                    ]
                },
                {
                    "name": "ConsultarHorarioIntent",
                    "slots": [],
                    "samples": [
                        "horario",
                        "dime el horario",
                        "que horario tienen",
                        "qué horario tienen",
                        "cual es el horario",
                        "cuál es el horario",
                        "horario de atencion",
                        "horario de atención",
                        "a que hora abren",
                        "a qué hora abren",
                        "a que hora cierran",
                        "a qué hora cierran",
                        "trabajan los sabados",
                        "trabajan los sábados",
                        "abren los domingos"
                    ]
                },
                {
                    "name": "AsistenteEsteticaIntent",
                    "slots": [
                        {
                            "name": "consulta",
                            "type": "AMAZON.SearchQuery"
                        }
                    ],
                    "samples": [
                        "dime {consulta}",
                        "pregunta {consulta}",
                        "consulta {consulta}",
                        "quiero saber {consulta}",
                        "quiero informacion de {consulta}",
                        "quiero información de {consulta}",
                        "me puedes decir {consulta}",
                        "necesito saber {consulta}",
                        "ayudame con {consulta}",
                        "ayúdame con {consulta}",
                        "informacion sobre {consulta}",
                        "información sobre {consulta}",
                        "cuanto cuesta {consulta}",
                        "cuánto cuesta {consulta}",
                        "cuanto tarda {consulta}",
                        "cuánto tarda {consulta}",
                        "precio de {consulta}",
                        "duracion de {consulta}",
                        "duración de {consulta}",
                        "tiempo de {consulta}",
                        "tienes {consulta}",
                        "manejan {consulta}",
                        "hacen {consulta}"
                    ]
                }
            ],
            "types": []
        }
    }
}


Sí. Vamos a hacerlo de la forma más fácil posible y uno por uno, porque si te doy 30 pasos de golpe es más probable que algo se desconfigure.

Al final vas a hacer solamente 3 cosas:

Backend → Vercel → Alexa

Y yo te voy diciendo exactamente dónde picarle.

Antes de empezar, descarga estos dos archivos y déjalos en tu carpeta Descargas:

PASO 1 — Modificar el backend

Primero vamos a hacer solo esto. No entres todavía a Alexa.

Abre otra vez este repositorio de GitHub:

javier20230069 / Esteticaa-backend

En la captura que me mandaste estabas justo aquí:

Esteticaa-backend
│
├── src        ← ENTRA AQUÍ
├── .gitignore
├── package.json
├── ...

Haz clic en src.

Después te va a aparecer algo parecido a:

src
├── config
├── controllers
├── middlewares
├── routes
└── index.ts

Aquí necesito que me mandes una captura.
¿Por qué quiero que pares aquí?

Porque necesito comprobar si tu cuenta tiene permiso para modificar el repositorio. En tu captura anterior no veo claramente el botón Add file, así que podría ser que solamente puedas verlo.

Si tienes permisos, nosotros mismos ponemos los dos archivos en menos de 5 minutos. GitHub permite editar y subir archivos directamente desde el navegador.

Si no tienes permisos, no vamos a perder tiempo intentando. Te digo exactamente qué debe hacer tu compañero o cómo darte acceso.
Lo que vamos a poner cuando lleguemos ahí

Del primer ZIP solamente necesitamos:

src/index.ts

y

src/routes/alexaOAuth.routes.ts

No subas README_RAPIDO.txt al GitHub.

Y muy importante: el repositorio es público, por lo que el Client Secret tampoco lo vamos a escribir dentro del código ni subir a GitHub. Lo pondremos después directamente en Vercel como variable de entorno.
PASO 2 — Vercel

Cuando terminemos GitHub, iremos al proyecto del backend en Vercel y entraremos a:

Settings → Environment Variables

Ahí agregaremos las dos variables de Alexa. Vercel indica que después de agregar variables de entorno hay que hacer un nuevo deployment para que tengan efecto.

Eso será rápido.
PASO 3 — Alexa

Después entraremos a tu skill actual. Ahí haremos dos cosas.

Primero:

Code → Import Code

y seleccionaremos:

El ZIP ya tiene la carpeta lambda que Alexa necesita. Amazon permite importar código ZIP desde Code → Import Code y después hacer Deploy.

Después actualizaremos el modelo de interacción para que Alexa entienda cosas como:

agendar una cita
quiero hacer una cita
quiero corte de dama para mañana
a las cuatro de la tarde
sí, confirmar
cancelar

Y finalmente configuraremos:

Build → Account Linking

con Authorization Code Grant + PKCE, que es precisamente el método actual recomendado por Amazon para vincular una cuenta externa con Alexa.

Así el usuario podrá:

“Alexa, abre Ezequiel Castillo”

→ consultar productos y servicios sin login

→ decir “agendar una cita”

→ Alexa pide vincular cuenta

→ inicia sesión con su cuenta de la estética

→ Alexa consulta servicios reales

→ pregunta fecha

→ consulta horarios reales

→ usuario selecciona hora

→ Alexa pide confirmación

→ se registra la cita en PostgreSQL

→ aparece también en el sistema web.

Por ahora no hagas nada más.

👉 Entra a src en GitHub y mándame captura de lo que te aparece. Desde ahí te digo literalmente “pícale aquí → después aquí → pega esto” hasta terminarlo.

vamos paso apaso hasta que te diga siguiente paso sale? y una dudad si modificamos el bacend afectaria el sitio a como esra ahorita?



ok, segun ya me agrego 











 es en ese icono? le dy pero me manda que incio sesion


qeu correo le comparto ? 








































domingo 23:07





nose donde, peor la cuenta de quien debe ser? mio o la de mi comanero?






Ya pero nose cual de estas son? O le puedo añadir nombre para distinguir?

le deje asi 







Estuve haciendo la el flujo de conversación, como que siempre contestaba de repente. Llegué hasta, me llegó a preguntar hasta qué hora quiero la cita, pero como que le tienes que decir muy certero en las cosas. Y si no le dices bien, te manda esos mensajes de que no lo va a encontrar.

se queda aqui, y parte no muestra nada en la pantalla, solo mostro el incio y dea ahi ya nada

no funcona, aprte sigue sin mostrar en pantalla imagen o infirmacion, checa bien porfavor ya quierp terminar esto

ya fucnoa, peor no meustra imagen del servicio, tampoco en el catalogo

ayer 11:58
pero en la apgian webssi estan las imagenes, osea si se muetsran

si es esat la repo import { Request, Response } from 'express';
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
  const result = await pool.query(
    SELECT id, name, description, duration_minutes, price, category
    FROM operations.services
    WHERE is_active = TRUE
    ORDER BY category ASC, name ASC
  );

  return result.rows;
};

const getActiveProducts = async () => {
  const result = await pool.query(
    SELECT id, name, brand, category, price, stock, size
    FROM inventory.products
    WHERE is_active = TRUE AND stock > 0
    ORDER BY name ASC
  );

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

  return Estos son nuestros servicios principales: ${list}. Si quieres, preguntame por uno y te digo su costo y duracion.;
};

const buildServiceDetailAnswer = (service: any) => {
  const duration = service.duration_minutes
    ?  y dura aproximadamente ${service.duration_minutes} minutos
    : '';

  return El servicio ${service.name} cuesta ${formatMoney(service.price)} pesos${duration}.;
};

const findServiceMatches = (question: string, services: any[]) => {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = new Set(tokenizeServiceText(question));

  return services
    .map((service) => {
      const normalizedName = normalizeText(service.name);
      const searchableText = ${service.name || ''} ${service.category || ''};
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

    return Tengo varios servicios relacionados: ${names}. Dime cual te interesa y te digo costo y duracion.;
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
      const brand = product.brand ?  de ${product.brand} : '';
      const size = product.size ? , presentacion ${product.size} : '';
      return ${product.name}${brand}${size}, cuesta ${formatMoney(product.price)} pesos;
    })
    .join('. ');

  return Estos son algunos productos disponibles: ${list}.;
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
        ${buildServicesAnswer(services)} Tambien puedo decirte productos disponibles. ${products.length ? Tenemos ${products.length} productos activos en inventario. : ''},
    });
  } catch (error) {
    console.error('Error en asistente de Alexa:', error);
    res.status(500).json({
      success: false,
      answer: 'No pude consultar la informacion de la estetica en este momento.',
    });
  }
};

Pegado text.txt
Documento
ok me dices que cmabie algo aqui no? si es asi dame el codigo completo corretido lsito par apegar, ya importe l codgo final v6

 ya hice la cita pero en el sitio sigue sin sr igual la hora , la fecha si y todo solo la hora

donde entro ?


sigue sin mostrar nada 


{
    "total": 292,
    "appointments": [
        {
            "id": 3839,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 11,
            "servicio": "Botox Capilar",
            "duration_minutes": 30,
            "service_price": "900.00",
            "appointment_date": "2026-08-20T13:00:00.000Z",
            "appointment_end": "2026-08-20T13:30:00.000Z",
            "status": "pending",
            "calendar_status": "pending",
            "calendar_status_label": "Pendiente",
            "total_amount": "900.00",
            "deposit_amount": "0.00",
            "remaining_amount": "900.00",
            "appointment_origin": "web",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-08-18T19:07:20.386Z",
            "updated_at": "2026-08-18T19:07:20.386Z"
        },
        {
            "id": 3838,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 7,
            "servicio": "Corte de Caballero",
            "duration_minutes": 40,
            "service_price": "150.00",
            "appointment_date": "2026-08-19T12:00:00.000Z",
            "appointment_end": "2026-08-19T12:40:00.000Z",
            "status": "pending",
            "calendar_status": "pending",
            "calendar_status_label": "Pendiente",
            "total_amount": "150.00",
            "deposit_amount": "0.00",
            "remaining_amount": "150.00",
            "appointment_origin": "web",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-08-18T19:01:54.585Z",
            "updated_at": "2026-08-18T19:01:54.585Z"
        },
        {
            "id": 3837,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 6,
            "servicio": "Corte de Dama",
            "duration_minutes": 60,
            "service_price": "500.00",
            "appointment_date": "2026-08-19T11:00:00.000Z",
            "appointment_end": "2026-08-19T12:00:00.000Z",
            "status": "pending",
            "calendar_status": "pending",
            "calendar_status_label": "Pendiente",
            "total_amount": "500.00",
            "deposit_amount": "0.00",
            "remaining_amount": "500.00",
            "appointment_origin": "web",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-08-18T18:05:42.642Z",
            "updated_at": "2026-08-18T18:05:42.642Z"
        },
        {
            "id": 3836,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 6,
            "servicio": "Corte de Dama",
            "duration_minutes": 60,
            "service_price": "500.00",
            "appointment_date": "2026-08-18T11:00:00.000Z",
            "appointment_end": "2026-08-18T12:00:00.000Z",
            "status": "pending",
            "calendar_status": "pending_review",
            "calendar_status_label": "Pendiente de cierre",
            "total_amount": "500.00",
            "deposit_amount": "0.00",
            "remaining_amount": "500.00",
            "appointment_origin": "web",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-08-18T07:47:50.701Z",
            "updated_at": "2026-08-18T07:47:50.701Z"
        },
        {
            "id": 805,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 9,
            "servicio": "Color",
            "duration_minutes": 120,
            "service_price": "1600.00",
            "appointment_date": "2026-07-15T16:00:00.000Z",
            "appointment_end": "2026-07-15T18:00:00.000Z",
            "status": "completed",
            "calendar_status": "completed",
            "calendar_status_label": "Finalizada",
            "total_amount": "600.00",
            "deposit_amount": "0.00",
            "remaining_amount": "600.00",
            "appointment_origin": "presencial",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-07-08T16:00:00.000Z",
            "updated_at": "2026-07-15T16:00:00.000Z"
        },
        {
            "id": 320,
            "client_id": 16,
            "cliente": "hector",
            "cliente_email": "chepismalo@gmail.com",
            "cliente_telefono": "7731807661",
            "service_id": 7,
            "servicio": "Corte de Caballero",
            "duration_minutes": 40,
            "service_price": "150.00",
            "appointment_date": "2026-07-10T14:00:00.000Z",
            "appointment_end": "2026-07-10T14:40:00.000Z",
            "status": "completed",
            "calendar_status": "completed",
            "calendar_status_label": "Finalizada",
            "total_amount": "100.00",
            "deposit_amount": "30.00",
            "remaining_amount": "70.00",
            "appointment_origin": "web",
            "review_rating": null,
            "review_comment": null,
            "review_created_at": null,
            "created_at": "2026-07-03T14:00:00.000Z",
            "updated_at": "2026-07-10T14:00:00.000Z"
        },

si lo tngo , puedes hacer todo lo que se tenga que hacer ya solo me das los datos, asi como codex




Running build in Washington, D.C., USA (East) – iad1 
Build machine configuration: 2 cores, 8 GB 
Cloning github.com/SANTIAGOgo99/esteticaa-frontend (Branch: main, Commit: c5071c3) 
Previous build caches not available. 
Cloning completed: 789.000ms 
Running "vercel build" 
Vercel CLI 59.0.0 
Installing dependencies... 
added 316 packages in 7s 
70 packages are looking for funding 
  run npm fund for details 
Running "npm run build" 
> frontend@0.0.0 build 
> tsc -b && vite build 
src/pages/admin/AdminAnalytics.tsx(273,10): error TS6133: 'sumarDiasISO' is declared but its value is never read. 
src/pages/admin/AdminAnalytics.tsx(279,10): error TS6133: 'diferenciaDiasISO' is declared but its value is never read. 
src/pages/admin/AdminAnalytics.tsx(354,10): error TS6133: 'obtenerCategoriaDeServicio' is declared but its value is never read. 
src/pages/admin/AdminStats.tsx(613,47): error TS6133: 'i' is declared but its value is never read. 
Error: Command "npm run build" exited with 2  

Pegado text(1).txt
Documento

esa parte ya lo coregi 

peor ahora no me deja entrar




entre con correo y contrasena porque con gmail me sigue diciendo proxiammente

no,  apare se ve que este frontend no esta al cien temrinado com el que ya se usaba, talves no sea este

javier20230069/esteticaa-frontend.git


no veo la opcion producction branch



ya pero sigue el detalle de la hora , 


aqui ?


creo que ya

solo que al rcargar o de repente como que me parece este emnsaje


hoy 0:29
estoy haciendo pruebas, como veras no muestra botón de regresar ni de inicio ni de salir, esos los tiene que tener de ley en cada ventana que se abra, tambein en los servicos o productos, debe de leer bien el precio porque dice precio 1600 mxn jaja, solo deberia decir precio 1000 peoss por ejemplo, y tampoco menciona la categoria por ejmplo cortes y estilizado, y cuando dice el tiempo de duracion solo dice 60 minutos, deberia decir tiempo de duracion del servicio aproximado de 60 minutos, y siempre recuerda que tiene que mantener el flujo de conversacion co n el usuario, incio ta,bein debe de fincioar al escribir no solo con el boton, tambein que las imagenes  se ean bein al ir agendando la cita, en confirmar cita debria de mpostar  de nuevo el imagen del servicio y agrandar un oco las letras porque hay mucho espacio que no se usa, al igual cuando dice que a cita queda registrado lo mismo,y por ultimo agregar un producto al carritoa un no funciona?

Ezequiel_Castillo_Alexa_CODE_FINAL_V6_1(1).zip
Archivo Zip
Pegado text(2).txt
Documento
ok, te apso el zip y el codigo porque no estoy segurp si esa esa  pero cehac si el codigo e siagual al zip probablemnete si, el codigo lo copie del index

encontre estos deatllitos, como veras el titulo del producto y servicio no se ven por completo, tambein estan algo pegadito scon la imagen, productos o servicos con el nombre corto pues si se ven pero los que son largos no, y dime, para qeu los que agrege en el carrito en alexa se pueda ver en le sitio e smucho paso?

sigue igual, la descric[oin no se ve completa, creo que esatria bein pasr a otro renglon una parte del texto de acuerdo al tamano de espacio que ocupa, en productos pue sno afecta porque son titulos y descripciones cortas pero aun asi aplical apor si acaso, si te das cuenat en los servicios, al ver la descripcion la imagen nos eve compaleta al igual que la info, peor en el proceso de agendameinto de cita en el paso 2 si se ve bien la imagen, solo corrige eso y creo que ya dormire jaja

sigue igual esta parte de la descricion, la imagen y todo lo demas ya

ya solo aqui un punto, al confirma rla cita no aparecen todos los datos qeu menciona alexa y como ya te habia comentado eso no debe de pasar, solo en este punto y nose si al final tambein pas elo msio cuando ya confirmas la cita 

hoy 13:23
hice un acmbio en esta tabla como lo guardo yque se vea el cambio en el sitio 

Sí. Para esa evaluación te conviene entenderlo como un solo sistema con tres partes conectadas:

Sitio web ↔ Backend/API ↔ Base de datos
y además:
Alexa Skill ↔ Backend/API ↔ Base de datos

La clave es que Alexa y el sitio no se conectan directamente a PostgreSQL. Ambos pasan por el backend/API. Ese es el punto más importante para explicarle a la maestra.
1. Arquitectura general de tu proyecto

Tu flujo real queda así:

                ┌─────────────────────┐
                │   Base de datos     │
                │    PostgreSQL       │
                └─────────▲───────────┘
                          │
                    consultas SQL
                          │
                ┌─────────┴───────────┐
                │      BACKEND        │
                │ Node.js + Express   │
                │     API REST        │
                └──────▲────────▲─────┘
                       │        │
             HTTP/API  │        │ HTTP/API
                       │        │
          ┌────────────┘        └────────────┐
          │                                  │
┌─────────┴──────────┐            ┌──────────┴─────────┐
│     FRONTEND       │            │    ALEXA SKILL     │
│ React + Vite       │            │ Node + ASK SDK     │
│ Sitio web          │            │ Voz + APL          │
└────────────────────┘            └────────────────────┘

Entonces, si la maestra te pregunta:

    “¿Dónde están tus APIs?”

Le puedes responder:

    “Las APIs están en el backend. El frontend y Alexa consumen esas rutas HTTP. El backend es el que consulta y modifica PostgreSQL.”

2. ¿Qué API usa tu proyecto?

No es que tengas una “API de la base de datos”.

La base de datos no es la API.

Tú tienes una API REST en el backend.

Por ejemplo, en tu Alexa actual tienes configuradas estas URLs:

const API_URL =
'https://esteticaa-backend-five.vercel.app/api/alexa';

const ROOT_API_URL =
'https://esteticaa-backend-five.vercel.app/api';

Eso quiere decir que tu backend tiene rutas bajo:

/api

y unas específicas para Alexa bajo:

/api/alexa

3. APIs que usa Alexa

En tu código actual, las más importantes son estas.
Catálogo de servicios y productos

Alexa consulta:

GET /api/alexa/catalog

En el código aparece cuando haces:

api.get('/catalog')

porque api ya tiene como base:

https://esteticaa-backend-five.vercel.app/api/alexa

Entonces realmente termina siendo:

https://esteticaa-backend-five.vercel.app/api/alexa/catalog

Sirve para obtener:

servicios
productos
precios
categorías
duraciones
stock
imágenes

Por eso cuando tú cambias algo en PostgreSQL y luego Alexa vuelve a consultar el catálogo, aparece el cambio.
4. API para disponibilidad de citas

En Alexa tienes:

async function fetchAvailableSlots(
    accessToken,
    date,
    serviceId
)

y dentro:

authApi.get('/appointments/slots', {
    params: {
        date,
        service_id: serviceId
    }
})

Como authApi utiliza:

https://esteticaa-backend-five.vercel.app/api

la ruta real es:

GET /api/appointments/slots

Por ejemplo:

GET /api/appointments/slots
?date=2026-08-20
&service_id=9

¿Qué hace?

El backend:

    recibe fecha y servicio;

    consulta las citas registradas en PostgreSQL;

    determina cuáles horarios ya están ocupados;

    genera los horarios disponibles;

    se los devuelve a Alexa.

Por eso comprobaste que una hora ocupada ya no vuelve a aparecer.
5. API para registrar una cita

Tienes esta función:

createAppointmentFromAlexa(...)

que hace:

authApi.post('/appointments', {
    service_id: Number(serviceId),
    appointment_date: appointmentDate,
    deposit_amount: 0
})

Por tanto la ruta es:

POST /api/appointments

Y además manda:

Authorization: Bearer accessToken

Eso sirve para que el backend sepa qué usuario está agendando.

También tienes:

X-Appointment-Origin: alexa

para indicar que la solicitud viene desde Alexa.
6. Flujo de una cita completo

Este te lo aprendería casi de memoria porque puede preguntártelo.

Usuario:
"Quiero agendar una cita"
        ↓
Alexa detecta AgendarCitaIntent
        ↓
La skill revisa si existe accessToken
        ↓
Si no existe:
Account Linking
        ↓
Si existe:
consulta catálogo
        ↓
Usuario selecciona servicio
        ↓
Alexa solicita fecha
        ↓
Alexa llama:
GET /api/appointments/slots
        ↓
Backend consulta PostgreSQL
        ↓
Devuelve horarios libres
        ↓
Usuario elige una hora
        ↓
Alexa muestra resumen
        ↓
Usuario confirma
        ↓
Alexa llama:
POST /api/appointments
        ↓
Backend valida otra vez
        ↓
Inserta cita en PostgreSQL

Esta explicación te sirve muchísimo para la demostración.
7. ¿Por qué el cambio en BD aparece en web y Alexa?

Esto que ya hiciste es una excelente demostración.

Puedes decir:

    “Tanto Alexa como el sitio consumen información del mismo backend y la misma base de datos. Por eso, cuando actualizo un servicio en PostgreSQL, el backend devuelve el nuevo valor y se refleja tanto en el frontend como en Alexa.”

Es decir:

POSTGRESQL
   ↓
BACKEND
   ↓
 ┌─────────────┐
 │             │
WEB           ALEXA

No tienes dos bases de datos distintas.
8. ¿Dónde está el código del backend?

En tu proyecto backend, lo importante es entender esta separación:

src/
│
├── routes/
│
├── controllers/
│
├── ...
│
└── index.ts

Dependiendo del repo puede haber más carpetas, pero conceptualmente:
routes

Dice:

    “Cuando llegue una petición a esta URL, ejecuta esta función.”

Ejemplo conceptual:

router.get(
  '/appointments/slots',
  getAvailableSlots
);

controllers

Aquí está la lógica.

Por ejemplo:

getAvailableSlots
createAppointment
getMyAppointments

Aquí normalmente ocurre:

req
↓
validación
↓
consulta SQL
↓
respuesta JSON

9. Ejemplo de controlador

Conceptualmente:

export const getMyAppointments = async (req, res) => {

    const result = await pool.query(`
        SELECT ...
        FROM operations.appointments
        ...
    `);

    res.json(result.rows);
};

Este es el puente entre:

API
↓
PostgreSQL

10. ¿Dónde está la conexión a PostgreSQL?

Tu backend tiene una configuración del pool/conexión PostgreSQL.

Normalmente se usa algo parecido a:

pool.query(...)

Cuando ves:

pool.query()

eso significa:

    “El backend está ejecutando SQL sobre PostgreSQL.”

Entonces, si la maestra dice:

    “Enséñame dónde consultas la base de datos.”

Busca un controller donde aparezca:

pool.query

y un:

SELECT
INSERT
UPDATE
DELETE

11. Qué hace cada operación SQL
SELECT

Consultar.

SELECT *
FROM services;

INSERT

Crear.

INSERT INTO appointments (...)
VALUES (...);

UPDATE

Modificar.

UPDATE services
SET price = 1600
WHERE id = 9;

DELETE

Eliminar.

DELETE FROM ...

En tu caso la maestra probablemente se interesa sobre todo por:

SELECT servicios
SELECT disponibilidad
INSERT citas
UPDATE servicios/productos

12. El frontend

Tu frontend es:

React + Vite

y está desplegado en:

https://esteticaa-frontend-ten.vercel.app

El frontend también consume:

https://esteticaa-backend-five.vercel.app/api

mediante:

VITE_API_URL

La variable que configuraste fue:

VITE_API_URL=
https://esteticaa-backend-five.vercel.app/api

Eso es muy importante si la maestra pregunta:

    “¿Cómo sabe el frontend a qué backend conectarse?”

Respuesta:

    “Mediante la variable de entorno VITE_API_URL.”

13. Flujo del frontend

Conceptualmente:

Usuario abre Mis Citas
       ↓
React ejecuta petición HTTP
       ↓
GET /api/appointments/my
       ↓
Express recibe petición
       ↓
Controller
       ↓
PostgreSQL
       ↓
Backend devuelve JSON
       ↓
React guarda los datos
       ↓
React renderiza las tarjetas

14. Ejemplo real de tu proyecto

Ya comprobaste en Network:

GET
https://esteticaa-backend-five.vercel.app
/api/appointments/my

con:

200 OK

Eso es evidencia de que:

Frontend
   ↓
API
   ↓
Backend

está funcionando.

Si te pide demostrarlo:

    Abre el sitio.

    F12.

    Network.

    Entra a Mis Citas.

    Selecciona my.

    Muéstrale:

Request URL
Request Method
Status Code
Response

Eso queda muy bien como demostración técnica.
15. Alexa: partes del código más importantes

Tu index.js se puede entender en bloques.
A. Configuración

Al inicio:

const Alexa = require('ask-sdk-core');
const axios = require('axios');

ASK SDK

ask-sdk-core

sirve para crear la skill y manejar:

LaunchRequest
IntentRequest
handlers
responses

Axios

Sirve para conectarse con tu backend.
16. URL de API

const API_URL = ...
const ROOT_API_URL = ...

Define dónde está el backend.
17. Catálogo

fetchCatalog()

Hace:

Alexa
↓
GET /api/alexa/catalog
↓
Backend
↓
PostgreSQL

y obtiene productos/servicios.
18. Normalización de datos

Tienes funciones como:

normalizeCatalogItem()

Sirven para transformar los datos que llegan del backend al formato que necesita Alexa.

Por ejemplo:

price → $1600 MXN
duration_minutes → 120 min
image_url → imageUrl

19. Handlers

Ejemplo importante:

AgendarCitaIntentHandler

Tiene:

canHandle()

y:

handle()

canHandle

Decide si corresponde atender la solicitud.
handle

Ejecuta toda la lógica.
20. Estado de la conversación

Usas:

handlerInput.attributesManager
    .getSessionAttributes();

Ahí guardas cosas como:

appointmentDraft
appointmentStep
awaitingAppointmentConfirmation

Ejemplo:

appointmentStep = service

significa:

    “Alexa está esperando que el usuario indique el servicio.”

Después:

date
time
confirm

Esto es lo que mantiene el flujo.
21. APL

Cuando el dispositivo tiene pantalla:

renderAPL(...)

manda:

Alexa.Presentation.APL.RenderDocument

Eso hace que Alexa renderice la interfaz.
22. buildAppointment...

Por ejemplo:

buildAppointmentDatePickerDocument()

crea la pantalla donde eliges la fecha.

buildAppointmentTimePickerDocument()

crea la pantalla de horarios.

buildAppointmentDocument()

se usa para:

confirmación
éxito
error
cancelación

23. Touch en Alexa

Cuando presionas un botón APL:

TouchWrapper
↓
SendEvent

La skill recibe un:

Alexa.Presentation.APL.UserEvent

y puede saber qué tocaste.

Por ejemplo:

appointmentService
appointmentDate
appointmentTime
confirmarCita
inicio
salir

24. Account Linking en código

Esta función:

getAlexaAccessToken(handlerInput)

busca:

context.System.user.accessToken

Si no existe:

responseNeedsLinking()

y Alexa pide vincular la cuenta.

Si existe:

Authorization:
Bearer accessToken

va al backend.
25. Una respuesta muy buena si te pregunta “¿qué APIs usas?”

Puedes responder así:

    “Uso una API REST propia desarrollada en el backend con Node y Express. Alexa consume endpoints del catálogo, disponibilidad y citas. Por ejemplo, /api/alexa/catalog para servicios y productos, /api/appointments/slots para consultar horarios y /api/appointments para registrar citas. El frontend también consume la misma API, por ejemplo /api/appointments/my. El backend es quien se comunica directamente con PostgreSQL.”

Eso está perfecto.
26. Si pregunta “¿es una API externa?”

Respuesta:

    “No principalmente. Es una API propia del proyecto. Está desplegada en Vercel y conecta tanto el frontend como Alexa con la base de datos.”

Alexa obviamente usa los servicios propios de Amazon para ejecutar la skill, pero la API de negocio de tu sistema es tu backend.
27. ¿Dónde le mostrarías cada cosa a la maestra?

Yo haría la demostración en este orden:
A. Base de datos

PostgreSQL / pgAdmin.

Enséñale:

services
products
appointments

y modifica algo.
B. Backend

GitHub:

Esteticaa-backend

Busca:

routes
controllers

Enséñale una ruta y su controller.
C. API

Puedes mostrar en navegador o Postman:

/api/alexa/catalog

y demostrar que devuelve JSON.
D. Sitio

Actualiza la página y enseña el cambio.
E. Alexa

Vuelve a consultar el mismo servicio y muestra que tomó el mismo valor.

Así demuestras toda la arquitectura de punta a punta.
28. La demostración más fuerte que puedes hacer

Por ejemplo cambia en PostgreSQL:

Color
Precio: 1600

a:

Color
Precio: 1700

Luego:
BD

1700

API

{
  "name": "Color",
  "price": 1700
}

Web

$1700

Alexa

    “Color. Precio: 1700 pesos.”

Y dices:

    “El dato no está duplicado en Alexa ni en el frontend. Ambos lo están obteniendo desde el backend y la misma base de datos.”

Esa frase te ayuda muchísimo.
29. Diferencia entre frontend, backend, API y BD

Apréndete esto:
Parte	Función
Frontend	Lo que ve y usa el cliente
Alexa Skill	Otra interfaz del sistema, mediante voz y pantalla
Backend	Procesa reglas y lógica
API	Rutas mediante las cuales frontend/Alexa hablan con backend
PostgreSQL	Guarda los datos
30. Pregunta trampa: “¿La API es la base de datos?”

No.

Respuesta:

    “No. PostgreSQL almacena los datos. La API está en el backend y actúa como intermediaria para consultar o modificar esos datos.”

31. Pregunta: “¿Alexa accede directamente a PostgreSQL?”

No.

    “Alexa nunca recibe las credenciales de la base de datos. Alexa llama al backend mediante HTTP y el backend realiza la consulta SQL.”

Eso además es mejor por seguridad.
32. Pregunta: “¿Por qué no conectaste React directamente a PostgreSQL?”

Respuesta:

    “Porque expondría credenciales y lógica sensible. El frontend debe consumir una API; el backend controla autenticación, validaciones y acceso a la base de datos.”

Muy buena respuesta técnica.
33. Lo que yo aprendería para mañana

No memorices todo el código línea por línea. Aprende estos nombres:

fetchCatalog
fetchAvailableSlots
createAppointmentFromAlexa

AgendarCitaIntentHandler
ConfirmarCitaIntentHandler

getAlexaAccessToken

renderAPL
buildAppointmentDocument

Session Attributes

GET
POST

routes
controllers
pool.query

VITE_API_URL

Si entiendes para qué sirve cada uno, puedes defender el proyecto aunque te abra cualquier archivo.
Tu explicación de 1 minuto

Si la maestra te dice simplemente:

    “Explícame cómo funciona todo.”

Puedes decir:

    “El proyecto sigue una arquitectura cliente-servidor. PostgreSQL almacena los datos. El backend desarrollado con Node y Express expone una API REST y es el único que accede directamente a la base de datos. El frontend en React consume esa API para mostrar productos, servicios y citas. Alexa también consume la misma API mediante Axios. Por ejemplo, obtiene el catálogo, consulta disponibilidad y registra citas. Para acciones del usuario autenticado utilizamos Account Linking y un access token. Por eso, si cambio un servicio en PostgreSQL, el backend devuelve el nuevo dato y el mismo cambio se refleja tanto en el sitio como en Alexa.”

Esa respuesta conecta prácticamente todo tu proyecto.

hoy 15:14
ok, oye etsbamos haciendo lo de agendar citas en alexa pero que crees , faltan validaciones, en los serviciosos, espeificamente en los horarios, porque la maestra hizo una reservacion a las 1 el dia de hoy y y ason las tres jajaja, ya no deberia dejar, aparte de que si ya s eocupa esa fecha hora ya no deberia de parecer atmpoco, cehac todas las validaciones pendiente sy diem como corregsirlas

Sí, aquí sí encontré dos fallas claras en las validaciones actuales y varias mejoras que conviene dejar cerradas antes de que vuelva a probar la maestra.

La primera explica exactamente lo que pasó hoy: el endpoint de horarios genera todos los slots desde apertura hasta cierre, pero no filtra los horarios que ya pasaron cuando la fecha seleccionada es hoy. Por eso a las 3 p. m. todavía podía aparecer 1 p. m. como disponible.

La segunda es todavía más importante: tu backend está configurado para permitir hasta 2 citas simultáneas:

const MAX_SIMULTANEOUS_APPOINTMENTS = 2;

y luego considera disponible un horario cuando:

conflicts < MAX_SIMULTANEOUS_APPOINTMENTS

Es decir, si ya existe 1 cita, el horario todavía aparece como disponible porque 1 < 2.

Como tú quieres que una sola cita bloquee ese rango, hay que cambiar eso.
Lo que debe quedar validado

Yo dejaría estas reglas:

    No permitir fechas anteriores a hoy.

    Si la fecha es hoy, no mostrar horas anteriores a la hora actual.

    Tampoco aceptar por API una cita de hoy a una hora que ya pasó.

    Domingo cerrado.

    Respetar horario laboral.

    Que la duración completa del servicio quepa antes del cierre.

    Si ya existe una cita que se cruza con ese horario, bloquearlo.

    Considerar el tiempo completo del servicio, no solo la hora inicial.

    Ignorar citas canceladas/finalizadas/no-show para disponibilidad.

    Volver a comprobar disponibilidad justo antes del INSERT.

Varias de esas ya las tienes. Lo que falta de verdad es pasado + capacidad de 1.
Paso 1. Cambiar capacidad simultánea a 1

En:

src/controllers/appointments.controller.ts

busca:

const MAX_SIMULTANEOUS_APPOINTMENTS = 2;

y cambia por:

const MAX_SIMULTANEOUS_APPOINTMENTS = 1;

También cambia el comentario:

// Solo se permite una cita ocupando el mismo rango de horario.
const MAX_SIMULTANEOUS_APPOINTMENTS = 1;

Porque actualmente el código explícitamente fue diseñado para permitir dos citas al mismo tiempo.

Después, en checkAvailability, cambia este mensaje:

: 'Horario no disponible, ya hay 2 citas en ese rango',

por:

: 'Horario no disponible, ya existe una cita en ese rango',

Con eso:

0 conflictos → Disponible
1 conflicto  → Ocupado

Paso 2. Crear una función para obtener la hora real de México

Esto es importante porque Vercel puede ejecutar el servidor en UTC.

Arriba, junto a tus funciones auxiliares, agrega:

const getMexicoNow = (): Date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
};

Esto nos da la hora local del negocio, no la hora UTC del servidor.
Paso 3. Impedir que checkAvailability() acepte citas pasadas

Dentro de:

const checkAvailability = async (...)

ya tienes:

const startDate = parseDateWithoutTimezone(appointmentDate);
const endDate = addMinutes(startDate, Number(service.duration_minutes));

Justo después agrega:

const nowMexico = getMexicoNow();

if (startDate <= nowMexico) {
  return {
    available: false,
    reason: 'No se puede agendar una cita en una fecha u hora que ya pasó',
    service,
    conflicts: 0,
  };
}

Eso es importantísimo porque aunque Alexa no mostrara la hora, alguien podría intentar mandar directamente:

POST /api/appointments

con una hora pasada.

Y actualmente createAppointment() sí vuelve a llamar a checkAvailability() antes del INSERT, así que con este cambio también quedará protegido el registro final.
Paso 4. Quitar horarios pasados de /appointments/slots

Ahora vamos a corregir exactamente el error de la maestra.

Dentro de:

getAvailableSlots

ya tienes:

const openDate = new Date(`${date}T${businessHours.open}:00`);
const closeDate = new Date(`${date}T${businessHours.close}:00`);

Después agrega:

const nowMexico = getMexicoNow();

const selectedDate = `${date}`;

const todayMexico = formatDateForPostgres(nowMexico).substring(0, 10);

const isToday = selectedDate === todayMexico;

Luego, dentro del:

while (current < closeDate)

tienes:

const startDate = new Date(current);
const endDate = addMinutes(
  startDate,
  Number(service.duration_minutes)
);

Justo después agrega:

if (isToday && startDate <= nowMexico) {
  allSlots.push({
    time: formatDateForPostgres(startDate).substring(11, 16),
    appointment_date: formatDateForPostgres(startDate),
    appointment_end: formatDateForPostgres(endDate),
    available: false,
    conflicts: 0,
    reason: 'Este horario ya pasó',
  });

  current = addMinutes(current, 30);
  continue;
}

Así, por ejemplo, si hoy son:

3:14 p. m.

ya no aparecerán:

11:00
11:30
12:00
12:30
1:00
1:30
2:00
2:30
3:00

El primer horario posible sería:

3:30 p. m.

si está libre.
Paso 5. Corregir también la lógica de conflictos de slots

En getAvailableSlots actualmente tienes:

available: conflicts < 2,

y:

reason: conflicts < 2
  ? 'Disponible'
  : 'Ocupado',

Eso también debe cambiar.

Pon:

available: conflicts === 0,
conflicts,
reason: conflicts === 0
  ? 'Disponible'
  : 'Ocupado',

Y después:

if (slot.available) {
  availableSlots.push(slot);
}

Eso ya está bien.

Actualmente ahí también se está permitiendo una segunda cita simultánea.
Paso 6. Validar servicio activo también en slots

Tu checkAvailability() sí valida:

if (service.is_active === false)

y rechaza servicios inactivos.

Pero en getAvailableSlots() consultas:

SELECT
  id,
  name,
  description,
  price,
  duration_minutes,
  is_active
FROM operations.services
WHERE id = $1;

y después no veo que rechaces is_active = false.

Después de:

const service = serviceResult.rows[0];

agrega:

if (service.is_active === false) {
  res.status(400).json({
    message: 'El servicio no está disponible actualmente',
    available_slots: [],
    all_slots: [],
  });
  return;
}

Paso 7. Validar que la fecha solicitada no sea pasada también en /slots

Alexa ya tiene una validación para fechas pasadas:

if (candidate < today)

y responde:

    “Esa fecha ya pasó.”

Pero esa protección está en Alexa. El backend también debe tenerla.

Dentro de getAvailableSlots(), después de:

const testDate = new Date(`${date}T12:00:00`);

agrega:

const nowMexico = getMexicoNow();

const todayOnly = new Date(
  nowMexico.getFullYear(),
  nowMexico.getMonth(),
  nowMexico.getDate()
);

const requestedOnly = new Date(
  testDate.getFullYear(),
  testDate.getMonth(),
  testDate.getDate()
);

if (requestedOnly < todayOnly) {
  res.status(400).json({
    message: 'No se pueden consultar horarios de una fecha pasada',
    available_slots: [],
    all_slots: [],
  });
  return;
}

Lo que YA tienes bien

No todo está mal. De hecho varias validaciones están correctamente implementadas.

Tu backend ya comprueba que el servicio exista y esté activo antes de registrar.

Ya rechaza domingos:

if (!businessHours)

→ “La estética no trabaja los domingos”.

Ya valida que la cita esté dentro del horario laboral:

if (startDate < openDate || endDate > closeDate)

Esto además tiene en cuenta la duración completa, no solo la hora de inicio.

Por ejemplo, si un servicio dura 120 minutos y cierran a las 7:

6:00 p. m.
↓
terminaría 8:00 p. m.
↓
RECHAZADO

Eso está muy bien.

Y tu consulta de conflictos también usa el intervalo completo:

a.appointment_date < nuevaCitaFin

AND

citaExistenteFin > nuevaCitaInicio

por lo que detecta traslapes entre servicios de distinta duración.
Una mejora adicional que recomiendo

Si hoy son las:

3:14 p. m.

técnicamente podrías mostrar:

3:30 p. m.

Pero en un negocio real puede ser mejor exigir una anticipación mínima.

Por ejemplo:

const MIN_ADVANCE_MINUTES = 30;

y en vez de:

startDate <= nowMexico

usar:

const minimumAllowedTime =
  addMinutes(nowMexico, MIN_ADVANCE_MINUTES);

if (startDate < minimumAllowedTime) {
   ...
}

Entonces a las 3:14:

3:30 → ya no
4:00 → sí

Pero esto es opcional. Si no existe esa regla en tu negocio, yo no la pondría ahora.
Resultado final esperado

Si hoy son las 3:14 y el horario es:

11:00–19:00

Alexa debería ofrecer únicamente algo como:

3:30
4:00
4:30
5:00
...

menos los horarios ocupados.

Y si existe una cita:

4:00–5:00

entonces tampoco deberán aparecer slots que se crucen con ella.

Por ejemplo:

3:30 para servicio de 60 min → NO
4:00 → NO
4:30 → NO
5:00 → SÍ

porque el conflicto se calcula usando la duración completa.
Las dos correcciones prioritarias

Si quieres resolver lo urgente primero, haz estas dos:

const MAX_SIMULTANEOUS_APPOINTMENTS = 1;

y agregar el filtrado:

if (isToday && startDate <= nowMexico) {
   // no agregar a availableSlots
}

Después hacemos la protección en checkAvailability().

Mi recomendación es que lo corrijamos en el backend, no solamente en Alexa, porque así queda arreglado para Alexa, sitio web y cualquier otra interfaz que use esa API.

Pegado text(3).txt
Documento
te paso el cosigo compelot correg lo que se tnega que coregir y  damelo compelto, despues seguimos con lo demas paso a paso 

Sí. Ya tomé el código completo que me pasaste y corregí este primer bloque del backend sin tocar todavía Alexa ni el frontend.

Qué corregí en este archivo

    Ya no permite agendar una hora que ya pasó.

        Si hoy son las 3:45 p. m., ya no acepta 1:00 p. m., 2:00 p. m. ni 3:30 p. m.

    Los horarios pasados de hoy ya no aparecen como disponibles en /appointments/slots.

    Una cita ya ocupa el horario completo.

        Se mantiene MAX_SIMULTANEOUS_APPOINTMENTS = 1.

    Cambié el mensaje incorrecto que decía:

        “ya hay 2 citas”

        ahora dice que ya existe una cita en ese rango.

    Se sigue validando el traslape completo según la duración del servicio.

    Sigue evitando citas en domingo.

    Sigue validando horario de apertura y cierre.

    Si un servicio ya no está activo, tampoco devuelve horarios.

    No permite consultar slots de una fecha pasada.

    Valida que la hora esté en intervalos de 30 minutos.

    Valida que service_id sea válido.

    Valida que el anticipo no sea negativo ni mayor al precio.

    Aproveché el encabezado que Alexa ya manda:

    X-Appointment-Origin: alexa

    así que ahora una cita creada desde Alexa puede guardarse como:

    appointment_origin = alexa

    mientras la web sigue siendo web.

    Agregué alexa a los orígenes permitidos.

No cambié todavía el código de tu skill.
Ahora haz solo este paso

En tu backend entra a:

src/controllers/appointments.controller.ts

borra todo lo que tienes ahí y reemplázalo por el archivo completo que te acabo de dar.

Después:

    Commit changes

    Espera el deployment de Vercel.

    Cuando quede Ready, hacemos una prueba.

La primera prueba será sencilla: si hoy ya pasó la 1:00 p. m., Alexa ya no debe ofrecerla para una cita de hoy.

Cuando hayas reemplazado el archivo y Vercel termine de desplegar, dime “ya” y seguimos con la prueba antes de tocar cualquier otra cosa.


Biblioteca
/
desarrollo para dispositivos inteligentes
/appointments.controller.ts

import { Request, Response } from 'express';
import pool from '../config/db';

// Estados reales guardados en la base de datos
const VALID_DB_STATUSES = ['pending', 'confirmed', 'completed', 'canceled', 'no_show'];

// Orígenes permitidos
const VALID_ORIGINS = ['web', 'presencial', 'alexa'];

// Capacidad de atención de la estética
// Regla actual: una sola cita puede ocupar un mismo rango de horario.
const MAX_SIMULTANEOUS_APPOINTMENTS = 1;

// Horarios base del negocio
const BUSINESS_HOURS = {
  weekday: {
    open: '11:00',
    close: '19:00',
  },
  saturday: {
    open: '10:00',
    close: '18:00',
  },
};

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================

const normalizeStatus = (status: string) => {
  if (status === 'cancelled') return 'canceled';
  return status;
};

const parseDateWithoutTimezone = (dateText: string): Date => {
  const value = String(dateText || '').trim();

  // Interpretamos la fecha como hora local del negocio, sin aplicar UTC.
  // Acepta: YYYY-MM-DDTHH:mm:ss o YYYY-MM-DD HH:mm:ss
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) {
    return new Date(NaN);
  }

  const [, year, month, day, hour, minute, second = '00'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0
  );
};

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

const formatDateForPostgres = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const formatDateOnly = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getMexicoNow = (): Date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  // Se construye como una fecha "local lógica" para compararla con
  // appointment_date, que en PostgreSQL se maneja como timestamp sin zona.
  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
    0
  );
};

const isValidLocalDateTime = (date: Date): boolean => {
  return !Number.isNaN(date.getTime());
};

const isThirtyMinuteSlot = (date: Date): boolean => {
  return date.getSeconds() === 0 && date.getMinutes() % 30 === 0;
};

const getBusinessHoursByDate = (date: Date) => {
  const day = date.getDay();

  // Domingo cerrado
  if (day === 0) {
    return null;
  }

  // Sábado
  if (day === 6) {
    return BUSINESS_HOURS.saturday;
  }

  // Lunes a viernes
  return BUSINESS_HOURS.weekday;
};

const buildDateWithTime = (dateText: string, timeText: string): Date => {
  return new Date(`${dateText}T${timeText}:00`);
};

const getCalendarStatusSQL = `
  CASE
    WHEN a.status = 'canceled' THEN 'canceled'
    WHEN a.status = 'no_show' THEN 'no_show'
    WHEN a.status = 'completed' THEN 'completed'

    WHEN NOW() < a.appointment_date THEN 'pending'

    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      THEN 'in_process'

    WHEN NOW() >= (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status IN ('pending', 'confirmed')
      THEN 'pending_review'

    ELSE a.status
  END AS calendar_status
`;

const getCalendarStatusLabelSQL = `
  CASE
    WHEN a.status = 'canceled' THEN 'Cancelada'
    WHEN a.status = 'no_show' THEN 'No asistió'
    WHEN a.status = 'completed' THEN 'Finalizada'

    WHEN NOW() < a.appointment_date THEN 'Pendiente'

    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      THEN 'En proceso'

    WHEN NOW() >= (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status IN ('pending', 'confirmed')
      THEN 'Pendiente de cierre'

    ELSE a.status
  END AS calendar_status_label
`;

// =========================================================================
// VALIDAR DISPONIBILIDAD
// =========================================================================

const checkAvailability = async (
  appointmentDate: string,
  serviceId: number,
  excludeAppointmentId?: number
) => {
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return {
      available: false,
      reason: 'El identificador del servicio no es válido',
      service: null,
      conflicts: 0,
    };
  }

  const serviceQuery = `
    SELECT id, name, price, duration_minutes, is_active
    FROM operations.services
    WHERE id = $1;
  `;

  const serviceResult = await pool.query(serviceQuery, [serviceId]);

  if (serviceResult.rows.length === 0) {
    return {
      available: false,
      reason: 'Servicio no encontrado',
      service: null,
      conflicts: 0,
    };
  }

  const service = serviceResult.rows[0];

  if (service.is_active === false) {
    return {
      available: false,
      reason: 'El servicio no está activo',
      service,
      conflicts: 0,
    };
  }

  const startDate = parseDateWithoutTimezone(appointmentDate);

  if (!isValidLocalDateTime(startDate)) {
    return {
      available: false,
      reason: 'La fecha u hora de la cita no es válida',
      service,
      conflicts: 0,
    };
  }

  if (!isThirtyMinuteSlot(startDate)) {
    return {
      available: false,
      reason: 'La hora debe seleccionarse en intervalos de 30 minutos',
      service,
      conflicts: 0,
    };
  }

  const nowMexico = getMexicoNow();

  if (startDate <= nowMexico) {
    return {
      available: false,
      reason: 'No se puede agendar una cita en una fecha u hora que ya pasó',
      service,
      conflicts: 0,
    };
  }

  const endDate = addMinutes(startDate, Number(service.duration_minutes));

  const businessHours = getBusinessHoursByDate(startDate);

  if (!businessHours) {
    return {
      available: false,
      reason: 'La estética no trabaja los domingos',
      service,
      conflicts: 0,
    };
  }

  const dateOnly =
    appointmentDate.split('T')[0] ||
    appointmentDate.split(' ')[0];

  const openDate = buildDateWithTime(dateOnly, businessHours.open);
  const closeDate = buildDateWithTime(dateOnly, businessHours.close);

  if (startDate < openDate || endDate > closeDate) {
    return {
      available: false,
      reason: `El horario está fuera del horario laboral (${businessHours.open} a ${businessHours.close})`,
      service,
      conflicts: 0,
    };
  }

  let conflictQuery = `
    SELECT COUNT(*)::int AS total
    FROM operations.appointments a
    JOIN operations.services s ON s.id = a.service_id
    WHERE a.status IN ('pending', 'confirmed')
    AND a.appointment_date < $2::timestamp
    AND (a.appointment_date + (s.duration_minutes || ' minutes')::interval) > $1::timestamp
  `;

  const params: any[] = [
    formatDateForPostgres(startDate),
    formatDateForPostgres(endDate),
  ];

  if (excludeAppointmentId) {
    conflictQuery += ` AND a.id <> $3`;
    params.push(excludeAppointmentId);
  }

  const conflictResult = await pool.query(conflictQuery, params);
  const conflicts = Number(conflictResult.rows[0].total);

  return {
    available: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS,
    reason:
      conflicts < MAX_SIMULTANEOUS_APPOINTMENTS
        ? 'Horario disponible'
        : 'Horario no disponible, ya existe una cita en ese rango',
    service,
    conflicts,
  };
};

// =========================================================================
// 1. OBTENER CITAS PARA EL PANEL/CALENDARIO
// =========================================================================
export const getMyAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      res.status(401).json({
        message: 'No se pudo identificar al cliente',
      });
      return;
    }

    const query = `
      SELECT
        a.id,
        a.client_id,
        u.full_name AS cliente,
        u.email AS cliente_email,
        u.phone AS cliente_telefono,

        a.service_id,
        s.name AS servicio,
        s.duration_minutes,
        s.price AS service_price,

        TO_CHAR(
          a.appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        TO_CHAR(
          a.appointment_date
            + (s.duration_minutes || ' minutes')::interval,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_end,

        a.status,

        ${getCalendarStatusSQL},
        ${getCalendarStatusLabelSQL},

        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,

        COALESCE(
          a.appointment_origin,
          'web'
        ) AS appointment_origin,

        a.created_at,
        a.updated_at

      FROM operations.appointments a

      LEFT JOIN auth.users u
        ON a.client_id = u.id

      LEFT JOIN operations.services s
        ON a.service_id = s.id

      WHERE a.client_id = $1

      ORDER BY a.appointment_date ASC;
    `;

    const result = await pool.query(query, [clientId]);

    res.json({
      total: result.rows.length,
      appointments: result.rows,
    });

  } catch (error) {
    console.error(
      '🔥 Error al obtener las citas del cliente:',
      error
    );

    res.status(500).json({
      message:
        'Error interno del servidor al cargar las citas del cliente',
    });
  }
};

export const getAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date_from, date_to, status, origin } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (date_from) {
      params.push(date_from);
      conditions.push(
        `a.appointment_date >= $${params.length}::timestamp`
      );
    }

    if (date_to) {
      params.push(date_to);
      conditions.push(
        `a.appointment_date <= $${params.length}::timestamp`
      );
    }

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (origin) {
      params.push(origin);
      conditions.push(
        `a.appointment_origin = $${params.length}`
      );
    }

    const whereSQL =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const query = `
      SELECT 
        a.id,
        a.client_id,
        u.full_name AS cliente,
        u.email AS cliente_email,
        u.phone AS cliente_telefono,

        a.service_id,
        s.name AS servicio,
        s.duration_minutes,
        s.price AS service_price,

        -- ==========================================================
        -- IMPORTANTE:
        -- Se devuelve como texto SIN zona horaria.
        -- Evita que una cita de 11:00 aparezca como 05:00
        -- al convertirla el navegador.
        -- ==========================================================
        TO_CHAR(
          a.appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        TO_CHAR(
          a.appointment_date
            + (s.duration_minutes || ' minutes')::interval,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_end,

        a.status,
        ${getCalendarStatusSQL},
        ${getCalendarStatusLabelSQL},

        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,

        COALESCE(
          a.appointment_origin,
          'web'
        ) AS appointment_origin,

        a.created_at,
        a.updated_at

      FROM operations.appointments a
      LEFT JOIN auth.users u
        ON a.client_id = u.id
      LEFT JOIN operations.services s
        ON a.service_id = s.id

      ${whereSQL}

      ORDER BY a.appointment_date ASC;
    `;

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error('🔥 Error al obtener las citas:', error);

    res.status(500).json({
      message: 'Error interno del servidor al cargar las citas',
    });
  }
};

// =========================================================================
// 2. CONSULTAR DISPONIBILIDAD DE UN HORARIO
// =========================================================================

export const getAppointmentAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointment_date, service_id } = req.query;

    if (!appointment_date || !service_id) {
      res.status(400).json({
        message:
          'appointment_date y service_id son obligatorios',
      });
      return;
    }

    const availability = await checkAvailability(
      String(appointment_date),
      Number(service_id)
    );

    res.json(availability);
  } catch (error) {
    console.error(
      '🔥 Error al consultar disponibilidad:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al consultar disponibilidad',
    });
  }
};

// =========================================================================
// 3. OBTENER HORARIOS DISPONIBLES POR DÍA Y SERVICIO
// =========================================================================

export const getAvailableSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date, service_id } = req.query;

    if (!date || !service_id) {
      res.status(400).json({
        message: 'date y service_id son obligatorios',
      });
      return;
    }

    const serviceResult = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        duration_minutes,
        is_active
      FROM operations.services
      WHERE id = $1;
      `,
      [Number(service_id)]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Servicio no encontrado',
      });
      return;
    }

    const service = serviceResult.rows[0];

    if (service.is_active === false) {
      res.status(400).json({
        message: 'El servicio no está disponible actualmente',
        available_slots: [],
        all_slots: [],
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      res.status(400).json({
        message: 'La fecha debe tener el formato YYYY-MM-DD',
        available_slots: [],
        all_slots: [],
      });
      return;
    }

    const testDate = new Date(`${date}T12:00:00`);

    if (Number.isNaN(testDate.getTime())) {
      res.status(400).json({
        message: 'La fecha indicada no es válida',
        available_slots: [],
        all_slots: [],
      });
      return;
    }

    const nowMexico = getMexicoNow();
    const todayMexico = formatDateOnly(nowMexico);

    if (String(date) < todayMexico) {
      res.status(400).json({
        message: 'No se pueden consultar horarios de una fecha pasada',
        available_slots: [],
        all_slots: [],
      });
      return;
    }

    const day = testDate.getDay();

    if (day === 0) {
      res.json({
        date,
        service,
        available_slots: [],
        all_slots: [],
        message:
          'La estética no trabaja los domingos',
      });
      return;
    }

    const businessHours =
      day === 6
        ? { open: '10:00', close: '18:00' }
        : { open: '11:00', close: '19:00' };

    const addMinutesLocal = (
      fecha: Date,
      minutos: number
    ) => {
      return new Date(
        fecha.getTime() + minutos * 60000
      );
    };

    const pad = (n: number) =>
      String(n).padStart(2, '0');

    const formatDateForPostgresLocal = (
      fecha: Date
    ) => {
      const year = fecha.getFullYear();
      const month = pad(fecha.getMonth() + 1);
      const day = pad(fecha.getDate());
      const hour = pad(fecha.getHours());
      const minute = pad(fecha.getMinutes());
      const second = pad(fecha.getSeconds());

      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    const openDate = new Date(
      `${date}T${businessHours.open}:00`
    );

    const closeDate = new Date(
      `${date}T${businessHours.close}:00`
    );

    const allSlots = [];
    const availableSlots = [];

    let current = new Date(openDate);

    while (current < closeDate) {
      const startDate = new Date(current);

      const endDate = addMinutesLocal(
        startDate,
        Number(service.duration_minutes)
      );

      // Si la fecha solicitada es hoy, no mostramos como disponibles
      // las horas que ya pasaron ni la hora actual.
      if (
        String(date) === todayMexico &&
        startDate <= nowMexico
      ) {
        allSlots.push({
          time: formatDateForPostgresLocal(startDate)
            .substring(11, 16),

          appointment_date:
            formatDateForPostgresLocal(startDate),

          appointment_end:
            formatDateForPostgresLocal(endDate),

          available: false,
          conflicts: 0,
          reason: 'Este horario ya pasó',
        });

        current = addMinutesLocal(current, 30);
        continue;
      }

      if (endDate > closeDate) {
        allSlots.push({
          time: formatDateForPostgresLocal(startDate)
            .substring(11, 16),

          appointment_date:
            formatDateForPostgresLocal(startDate),

          appointment_end:
            formatDateForPostgresLocal(endDate),

          available: false,
          conflicts: 0,
          reason:
            'El servicio ya no cabe antes del cierre',
        });

        current = addMinutesLocal(current, 30);
        continue;
      }

      const conflictResult = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM operations.appointments a
        JOIN operations.services s
          ON s.id = a.service_id

        WHERE a.status IN ('pending', 'confirmed')

        AND a.appointment_date < $2::timestamp

        AND (
          a.appointment_date
          + (s.duration_minutes || ' minutes')::interval
        ) > $1::timestamp;
        `,
        [
          formatDateForPostgresLocal(startDate),
          formatDateForPostgresLocal(endDate),
        ]
      );

      const conflicts = Number(
        conflictResult.rows[0].total
      );

      const slot = {
        time:
          formatDateForPostgresLocal(startDate)
            .substring(11, 16),

        appointment_date:
          formatDateForPostgresLocal(startDate),

        appointment_end:
          formatDateForPostgresLocal(endDate),

        available:
          conflicts <
          MAX_SIMULTANEOUS_APPOINTMENTS,

        conflicts,

        reason:
          conflicts <
          MAX_SIMULTANEOUS_APPOINTMENTS
            ? 'Disponible'
            : 'Ocupado',
      };

      allSlots.push(slot);

      if (slot.available) {
        availableSlots.push(slot);
      }

      current = addMinutesLocal(current, 30);
    }

    res.json({
      date,
      service,
      business_hours: businessHours,
      available_slots: availableSlots,
      all_slots: allSlots,
    });
  } catch (error) {
    console.error(
      '🔥 Error al obtener horarios:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al obtener horarios',
    });
  }
};

// =========================================================================
// 4. CREAR CITA DESDE CLIENTE WEB / ALEXA
// =========================================================================

export const createAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      service_id,
      appointment_date,
      deposit_amount = 0,
      appointment_origin,
    } = req.body;

    const headerOrigin = String(
      req.headers['x-appointment-origin'] || ''
    ).toLowerCase();

    const requestedOrigin = String(
      headerOrigin || appointment_origin || 'web'
    ).toLowerCase();

    const origin = VALID_ORIGINS.includes(requestedOrigin)
      ? requestedOrigin
      : 'web';

    const client_id = (req as any).user?.id;

    if (!client_id) {
      res.status(401).json({
        message:
          'No se pudo identificar al cliente desde el token',
      });
      return;
    }

    if (!service_id || !appointment_date) {
      res.status(400).json({
        message:
          'service_id y appointment_date son obligatorios',
      });
      return;
    }

    const serviceIdNumber = Number(service_id);

    if (!Number.isInteger(serviceIdNumber) || serviceIdNumber <= 0) {
      res.status(400).json({
        message: 'service_id no es válido',
      });
      return;
    }

    const availability =
      await checkAvailability(
        appointment_date,
        serviceIdNumber
      );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const totalAmount = Number(
      availability.service.price
    );

    const depositAmount = Number(deposit_amount);

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount < 0 ||
      depositAmount > totalAmount
    ) {
      res.status(400).json({
        message:
          'El anticipo debe ser un monto válido entre 0 y el precio total del servicio',
      });
      return;
    }

    const query = `
      INSERT INTO operations.appointments (
        client_id,
        stylist_id,
        service_id,
        appointment_date,
        status,
        total_amount,
        deposit_amount,
        appointment_origin
      )
      VALUES (
        $1,
        NULL,
        $2,
        $3::timestamp,
        'pending',
        $4,
        $5,
        $6
      )

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      client_id,
      serviceIdNumber,
      appointment_date,
      totalAmount,
      depositAmount,
      origin,
    ]);

    res.status(201).json({
      message:
        origin === 'alexa'
          ? 'Cita registrada correctamente desde Alexa'
          : 'Cita registrada correctamente desde la web',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al crear la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno del servidor al crear la cita',
    });
  }
};

// =========================================================================
// 5. CREAR CITA MANUAL DESDE ADMINISTRADOR
// =========================================================================

export const createManualAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      client_id,
      service_id,
      appointment_date,
      deposit_amount = 0,
    } = req.body;

    if (
      !client_id ||
      !service_id ||
      !appointment_date
    ) {
      res.status(400).json({
        message:
          'client_id, service_id y appointment_date son obligatorios',
      });
      return;
    }

    const availability =
      await checkAvailability(
        appointment_date,
        Number(service_id)
      );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const totalAmount = Number(
      availability.service.price
    );

    const query = `
      INSERT INTO operations.appointments (
        client_id,
        stylist_id,
        service_id,
        appointment_date,
        status,
        total_amount,
        deposit_amount,
        appointment_origin
      )
      VALUES (
        $1,
        NULL,
        $2,
        $3::timestamp,
        'pending',
        $4,
        $5,
        'presencial'
      )

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      client_id,
      service_id,
      appointment_date,
      totalAmount,
      deposit_amount,
    ]);

    res.status(201).json({
      message:
        'Cita registrada manualmente como presencial',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al crear cita manual:',
      error
    );

    res.status(500).json({
      message:
        'Error interno del servidor al crear cita manual',
    });
  }
};

// =========================================================================
// 6. ACTUALIZAR ESTADO DE UNA CITA
// =========================================================================

export const updateAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  let { status } = req.body;

  try {
    if (!status) {
      res.status(400).json({
        message: 'El estado es obligatorio',
      });
      return;
    }

    status = normalizeStatus(status);

    if (!VALID_DB_STATUSES.includes(status)) {
      res.status(400).json({
        message: 'Estado no válido',
        allowed_statuses: VALID_DB_STATUSES,
      });
      return;
    }

    const query = `
      UPDATE operations.appointments
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message:
        'Estado actualizado correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al actualizar la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al actualizar la cita',
    });
  }
};

// =========================================================================
// 7. CERRAR CITA: FINALIZADA O NO ASISTIÓ
// =========================================================================

export const closeAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { outcome } = req.body;

  try {
    if (!outcome) {
      res.status(400).json({
        message:
          'El resultado de cierre es obligatorio: completed o no_show',
      });
      return;
    }

    if (
      !['completed', 'no_show'].includes(outcome)
    ) {
      res.status(400).json({
        message:
          'Resultado no válido. Usa completed o no_show',
      });
      return;
    }

    const query = `
      UPDATE operations.appointments
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [outcome, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const appointment = result.rows[0];

    let message = '';

    if (outcome === 'completed') {
      message =
        'Cita marcada como finalizada. El servicio sí se realizó.';
    }

    if (outcome === 'no_show') {
      message =
        'Cita marcada como no asistió. No se registra como servicio realizado.';
    }

    res.json({
      message,
      appointment,
    });
  } catch (error) {
    console.error(
      '🔥 Error al cerrar la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al cerrar la cita',
    });
  }
};

// =========================================================================
// 8. EDITAR FECHA/SERVICIO DE UNA CITA
// =========================================================================

export const updateAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const {
    service_id,
    appointment_date,
    deposit_amount,
  } = req.body;

  try {
    const currentQuery = `
      SELECT *
      FROM operations.appointments
      WHERE id = $1;
    `;

    const currentResult = await pool.query(
      currentQuery,
      [id]
    );

    if (currentResult.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const currentAppointment =
      currentResult.rows[0];

    const newServiceId =
      service_id ||
      currentAppointment.service_id;

    const newAppointmentDate =
      appointment_date ||
      currentAppointment.appointment_date;

    const availability =
      await checkAvailability(
        String(newAppointmentDate),
        Number(newServiceId),
        Number(id)
      );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const newTotalAmount = Number(
      availability.service.price
    );

    const query = `
      UPDATE operations.appointments

      SET
        service_id = $1,
        appointment_date = $2::timestamp,
        total_amount = $3,
        deposit_amount =
          COALESCE($4, deposit_amount),
        status = 'pending'

      WHERE id = $5

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      newServiceId,
      newAppointmentDate,
      newTotalAmount,
      deposit_amount ?? null,
      id,
    ]);

    res.json({
      message:
        'Cita actualizada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al editar cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al editar la cita',
    });
  }
};

// =========================================================================
// 9. CANCELAR CITA
// =========================================================================

export const cancelAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE operations.appointments
      SET status = 'canceled'
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message:
        'Cita cancelada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al cancelar cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al cancelar la cita',
    });
  }
};

