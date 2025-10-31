const jwt = require('jsonwebtoken');

module.exports = function requireAuthApi(req, res, next) {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ ok:false, msg:'No autenticado (falta token)' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normaliza id_usuario del payload
    const id_usuario = decoded.id_usuario || decoded.id || decoded.user_id;
    if (!id_usuario) return res.status(401).json({ ok:false, msg:'Token sin id_usuario' });

    req.user = { ...decoded, id_usuario };
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, msg:'Token inválido o expirado' });
  }
};
