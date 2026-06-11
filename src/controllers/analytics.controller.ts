// src/controllers/analytics.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// =========================================================================
// MODELO LOGÍSTICO  P(t) = L / (1 + C·e^(-k·t))
// Parámetros derivados de la memoria de cálculo:
//   L  = 24  (capacidad máxima semanal)
//   C  = 1   (constante de integración con P(0) = 12)
//   k  = 0.5493  (tasa de crecimiento, ajustada con P(2) = 18)
// =========================================================================
const LOGISTIC_L = 24;     // Capacidad máxima (citas/semana)
const LOGISTIC_C = 1;      // Constante de integración
const LOGISTIC_K = 0.5493; // Tasa de crecimiento

/** P(t) = L / (1 + C·e^{-k·t}) */
function logisticPredict(t: number): number {
    const val = LOGISTIC_L / (1 + LOGISTIC_C * Math.exp(-LOGISTIC_K * t));
    return parseFloat(val.toFixed(2));
}

/** Construye tabla histórica + predicciones futuras con el modelo logístico */
function buildLogisticTable(
    historico: { semana: number; citas: number }[],
    semanasFuturas = 4
) {
    const historicRows = historico.map(h => ({
        t:        h.semana - 1,
        semana:   `Semana ${h.semana}`,
        real:     h.citas,
        estimado: logisticPredict(h.semana - 1)
    }));

    const lastSemana = historico.length > 0 ? historico[historico.length - 1].semana : 3;
    const futureRows = Array.from({ length: semanasFuturas }, (_, i) => {
        const s = lastSemana + i + 1;
        return {
            t:        s - 1,
            semana:   `Semana ${s}`,
            real:     null,
            estimado: logisticPredict(s - 1)
        };
    });

    return [...historicRows, ...futureRows];
}

// ── Regresión lineal simple (se mantiene para cálculos de tendencia diaria) ──
function linearRegression(points: { x: number; y: number }[]) {
    const n = points.length;
    if (n < 2) return {
        slope: 0,
        intercept: points[0]?.y ?? 0,
        predict: (_x: number) => points[0]?.y ?? 0
    };
    const sumX  = points.reduce((a, p) => a + p.x, 0);
    const sumY  = points.reduce((a, p) => a + p.y, 0);
    const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
    const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
    const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return {
        slope:     parseFloat(slope.toFixed(3)),
        intercept: parseFloat(intercept.toFixed(3)),
        predict:   (x: number) => Math.max(0, Math.round(intercept + slope * x))
    };
}

// =========================================================================
// ENDPOINT: ANALÍTICAS GENERALES
// =========================================================================
export const getBusinessAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. INVENTARIO
        const inventoryRes = await pool.query(`
            SELECT
                COUNT(id)                                    AS total_products,
                COALESCE(SUM(stock), 0)                      AS total_items_in_stock,
                COUNT(CASE WHEN stock <= 5 THEN 1 END)       AS low_stock_alerts
            FROM inventory.products
            WHERE is_active = true
        `);

        // 2. TOP 5 SERVICIOS
        const topServicesRes = await pool.query(`
            SELECT
                s.name       AS servicio,
                s.category   AS categoria,
                s.price      AS precio,
                COUNT(a.id)  AS total_agendado,
                ROUND(COUNT(a.id) * COALESCE(s.price, 0), 2) AS ingreso_estimado
            FROM operations.appointments a
            JOIN operations.services s ON a.service_id = s.id
            WHERE a.status NOT IN ('canceled')
            GROUP BY s.name, s.category, s.price
            ORDER BY total_agendado DESC
            LIMIT 5
        `);

        // 3. TENDENCIA DIARIA (últimos 30 días)
        const trendRes = await pool.query(`
            SELECT
                TO_CHAR(DATE(appointment_date), 'DD/MM') AS fecha_label,
                DATE(appointment_date)                    AS fecha,
                COUNT(id)                                 AS citas
            FROM operations.appointments
            WHERE
                status NOT IN ('canceled')
                AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(appointment_date)
            ORDER BY fecha ASC
        `);

        // 4. HORAS PICO
        const horasPicoRes = await pool.query(`
            SELECT
                EXTRACT(HOUR FROM appointment_date)::int AS hora,
                COUNT(id)                                 AS citas
            FROM operations.appointments
            WHERE status NOT IN ('canceled')
            GROUP BY hora
            ORDER BY hora ASC
        `);

        // 5. RETENCIÓN
        const retencionRes = await pool.query(`
            SELECT
                COUNT(DISTINCT client_id)                       AS total_clientes_unicos,
                COUNT(DISTINCT CASE
                    WHEN citas_por_cliente > 1 THEN client_id
                END)                                            AS clientes_recurrentes
            FROM (
                SELECT client_id, COUNT(id) AS citas_por_cliente
                FROM operations.appointments
                WHERE status NOT IN ('canceled')
                GROUP BY client_id
            ) sub
        `);

        // 6. HISTÓRICO SEMANAL (para modelo logístico)
        const semanalRes = await pool.query(`
            WITH semanas AS (
                SELECT
                    CEIL(
                        (DATE(appointment_date) - MIN(DATE(appointment_date)) OVER () + 1)::numeric / 7
                    )::int                                          AS semana_num,
                    id
                FROM operations.appointments
                WHERE status NOT IN ('canceled')
            )
            SELECT
                semana_num,
                COUNT(id) AS total_citas
            FROM semanas
            WHERE semana_num BETWEEN 1 AND 10
            GROUP BY semana_num
            ORDER BY semana_num
        `);

        // 7. DATOS PARA TENDENCIA DIARIA (modelo lineal auxiliar)
        const predictiveRes = await pool.query(`
            WITH citas_por_dia AS (
                SELECT
                    DATE(appointment_date)                              AS fecha,
                    ROW_NUMBER() OVER (ORDER BY DATE(appointment_date)) AS dia_num,
                    COUNT(id)                                           AS citas_diarias
                FROM operations.appointments
                WHERE status NOT IN ('canceled')
                GROUP BY DATE(appointment_date)
            )
            SELECT
                COUNT(*)                                                  AS dias_historicos,
                COALESCE(SUM(citas_diarias), 0)                           AS total_citas,
                COALESCE(ROUND(AVG(citas_diarias), 2), 0)                 AS p_prom,
                JSON_AGG(
                    JSON_BUILD_OBJECT('x', dia_num, 'y', citas_diarias)
                    ORDER BY dia_num
                )                                                         AS serie_puntos
            FROM citas_por_dia;
        `);

        // 8. INGRESOS DIARIOS
        const ingresosRes = await pool.query(`
            SELECT
                TO_CHAR(DATE(a.appointment_date), 'DD/MM') AS fecha_label,
                DATE(a.appointment_date)                    AS fecha,
                COALESCE(SUM(s.price), 0)                   AS ingreso_dia
            FROM operations.appointments a
            JOIN operations.services s ON a.service_id = s.id
            WHERE
                a.status = 'confirmed'
                AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(a.appointment_date)
            ORDER BY fecha ASC
        `);

        // 9. CITAS POR CATEGORÍA
        const categoriaRes = await pool.query(`
            SELECT
                s.category             AS categoria,
                COUNT(a.id)            AS total_citas,
                ROUND(AVG(s.price), 2) AS precio_promedio
            FROM operations.appointments a
            JOIN operations.services s ON a.service_id = s.id
            WHERE a.status NOT IN ('canceled')
            GROUP BY s.category
            ORDER BY total_citas DESC
        `);

        // ── Modelo logístico ─────────────────────────────────────────────────
        const historicoSemanal: { semana: number; citas: number }[] =
            semanalRes.rows.length > 0
                ? semanalRes.rows.map((r: any) => ({
                    semana: parseInt(r.semana_num),
                    citas:  parseInt(r.total_citas)
                  }))
                : [
                    { semana: 1, citas: 12 },
                    { semana: 2, citas: 16 },
                    { semana: 3, citas: 18 }
                  ];

        const tablaLogistica = buildLogisticTable(historicoSemanal, 4);
        const prediccionesLogisticas = {
            semana4: logisticPredict(3),
            semana5: logisticPredict(4),
            semana6: logisticPredict(5),
        };

        // ── Tendencia diaria (modelo lineal) ─────────────────────────────────
        const dataPred    = predictiveRes.rows[0];
        const p_prom      = parseFloat(dataPred.p_prom) || 0;
        const seriePuntos: { x: number; y: number }[] = dataPred.serie_puntos ?? [];
        const diasBase    = parseInt(dataPred.dias_historicos) || 0;
        const regression  = linearRegression(seriePuntos);

        const tendencia: 'creciendo' | 'estable' | 'bajando' =
            regression.slope > 0.1  ? 'creciendo' :
            regression.slope < -0.1 ? 'bajando'   : 'estable';

        const retData         = retencionRes.rows[0];
        const totalClientes   = parseInt(retData.total_clientes_unicos) || 0;
        const clientesRepiten = parseInt(retData.clientes_recurrentes)  || 0;
        const tasaRetencion   = totalClientes > 0
            ? parseFloat(((clientesRepiten / totalClientes) * 100).toFixed(1))
            : 0;

        const ingresoTotalEstimado = topServicesRes.rows.reduce(
            (sum: number, r: any) => sum + parseFloat(r.ingreso_estimado), 0
        );

        res.status(200).json({
            success: true,
            data: {
                inventario: {
                    totalProductos:   parseInt(inventoryRes.rows[0].total_products),
                    stockTotal:       parseInt(inventoryRes.rows[0].total_items_in_stock),
                    alertasStockBajo: parseInt(inventoryRes.rows[0].low_stock_alerts)
                },
                serviciosPopulares: topServicesRes.rows.map((r: any) => ({
                    servicio:        r.servicio,
                    categoria:       r.categoria,
                    totalAgendado:   parseInt(r.total_agendado),
                    ingresoEstimado: parseFloat(r.ingreso_estimado)
                })),
                categorias: categoriaRes.rows.map((r: any) => ({
                    categoria:      r.categoria,
                    totalCitas:     parseInt(r.total_citas),
                    precioPromedio: parseFloat(r.precio_promedio)
                })),
                tendenciaDiaria: trendRes.rows.map((r: any) => ({
                    fecha: r.fecha_label,
                    citas: parseInt(r.citas)
                })),
                ingresosDiarios: ingresosRes.rows.map((r: any) => ({
                    fecha:   r.fecha_label,
                    ingreso: parseFloat(r.ingreso_dia)
                })),
                horasPico: horasPicoRes.rows.map((r: any) => ({
                    hora:  parseInt(r.hora),
                    citas: parseInt(r.citas),
                    label: `${String(r.hora).padStart(2, '0')}:00`
                })),
                retencion: {
                    totalClientes,
                    clientesRecurrentes: clientesRepiten,
                    tasaPorcentaje:      tasaRetencion
                },
                modeloPredictivo: {
                    tipo:             'logistico',
                    descripcion:      'Modelo logístico P(t) = L / (1 + C·e^(-k·t))',
                    diasAnalizados:   diasBase,
                    totalCitas:       parseInt(dataPred.total_citas),
                    promedioDiarioActual: p_prom,
                    tendencia,
                    parametrosModelo: {
                        L:       LOGISTIC_L,
                        C:       LOGISTIC_C,
                        k:       LOGISTIC_K,
                        formula: `P(t) = ${LOGISTIC_L} / (1 + ${LOGISTIC_C}·e^(-${LOGISTIC_K}·t))`
                    },
                    historicoSemanal,
                    tablaLogistica,
                    prediccionesLogisticas,
                    capacidadMaxima:      LOGISTIC_L,
                    ingresoTotalEstimado: parseFloat(ingresoTotalEstimado.toFixed(2))
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener analíticas:', error);
        res.status(500).json({ success: false, message: 'Error interno al calcular analíticas.' });
    }
};

// =========================================================================
// ENDPOINT: PREDICCIÓN DE DEMANDA DE SERVICIOS
// =========================================================================
export const getServiceDemandPrediction = async (req: Request, res: Response): Promise<void> => {
    try {
        const mesActual = new Date().getMonth() + 1;

        const factoresTemporada: Record<number, number> = {
            1: 1.05, 2: 0.95, 3: 1.0,  4: 1.05,
            5: 1.1,  6: 1.05, 7: 1.0,  8: 1.0,
            9: 1.0, 10: 1.0, 11: 1.05, 12: 1.2
        };
        const factorMes = factoresTemporada[mesActual] ?? 1.0;

        const query = `
            WITH citas_ventana AS (
                SELECT
                    s.id,
                    s.name,
                    s.category,
                    s.price,
                    COUNT(*)                                                              AS total_ultimos_30d,
                    SUM(CASE WHEN DATE(a.appointment_date) >= CURRENT_DATE - INTERVAL '7 days'
                             AND DATE(a.appointment_date) < CURRENT_DATE
                             THEN 1 ELSE 0 END)                                           AS citas_ultima_semana,
                    SUM(CASE WHEN DATE(a.appointment_date) >= CURRENT_DATE - INTERVAL '14 days'
                             AND DATE(a.appointment_date) < CURRENT_DATE - INTERVAL '7 days'
                             THEN 1 ELSE 0 END)                                           AS citas_semana_anterior,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 0 THEN 1 ELSE 0 END) AS dow_dom,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 1 THEN 1 ELSE 0 END) AS dow_lun,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 2 THEN 1 ELSE 0 END) AS dow_mar,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 3 THEN 1 ELSE 0 END) AS dow_mie,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 4 THEN 1 ELSE 0 END) AS dow_jue,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 5 THEN 1 ELSE 0 END) AS dow_vie,
                    SUM(CASE WHEN EXTRACT(DOW FROM a.appointment_date) = 6 THEN 1 ELSE 0 END) AS dow_sab
                FROM operations.appointments a
                JOIN operations.services s ON a.service_id = s.id
                WHERE
                    a.status NOT IN ('canceled')
                    AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
                    AND a.appointment_date < CURRENT_DATE
                GROUP BY s.id, s.name, s.category, s.price
            )
            SELECT * FROM citas_ventana
            ORDER BY total_ultimos_30d DESC
            LIMIT 10;
        `;

        const result = await pool.query(query);
        const rows   = result.rows;

        const serviciosConPrediccion = rows.map((row: any) => {
            const ultimaSemana   = parseInt(row.citas_ultima_semana)   || 0;
            const semanaAnterior = parseInt(row.citas_semana_anterior) || 0;
            const total30d       = parseInt(row.total_ultimos_30d)     || 0;

            let tendenciaPct = 0;
            if (semanaAnterior > 0) {
                tendenciaPct = ((ultimaSemana - semanaAnterior) / semanaAnterior) * 100;
            } else if (ultimaSemana > 0) {
                tendenciaPct = 100;
            }

            const direccion: 'up' | 'down' | 'stable' =
                tendenciaPct >  5 ? 'up'   :
                tendenciaPct < -5 ? 'down' : 'stable';

            let baseSemanal = ultimaSemana;
            if (baseSemanal === 0 && total30d > 0) {
                baseSemanal = Math.round(total30d / 4.3);
            }

            let factorTendencia = 1.0;
            if (direccion === 'up') {
                factorTendencia = 1 + Math.min(0.5, tendenciaPct / 100);
            } else if (direccion === 'down') {
                factorTendencia = 1 - Math.min(0.5, Math.abs(tendenciaPct) / 100);
            }

            const prediccionBase = Math.round(baseSemanal * factorTendencia);
            const prediccion     = Math.max(0, Math.round(prediccionBase * factorMes));

            const dowCounts = [
                parseInt(row.dow_dom) || 0,
                parseInt(row.dow_lun) || 0,
                parseInt(row.dow_mar) || 0,
                parseInt(row.dow_mie) || 0,
                parseInt(row.dow_jue) || 0,
                parseInt(row.dow_vie) || 0,
                parseInt(row.dow_sab) || 0,
            ];
            const totalDow     = dowCounts.reduce((s, v) => s + v, 0) || 1;
            const distribucion = dowCounts.map((v, i) => ({
                dia:        ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][i],
                proporcion: parseFloat((v / totalDow).toFixed(3)),
                estimado:   Math.round((prediccion * v) / totalDow)
            }));

            return {
                servicio:                row.name,
                categoria:               row.category,
                precio:                  parseFloat(row.price),
                reservasUltimos30d:      total30d,
                ultimaSemana,
                semanaAnterior,
                tendencia: {
                    porcentaje: parseFloat(tendenciaPct.toFixed(1)),
                    direccion
                },
                factorTemporada:         factorMes,
                prediccionProximaSemana: prediccion,
                distribucionDias:        distribucion
            };
        });

        const sorted = [...serviciosConPrediccion].sort((a, b) => {
            const scoreA = a.reservasUltimos30d * (a.tendencia.direccion === 'up' ? 1.25 : a.tendencia.direccion === 'down' ? 0.75 : 1);
            const scoreB = b.reservasUltimos30d * (b.tendencia.direccion === 'up' ? 1.25 : b.tendencia.direccion === 'down' ? 0.75 : 1);
            return scoreB - scoreA;
        });

        res.status(200).json({
            success: true,
            data: {
                servicios:       sorted.slice(0, 5),
                factorTemporada: factorMes,
                mesActual,
                periodo:         'últimos 30 días',
                fechaCalculo:    new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error en predicción de servicios:', error);
        res.status(500).json({ success: false, message: 'Error al calcular la predicción de servicios.' });
    }
};

// =========================================================================
// ENDPOINT: HISTÓRICO DE CITAS CON FILTRO POR CATEGORÍA
// =========================================================================
export const getHistoricalAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoria, semana } = req.query;

        // Filtro de categoría
        const categoriaFilter = categoria && categoria !== 'todas'
            ? `AND s.category = $1`
            : '';
        const queryParams: string[] = categoria && categoria !== 'todas'
            ? [categoria as string]
            : [];

        // Todas las citas históricas con su semana calculada
        const citasRes = await pool.query(`
            WITH base AS (
                SELECT
                    a.id,
                    DATE(a.appointment_date)                                         AS fecha,
                    TO_CHAR(a.appointment_date, 'HH24:MI')                           AS hora,
                    s.name                                                            AS servicio,
                    s.category                                                        AS categoria,
                    u.full_name                                                       AS estilista,
                    a.status                                                          AS estado,
                    MIN(DATE(a.appointment_date)) OVER ()                             AS primera_fecha
                FROM operations.appointments a
                JOIN operations.services s ON a.service_id = s.id
                LEFT JOIN auth.users u ON a.stylist_id = u.id
                ORDER BY a.appointment_date DESC
            ),
            con_semana AS (
                SELECT *,
                    CEIL((fecha - primera_fecha + 1)::numeric / 7)::int AS semana_num
                FROM base
            )
            SELECT
                id, fecha, hora, servicio, categoria, estilista, estado, semana_num
            FROM con_semana
            WHERE 1=1
            ${categoriaFilter}
            ${semana && semana !== '0' ? `AND semana_num = ${parseInt(semana as string)}` : ''}
            ORDER BY fecha DESC, hora DESC
            LIMIT 200
        `, queryParams);

        // Totales por semana (para la tabla resumen)
        const semanalRes = await pool.query(`
            WITH base AS (
                SELECT
                    DATE(appointment_date)                                            AS fecha,
                    MIN(DATE(appointment_date)) OVER ()                              AS primera_fecha,
                    s.category
                FROM operations.appointments a
                JOIN operations.services s ON a.service_id = s.id
                WHERE a.status NOT IN ('canceled')
            ),
            con_semana AS (
                SELECT *,
                    CEIL((fecha - primera_fecha + 1)::numeric / 7)::int AS semana_num
                FROM base
            )
            SELECT
                semana_num,
                COUNT(*)        AS total_citas,
                COUNT(DISTINCT category) AS categorias_activas
            FROM con_semana
            GROUP BY semana_num
            ORDER BY semana_num
        `);

        // Distribución por categoría y semana
        const distribucionRes = await pool.query(`
            WITH base AS (
                SELECT
                    DATE(a.appointment_date)                                         AS fecha,
                    MIN(DATE(a.appointment_date)) OVER ()                            AS primera_fecha,
                    s.category
                FROM operations.appointments a
                JOIN operations.services s ON a.service_id = s.id
                WHERE a.status NOT IN ('canceled')
            ),
            con_semana AS (
                SELECT *,
                    CEIL((fecha - primera_fecha + 1)::numeric / 7)::int AS semana_num
                FROM base
            )
            SELECT
                semana_num,
                category AS categoria,
                COUNT(*) AS total
            FROM con_semana
            GROUP BY semana_num, category
            ORDER BY semana_num, total DESC
        `);

        // Lista de categorías disponibles
        const categoriasRes = await pool.query(`
            SELECT DISTINCT category AS categoria
            FROM operations.services
            ORDER BY category
        `);

        // Totales generales del histórico
        const totalesRes = await pool.query(`
            SELECT
                COUNT(*)                                    AS total_registros,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS completadas,
                COUNT(CASE WHEN status = 'canceled'  THEN 1 END) AS canceladas,
                COUNT(CASE WHEN status = 'pending'   THEN 1 END) AS pendientes
            FROM operations.appointments
        `);

        res.status(200).json({
            success: true,
            data: {
                citas: citasRes.rows.map((r: any) => ({
                    id:        r.id,
                    fecha:     r.fecha,
                    hora:      r.hora,
                    servicio:  r.servicio,
                    categoria: r.categoria,
                    estilista: r.estilista || 'Sin asignar',
                    estado:    r.estado,
                    semana:    r.semana_num
                })),
                totalesSemana: semanalRes.rows.map((r: any) => ({
                    semana:             `Semana ${r.semana_num}`,
                    semanaNum:          parseInt(r.semana_num),
                    totalCitas:         parseInt(r.total_citas),
                    categoriasActivas:  parseInt(r.categorias_activas),
                    interpretacion:     parseInt(r.semana_num) === 1 ? 'Demanda inicial' :
                                        parseInt(r.total_citas) >= 18 ? 'Demanda alta' : 'Crecimiento moderado'
                })),
                distribucionPorSemana: distribucionRes.rows.map((r: any) => ({
                    semana:    parseInt(r.semana_num),
                    categoria: r.categoria,
                    total:     parseInt(r.total)
                })),
                categorias: ['todas', ...categoriasRes.rows.map((r: any) => r.categoria)],
                totales: {
                    total:      parseInt(totalesRes.rows[0].total_registros),
                    completadas: parseInt(totalesRes.rows[0].completadas),
                    canceladas:  parseInt(totalesRes.rows[0].canceladas),
                    pendientes:  parseInt(totalesRes.rows[0].pendientes)
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener historial de citas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener datos históricos.' });
    }
};