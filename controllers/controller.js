const express = require('express');
const controller = express();
const connections = require ('../database/db');
const requireAuthView = require('../middlewares/requireAuthView');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

controller.use('/', require('./login_controller'));

controller.post('/newusuarios', async (req, res) => {
  try {
    let {
      nombre,
      apellido_paterno,
      apellido_materno,
      curp,
      rfc,
      nss,
      correo,
      password,
      telefono,
      sexo,
      fecha_nacimiento,
      estado_civil,
      domicilio,
      tipo_usuario
    } = req.body;

    // Checkbox "activo" → 1/0
    const activo = req.body.activo ? 1 : 0;
    console.log(activo)

    // 2) Normalizaciones
    nombre = (nombre || '').trim();
    apellido_paterno = (apellido_paterno || '').trim();
    apellido_materno = (apellido_materno || '').trim();
    curp = (curp || '').toUpperCase().trim();
    rfc = (rfc || '').toUpperCase().trim();
    nss = (nss || '').replace(/\D/g, '').trim();
    correo = (correo || '').toLowerCase().trim();
    telefono = (telefono || '').trim();
    sexo = (sexo || '').trim();
    fecha_nacimiento = (fecha_nacimiento || '').trim();
    estado_civil = (estado_civil || '').trim();
    domicilio = (domicilio || '').trim();
    tipo_usuario = (tipo_usuario || 'usuario').trim();

    // Validar que la contraseña exista y tenga mínimo 8 caracteres
    if (!password || password.length < 8) {
      res.render('login', {
          alert: true,
          alertTitle: "Contraseña no segura",
          alertMessage: "Elige una contraseña mayor a 8 caracteres",
          alertIcon: "info",
          showConfirmButton: false,
          timer: 3000,
          ruta: 'nuevousuario'
      });
    } else {

    


      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);


      // Insertar usuario
      const sql = `
        INSERT INTO usuarios (
          nombre, apellido_paterno, apellido_materno,
          curp, rfc, nss, correo, password,
          telefono, sexo, fecha_nacimiento,
          estado_civil, domicilio, activo, tipo_usuario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        nombre,
        apellido_paterno,
        apellido_materno,
        curp.toUpperCase(),
        rfc.toUpperCase(),
        nss,
        correo,
        hashedPassword,
        telefono,
        sexo,
        fecha_nacimiento,
        estado_civil,
        domicilio,
        activo,
        tipo_usuario
      ];

      connections.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error al insertar usuario:', err);
          return res.status(500).send('Error al registrar usuario');
        }

        // Usuario insertado correctamente
        return res.redirect('/usuarios'); // O renderiza un mensaje de éxito
      });
    }

  } catch (error) {
    console.error('Error en /nuevousuario:', error);
    return res.status(500).send('Error del servidor');
  }
});


// controller.post('/newusuarios', async (req, res) => {
//   try {
//     // 1) Tomar datos del body
//     let {
//       nombre,
//       apellido_paterno,
//       apellido_materno,
//       curp,
//       rfc,
//       nss,
//       correo,
//       password,
//       telefono,
//       sexo,
//       fecha_nacimiento,
//       estado_civil,
//       domicilio,
//       tipo_usuario
//     } = req.body;

//     // Checkbox "activo" → 1/0
//     const activo = req.body.activo ? 1 : 0;

//     // 2) Normalizaciones
//     nombre = (nombre || '').trim();
//     apellido_paterno = (apellido_paterno || '').trim();
//     apellido_materno = (apellido_materno || '').trim();
//     curp = (curp || '').toUpperCase().trim();
//     rfc = (rfc || '').toUpperCase().trim();
//     nss = (nss || '').replace(/\D/g, '').trim();
//     correo = (correo || '').toLowerCase().trim();
//     telefono = (telefono || '').trim();
//     sexo = (sexo || '').trim();
//     fecha_nacimiento = (fecha_nacimiento || '').trim();
//     estado_civil = (estado_civil || '').trim();
//     domicilio = (domicilio || '').trim();
//     tipo_usuario = (tipo_usuario || 'usuario').trim();

//     // 3) Validaciones básicas (server-side)
//     const errores = [];

//     // Reglas similares a tu JS del frontend:
//     const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
//     const regexRFC  = /^([A-ZÑ&]{3}\d{6}[A-Z0-9]{3}|[A-ZÑ&]{4}\d{6}[A-Z0-9]{3})$/;

//     if (!nombre) errores.push('Nombre es obligatorio.');
//     if (!apellido_paterno) errores.push('Apellido paterno es obligatorio.');
//     if (!apellido_materno) errores.push('Apellido materno es obligatorio.');

//     if (!(curp && curp.length === 18 && regexCURP.test(curp))) {
//       errores.push('CURP con formato inválido.');
//     }
//     if (!((rfc.length === 12 || rfc.length === 13) && regexRFC.test(rfc))) {
//       errores.push('RFC con formato inválido.');
//     }
//     if (!(nss && nss.length === 11)) {
//       errores.push('NSS debe tener 11 dígitos.');
//     }

//     if (!correo) errores.push('Correo es obligatorio.');
//     if (!telefono) errores.push('Teléfono es obligatorio.');

//     if (!['M', 'F', 'Otro'].includes(sexo)) {
//       errores.push('Sexo inválido.');
//     }

//     if (!fecha_nacimiento) {
//       errores.push('Fecha de nacimiento es obligatoria.');
//     } else {
//       const hoy = new Date();
//       const fn = new Date(fecha_nacimiento);
//       if (isNaN(fn.getTime()) || fn > hoy) {
//         errores.push('Fecha de nacimiento no puede ser futura.');
//       }
//     }

//     if (!estado_civil) errores.push('Estado civil es obligatorio.');
//     if (!domicilio) errores.push('Domicilio es obligatorio.');

//     if (!['usuario', 'admin', 'proveedor'].includes(tipo_usuario)) {
//       errores.push('Tipo de usuario inválido.');
//     }

//     if (!password || password.length < 8) {
//       errores.push('La contraseña debe tener mínimo 8 caracteres.');
//     }

//     // (Opcional) Si agregas name="password2" en el form, puedes validar coincidencia:
//     if (req.body.password2 && req.body.password2 !== password) {
//       errores.push('Las contraseñas no coinciden.');
//     }

//     if (errores.length) {
//       // Re-render del formulario con valores previos y alerta
//       return res.status(400).render('usuarios', {
//         alert: true,
//         alertTitle: 'Datos inválidos',
//         alertMessage: errores.join(' '),
//         alertIcon: 'error',
//         showConfirmButton: true,
//         timer: 2000,
//         ruta: 'usuarios',
//         // Reenvía lo que el user ya llenó para no perderlo
//         form: {
//           nombre, apellido_paterno, apellido_materno,
//           curp, rfc, nss, correo, telefono, sexo,
//           fecha_nacimiento, estado_civil, domicilio, activo, tipo_usuario
//         }
//       });
//     }

//     // 4) Hash de contraseña
//     const salt = await bcrypt.genSalt(10);
//     const passHash = await bcrypt.hash(password, salt);

//     // 5) INSERT parametrizado (en el mismo orden que tus columnas NOT NULL)
//     const sql = `
//       INSERT INTO usuarios (
//         nombre,
//         apellido_paterno,
//         apellido_materno,
//         curp,
//         rfc,
//         nss,
//         correo,
//         password,
//         telefono,
//         sexo,
//         fecha_nacimiento,
//         estado_civil,
//         domicilio,
//         activo,
//         tipo_usuario
//       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
//     `;

//     const params = [
//       nombre,
//       apellido_paterno,
//       apellido_materno,
//       curp,
//       rfc,
//       nss,
//       correo,
//       passHash,
//       telefono,
//       sexo,
//       fecha_nacimiento,
//       estado_civil,
//       domicilio,
//       activo,
//       tipo_usuario
//     ];

//     connections.query(sql, params, (error, result) => {
//       if (error) {
//         // Duplicados por UNIQUE (curp/rfc/correo, etc.)
//         if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
//           // Encontrar cuál índice falló (intenta parsear el mensaje)
//           let campo = 'Alguno de los campos únicos';
//           const m = /for key '([^']+)'/i.exec(error.sqlMessage || '');
//           if (m && m[1]) campo = `Índice único: ${m[1]}`;
//           return res.status(409).render('usuarios', {
//             alert: true,
//             alertTitle: 'Duplicado',
//             alertMessage: `Ya existe un registro con el mismo dato (${campo}).`,
//             alertIcon: 'warning',
//             showConfirmButton: true,
//             timer: 2000,
//             ruta: 'usuarios',
//             form: {
//               nombre, apellido_paterno, apellido_materno,
//               curp, rfc, nss, correo, telefono, sexo,
//               fecha_nacimiento, estado_civil, domicilio, activo, tipo_usuario
//             }
//           });
//         }

//         console.error('Error en INSERT usuarios:', error);
//         return res.status(500).render('usuarios', {
//           alert: true,
//           alertTitle: 'Error del servidor',
//           alertMessage: 'No se pudo guardar el usuario.',
//           alertIcon: 'error',
//           showConfirmButton: true,
//           timer: 1800,
//           ruta: 'usuarios',
//           form: {
//             nombre, apellido_paterno, apellido_materno,
//             curp, rfc, nss, correo, telefono, sexo,
//             fecha_nacimiento, estado_civil, domicilio, activo, tipo_usuario
//           }
//         });
//       }

//       // 6) Éxito
//       return res.status(201).render('login', {
//         alert: true,
//         alertTitle: '¡Guardado!',
//         alertMessage: 'Usuario registrado correctamente.',
//         alertIcon: 'success',
//         showConfirmButton: false,
//         timer: 1500,
//         ruta: 'usuarios' // o '' si prefieres ir al home
//       });
//     });

//   } catch (err) {
//     console.error('Excepción en /usuarios:', err);
//     return res.status(500).render('usuarios', {
//       alert: true,
//       alertTitle: 'Error inesperado',
//       alertMessage: 'Ocurrió un problema al procesar la solicitud.',
//       alertIcon: 'error',
//       showConfirmButton: true,
//       timer: 1800,
//       ruta: 'usuarios'
//     });
//   }
// });



module.exports = controller;    