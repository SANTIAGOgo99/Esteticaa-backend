// src/config/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '26769'),
    database: process.env.DB_NAME,
    // 🌟 El escudo de seguridad obligatorio para Aiven
    ssl: {
        rejectUnauthorized: false 
    },
    // 🌟 NUEVO: Tiempos de espera para evitar bloqueos por microcortes de internet
    connectionTimeoutMillis: 10000, // Da error si tarda más de 10 seg en conectar
    idleTimeoutMillis: 30000        // Cierra conexiones inactivas para no saturar Aiven
});

// ✅ PRUEBA DE CONEXIÓN ÚNICA (Evita el spam en consola y errores de TS)
pool.query('SELECT NOW()')
  .then(() => {
      console.log('✅ Base de Datos PostgreSQL conectada con éxito');
  })
  .catch((err) => {
      console.error('❌ Error conectando a PostgreSQL', err);
  });

// 🌟 FIX: Atrapa los microcortes de red en segundo plano para que el servidor no "crashee"
pool.on('error', (err) => {
    console.error('⚠️ Microcorte de red con la BD:', err.message);
});

export default pool;