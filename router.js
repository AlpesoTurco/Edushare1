
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

// Home / Dashboard
renderRoute('/home', 'home', auth);

// Dispositivos, Actividad, Configuración, Nuevo Usuario, Perfil
renderRoute('/dispositivos', 'dispositivos', auth);
renderRoute('/actividad', 'actividad', auth);
renderRoute('/configuracion', 'configuracion', auth);
renderRoute('/nuevousuario', 'nuevousuario', auth);
renderRoute('/perfil', 'perfil', auth);

// Usuarios (con DB)
router.get('/usuarios', ...auth, asyncHandler(async (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  connections.query(sql, (error, results) => {
    if (error) {
      console.error('Error en consulta:', error);
      return res.status(500).send('Error al obtener los usuarios');
    }
    return res.render('usuarios', { usuarios: results });
  });
}));

module.exports = router;
