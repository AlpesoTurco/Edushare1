const express = require('express');
const incidencias_controller = express.Router(); 
const connections = require('../database/db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// === Uploads ===
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// === Utilidad: borrar archivos ante rollback ===
function borrarArchivos(files) {
  (files || []).forEach(f => {
    try { fs.unlinkSync(f.path); } catch (_) {}
  });
}

// === POST /incidencias — Crea incidencia + adjuntos (transacción) ===
incidencias_controller.post('/incidencias', upload.array('files', 10), (req, res) => {
  // 1) Parseo + validación
  let { id_usuario, tipo, modalidad, inicio, fin, hInicio, hFin, goce, motivo } = req.body;

  id_usuario = parseInt(id_usuario, 10);
  tipo = (tipo || '').trim();                 // 'retardo'|'falta'|'salida_anticipada'|'sin_registro'|'otro'
  modalidad = (modalidad || '').trim();       // 'por-dias'|'por-horas'
  inicio = (inicio || '').trim();             // 'YYYY-MM-DD'
  fin = (fin || '').trim();                   // 'YYYY-MM-DD' (opcional)
  hInicio = (hInicio || '').trim();           // 'HH:mm' (solo por-horas)
  hFin = (hFin || '').trim();                 // 'HH:mm' (solo por-horas)
  motivo = (motivo || '').trim();             // UI máx 300 (DB puede ser VARCHAR/TEXT)
  const goce_sueldo = goce === 'con-goce' ? 1 : 0; // opcional

  if (!id_usuario || !tipo || !modalidad || !inicio || !motivo) {
    borrarArchivos(req.files);
    return res.status(400).json({ ok: false, msg: 'Faltan datos requeridos.' });
  }
  const TIPOS_VALIDOS = ['retardo','falta','salida_anticipada','sin_registro','otro'];
  if (!TIPOS_VALIDOS.includes(tipo)) {
    borrarArchivos(req.files);
    return res.status(400).json({ ok: false, msg: 'Tipo de incidencia no válido.' });
  }
  if (!['por-dias', 'por-horas'].includes(modalidad)) {
    borrarArchivos(req.files);
    return res.status(400).json({ ok: false, msg: 'Modalidad no válida.' });
  }
  if (motivo.length > 300) {
    borrarArchivos(req.files);
    return res.status(400).json({ ok: false, msg: 'Motivo supera 300 caracteres.' });
  }

  // Normalizar fechas/horas según modalidad (paridad con frontend)
  if (modalidad === 'por-dias') {
    if (!fin) fin = inicio;
    hInicio = null;
    hFin = null;
  } else {
    // por-horas
    if (!hInicio || !hFin) {
      borrarArchivos(req.files);
      return res.status(400).json({ ok: false, msg: 'Indica hora inicio y fin para modalidad por horas.' });
    }
    if (!fin) fin = inicio; // si cruza medianoche, frontend ya manda fin = inicio+1
  }

  // 2) Transacción
  connections.beginTransaction(errTx => {
    if (errTx) {
      borrarArchivos(req.files);
      console.error('beginTransaction error:', errTx);
      return res.status(500).json({ ok: false, msg: 'No se pudo iniciar la transacción.' });
    }

    // 2.1) Insert en incidencias
    const sqlInc = `
      INSERT INTO incidencias
        (id_usuario, tipo, modalidad, estatus, id_aprobador, comentario_resolucion,
         fecha_inicio, fecha_fin, hora_inicio, hora_fin,
         goce_sueldo, motivo, observaciones)
      VALUES
        (?, ?, ?, 'Pendiente', NULL, NULL,
         ?, ?, ?, ?,
         ?, ?, NULL)
    `;
    const paramsInc = [
      id_usuario, tipo, modalidad,
      inicio, fin || null, hInicio || null, hFin || null,
      goce_sueldo, motivo || null
    ];

    connections.query(sqlInc, paramsInc, (errInc, resultInc) => {
      if (errInc) {
        console.error('Error insertando incidencia:', errInc);
        return connections.rollback(() => {
          borrarArchivos(req.files);
          // Causas típicas: FK de usuario, ENUM/modalidad inválida, CHECKs de rango, etc.
          return res.status(500).json({ ok: false, msg: 'Error al crear incidencia.' });
        });
      }

      const id_incidencia = resultInc.insertId;
      const files = req.files || [];

      // 2.2) Sin adjuntos => commit
      if (!files.length) {
        return connections.commit(commitErr => {
          if (commitErr) {
            console.error('commit error sin adjuntos:', commitErr);
            return res.status(500).json({ ok: false, msg: 'Error al confirmar transacción.' });
          }
          return res.json({ ok: true, id_incidencia, estatus: 'Pendiente', saved_files: 0 });
        });
      }

      // 2.3) Insert batch en incidencia_adjuntos
      const sqlAdj = `
        INSERT INTO incidencia_adjuntos
          (id_incidencia, nombre_original, ruta, mime, tamano)
        VALUES ?
      `;
      const values = files.map(f => [
        id_incidencia,
        f.originalname,
        path.join('uploads', path.basename(f.path)).replace(/\\/g, '/'),
        f.mimetype || null,
        f.size || null
      ]);

      connections.query(sqlAdj, [values], (errAdj, resultAdj) => {
        if (errAdj) {
          console.error('Error insertando adjuntos:', errAdj);
          return connections.rollback(() => {
            borrarArchivos(files);
            return res.status(500).json({
              ok: false,
              msg: 'No se pudo registrar adjuntos; operación revertida.'
            });
          });
        }

        // 2.4) Commit final
        connections.commit(commitErr => {
          if (commitErr) {
            console.error('commit error con adjuntos:', commitErr);
            borrarArchivos(files);
            return res.status(500).json({ ok: false, msg: 'Error al confirmar transacción.' });
          }
          return res.json({
            ok: true,
            id_incidencia,
            estatus: 'Pendiente',
            saved_files: resultAdj.affectedRows
          });
        });
      });
    });
  });
});

module.exports = incidencias_controller;
