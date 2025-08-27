// middlewares/requireAuthView.js
const jwt = require('jsonwebtoken');

module.exports = function requireAuthView(req, res, next) {
  try {
    // 1) Tomar token de cookie o Authorization
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2) Si no hay token -> mandar a login
    if (!token) {
      return res.render('login', {
        alert: true,
        alertTitle: 'Sesión requerida',
        alertMessage: 'Inicia sesión para continuar.',
        alertIcon: 'warning',
        showConfirmButton: false,
        timer: 1500,
        ruta: 'login'
      });
    }

    // 3) Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4) Exponer usuario a controladores y EJS
    req.user = decoded;       // para controladores
    res.locals.user = decoded; // para EJS: <%= user.nombre %>
    return next();
  } catch (e) {
    // Token inválido/expirado -> a login
    return res.render('login', {
      alert: true,
      alertTitle: 'Sesión expirada',
      alertMessage: 'Vuelve a iniciar sesión.',
      alertIcon: 'info',
      showConfirmButton: false,
      timer: 1500,
      ruta: 'login'
    });
  }
};
