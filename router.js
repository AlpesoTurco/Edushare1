
const { Router } = require('express');
const router = Router();
const requireAuthView = require('./middlewares/requireAuthView');
const connections = require('./database/db');

/** Helper: wrap async to evitar try/catch repetido */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Helper: crea rutas que solo renderizan vistas */
const renderRoute = (path, view, middlewares = []) => {
  router.get(
    path,
    ...middlewares,
    (req, res) => res.render(view)
  );
};

/* ========= RUTAS PÚBLICAS ========= */
renderRoute('/login', 'login'); 

/* ========= RUTAS PROTEGIDAS ========= */
const auth = [requireAuthView];


// Dispositivos, Actividad, Configuración, Nuevo Usuario, Perfil
renderRoute('/dispositivos', 'dispositivos', auth);
renderRoute('/nuevousuario', 'nuevousuario', auth);
renderRoute('/actividad', 'actividad', auth);


//mi actividad
// helper: normaliza parámetros
function parseFilters(query) {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(query.perPage || '20', 10), 1), 100);
  const offset = (page - 1) * perPage;

  const filtros = {
    q: (query.q || '').trim(),
    kind: (query.kind || '').trim(),           // 'permiso' | 'incidencia' | ''
    estatus: (query.estatus || '').trim(),     // 'Pendiente' | 'Aprobado' | ...
    desde: (query.desde || '1970-01-01'),
    hasta: (query.hasta || '2100-12-31'),
    page, perPage, offset
  };
  return filtros;
}

// Mapea de estatus_badge -> clases Tailwind (por si las quieres en server)
function badgeClass(estatus) {
  switch (estatus) {
    case 'Pendiente': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Aprobado':  return 'bg-green-50 text-green-700 border border-green-200';
    case 'Rechazado': return 'bg-red-50 text-red-700 border border-red-200';
    case 'Cancelado': return 'bg-gray-50 text-gray-700 border border-gray-200';
    default:          return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
}

// GET /miactividad
router.get('/miactividad', auth, async (req, res) => {
  const f = parseFilters(req.query);

  // WHERE dinámico
  const where = [];
  const params = [];

  // Texto libre (empleado, motivo, tipo)
  if (f.q) {
    where.push(`(empleado LIKE CONCAT('%', ?, '%') OR motivo LIKE CONCAT('%', ?, '%') OR tipo LIKE CONCAT('%', ?, '%'))`);
    params.push(f.q, f.q, f.q);
  }
  if (f.kind) {
    where.push(`kind = ?`);
    params.push(f.kind);
  }
  if (f.estatus) {
    where.push(`estatus = ?`);
    params.push(f.estatus);
  }
  // Rango de fechas (usa fecha_principal que ya trae YYYY-MM-DD)
  where.push(`fecha_principal BETWEEN ? AND ?`);
  params.push(f.desde, f.hasta);

  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

  // Consulta principal + conteo total
  const sqlData = `
    SELECT *
    FROM vw_bandeja_solicitudes
    ${whereSql}
    ORDER BY COALESCE(creado_en, fecha_ini) DESC, kind, id
    LIMIT ? OFFSET ?;
  `;
  const sqlCount = `
    SELECT COUNT(*) AS total
    FROM vw_bandeja_solicitudes
    ${whereSql};
  `;

  // Badges por kind
  const sqlBadges = `
    SELECT kind, COUNT(*) AS total
    FROM vw_bandeja_solicitudes
    ${whereSql}
    GROUP BY kind;
  `;

  try {
    const [rows, countRows, badgeRows] = await Promise.all([
      q(sqlData, [...params, f.perPage, f.offset]),
      q(sqlCount, params),
      q(sqlBadges, params)
    ]);

    const total = countRows?.[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / f.perPage), 1);

    // Conteos separados para Permisos / Incidencias
    const badgePermisos = badgeRows.find(r => r.kind === 'permiso')?.total || 0;
    const badgeIncidencias = badgeRows.find(r => r.kind === 'incidencia')?.total || 0;

    // Render
    res.render('miactividad', {
      inbox: rows.map(r => ({
        ...r,
        // por si adjuntos_json viene como string JSON en tu driver:
        adjuntos: Array.isArray(r.adjuntos_json) ? r.adjuntos_json : (r.adjuntos_json ? JSON.parse(r.adjuntos_json) : []),
        estatusClass: badgeClass(r.estatus)
      })),
      badgePermisos,
      badgeIncidencias,
      total, totalPages,
      filters: f
    });
  } catch (err) {
    console.error('Error en /miactividad:', err);
    res.status(500).send('Error al cargar la bandeja de solicitudes');
  }
});



// helper
const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    connections.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// home
router.get('/home', ...auth, async (req, res) => {
  
  try {
    
    const [usuariosActivos, dispositivos, horariosActivos, asistenciasRecientes, kpis, ultimoAcceso, motivos] = await Promise.all([
      q(`
        SELECT id_usuario, CONCAT_WS(' ', nombre, apellido_paterno, apellido_materno) AS nombre_completo
        FROM usuarios
        WHERE activo = 1
        ORDER BY nombre, apellido_paterno, apellido_materno
      `),
      q(`SELECT id_dispositivo, nombre_dispositivo, ubicacion FROM dispositivos ORDER BY id_dispositivo`),
      q(`SELECT id_horario, nombre_horario FROM horarios_semanales WHERE activo = 1 ORDER BY nombre_horario`),
      q(`
        SELECT * 
          FROM vw_asistencias_semaforo
          ORDER BY fecha DESC, hora DESC
          LIMIT 20;
      `),
      q(`
        SELECT 
          (SELECT COUNT(*) FROM asistencias INNER JOIN motivos ON id_motivo = motivofk WHERE fecha = CURDATE() AND nombre_motivo = 'Entrada')  AS asistencias_hoy,
          (SELECT COUNT(*) FROM incidencias  WHERE estatus = 'Pendiente') AS incidencias_pendientes,
          (SELECT COUNT(*) FROM permisos    WHERE estatus = 'Pendiente')  AS permisos_pendientes
      `),
      q(`
        SELECT 
          a.id_asistencia, a.fecha, a.hora,
          u.id_usuario,
          CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
          COALESCE(p.nombre_puesto, '—') AS nombre_puesto,
          COALESCE(d.nombre_dispositivo, '—') AS nombre_dispositivo
        FROM asistencias a
        INNER JOIN usuarios u       ON u.id_usuario = a.id_usuario
        LEFT  JOIN dispositivos d   ON d.id_dispositivo = a.id_dispositivo
        LEFT  JOIN puesto p         ON p.id_usuariofk = u.id_usuario
        ORDER BY a.fecha DESC, a.hora DESC
        LIMIT 1
      `),
      q(`
        SELECT * FROM motivos
      `)
    ]);

    res.render('home', {
      usuariosActivos,
      dispositivos,
      horariosActivos,
      asistenciasRecientes,
      kpis: kpis?.[0] || {},
      ultimoAcceso: ultimoAcceso?.[0] || null,
      motivos
    });
  } catch (error) {
    console.error('Error en /home:', error);
    res.status(500).send('Error al cargar la página de inicio');
  }
});


// router.get('/home', ...auth, (req, res) => {
//   const sqlUsuariosActivos = `
//     SELECT 
//       id_usuario,
//       CONCAT_WS(' ', nombre, apellido_paterno, apellido_materno) AS nombre_completo
//     FROM usuarios
//     WHERE activo = 1
//     ORDER BY nombre, apellido_paterno, apellido_materno
//   `;

//   connections.query(sqlUsuariosActivos, (error, usuariosActivos) => {
//     if (error) {
//       console.error('Error en consulta de usuarios activos:', error);
//       return res.status(500).send('Error al obtener usuarios activos');
//     }
//     return res.render('home', { usuariosActivos });
//   });
// });


//Ver configuracion
router.get('/configuracion', ...auth, asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM horarios_semanales';
  connections.query(sql, (error, results) => {
    if (error) {
      console.error('Error en consulta:', error);
      return res.status(500).send('Error al obtener los horarios');
    }
    return res.render('configuracion', { horarios: results });
  });
}));


//Editar el usuario
router.get('/editusuario/:id_usuario', ...auth, (req, res) => {
  const { id_usuario } = req.params;
  const sql = 'SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1';
  connections.query(sql, [id_usuario], (error, results) => {
    if (error) {
      console.error('Error en consulta', error);
      return res.status(500).send('Error al obtener el usuario');
    }
    if (!results || results.length === 0) {
      return res.status(404).render('editusuario', { usuario: null, historial: [] });
    }
    return res.render('editusuario', { usuario: results[0], historial: [] });
  });
});

//Un usuario (Con DB)
router.get('/perfil/:id_usuario', ...auth, (req, res) => {
  const { id_usuario } = req.params;

  const sqlUsuario = `
  SELECT *
  FROM usuarios u
  LEFT JOIN puesto p ON u.id_usuario = p.id_usuariofk
  LEFT JOIN horarios_semanales h ON p.id_horario = h.id_horario
  WHERE u.id_usuario = ?
  LIMIT 1
`;
  const sqlHorarios   = 'SELECT id_horario, nombre_horario FROM horarios_semanales';

  connections.query(sqlUsuario, [id_usuario], (errU, userRows) => {
    if (errU) {
      console.error('Error usuario:', errU);
      return res.status(500).send('Error al obtener el usuario');
    }
    if (!userRows || userRows.length === 0) {
      return res.status(404).render('perfil', { usuario: null, historial: [], horarios: [], puestoActual: null });
    }

    connections.query(sqlHorarios, (errH, horarios) => {
      if (errH) {
        console.error('Error horarios:', errH);
        return res.status(500).send('Error al obtener horarios');
      }

        return res.render('perfil', {
          usuario: userRows[0],
          historial: [],        // Si luego tienes historial, lo colocas aquí
          horarios,             // 👈 para llenar el <select>
        });
    });
  });
});

// router.get('/perfil/:id_usuario', ...auth, (req, res) => {
//   const { id_usuario } = req.params;
//   console.log(req.params)
//   const sql = 'SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1';
//   const sqlHorarios = 'SELECT id_horario, nombre_horario FROM horarios_semanales';
//   connections.query(sql, [id_usuario], (error, results) => {
//     if (error) {
//       console.error('Error en consulta', error);
//       return res.status(500).send('Error al obtener el usuario');
//     }
//     if (!results || results.length === 0) {
//       return res.status(404).render('perfil', { usuario: null, historial: [] });
//     }
//     return res.render('perfil', { usuario: results[0], historial: [] });
//   });
// });

// Usuarios (con DB)
// GET /usuarios
router.get('/usuarios', ...auth, (req, res) => {
  const { q = '', role = '', status = '' } = req.query;

  const where = [];
  const params = [];

  if (q.trim()) {
    const like = `%${q.trim()}%`;
    where.push(`(u.nombre LIKE ? OR u.apellido_paterno LIKE ? OR u.apellido_materno LIKE ? OR u.correo LIKE ?)`);
    params.push(like, like, like, like);
  }

  if (role) { // 'admin' | 'usuario' | 'proveedor'
    where.push(`u.tipo_usuario = ?`);
    params.push(role);
  }

  if (status) { // 'activo' | 'desactivado'
    if (status === 'activo') where.push('u.activo = 1');
    if (status === 'desactivado') where.push('u.activo = 0');
  }

  const sql = `
    SELECT
      u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno,
      u.correo, u.tipo_usuario, u.activo,
      p.id_puesto, p.nombre_puesto,
      h.id_horario AS h_id_horario,
      h.nombre_horario AS h_nombre  -- 👈 corrige el nombre de columna
    FROM usuarios u
    LEFT JOIN puesto p            ON p.id_usuariofk = u.id_usuario   -- 👈 usa id_usuariofk
    LEFT JOIN horarios_semanales h ON h.id_horario   = p.id_horario
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY u.id_usuario DESC
  `;

  connections.query(sql, params, (error, usuarios) => {
    if (error) {
      console.error('Error en consulta:', error);
      return res.status(500).send('Error al obtener los usuarios');
    }

    // Opciones dinámicas para "Rol"
    connections.query(
      `SELECT DISTINCT u.tipo_usuario AS role FROM usuarios u WHERE u.tipo_usuario IS NOT NULL AND u.tipo_usuario<>'' ORDER BY role`,
      (e1, rolesRows) => {
        if (e1) return res.status(500).send('Error cargando roles');

        // Render sin departamento (porque no hay FK en 'puesto')
        res.render('usuarios', {
          usuarios,
          filtros: { q, role, status },   // sin dept
          roles: rolesRows.map(r => r.role),
          departamentos: []               // placeholder si el EJS lo espera
        });
      }
    );
  });
});


module.exports = router;