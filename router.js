
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
renderRoute('/miactividad', 'miactividad', auth);



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
router.get('/usuarios', ...auth, asyncHandler(async (req, res) => {
  const sql = `
  SELECT *
  FROM usuarios u
  LEFT JOIN puesto p ON u.id_usuario = p.id_usuariofk
  LEFT JOIN horarios_semanales h ON p.id_horario = h.id_horario`;
  connections.query(sql, (error, results) => {
    if (error) {
      console.error('Error en consulta:', error);
      return res.status(500).send('Error al obtener los usuarios');
    }
    return res.render('usuarios', { usuarios: results });
  });
}));

module.exports = router;