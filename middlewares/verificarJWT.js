// middlewares/verificarJWT.js
const jwt = require('jsonwebtoken');

module.exports = function verificarJWT(req, res, next) {
  try {
    let token = null;

    // 1) Authorization: Bearer xxx
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1];

    // 2) Cookie 'token'
    if (!token && req.cookies && req.cookies.token) token = req.cookies.token;

    if (!token) return res.status(401).json({ mensaje: 'Token requerido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id_usuario, correo, nombre, ... }
    next();
  } catch (e) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
