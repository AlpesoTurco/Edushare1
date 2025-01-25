const express = require('express');
const image = express();
const connections = require ('./database/db');
const path = require('path'); // Agrega esta línea para utilizar el módulo 'path'
const multer = require('multer');


let nombreArchivoAsignado; // Variable para almacenar el nombre asignado al archivo

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/Archivos/')
    },
    filename: function (req, file, cb) {
        nombreArchivoAsignado = file.fieldname + '-' + Date.now();
        cb(null, nombreArchivoAsignado + path.extname(file.originalname));
    }
});
  
  const upload = multer({ storage: storage });


  image.post('/uploadArchivo', upload.single('file'), (req, res) => {
    //Publicacion
    const PublicID = IDgenerator();
    const descripcion = req.body.description;
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    const EstudianteActual = req.session.UserID;
    const titulo = req.body.Titulo;
    const extension = path.extname(req.file.originalname);
    const nombreArchivoOriginal = req.file.originalname;

    //Recursos
    const rutaArchivo = 'resources/Archivos/'+nombreArchivoAsignado;
    const recursosID = IDgenerator();
    const Etatus = 1;

    connections.query('INSERT INTO publicaciones SET ?', {PublicacionID: PublicID, Descripcion: descripcion, Fecha: fecha, Hora: hora, EstudianteFK: EstudianteActual, Titulo: titulo, status: Etatus}, async (error, results) => {
      if (error) {
          console.log(error);
          res.status(500).send('Error interno del servidor');
      } else {
          console.log('ALTA EXITOSA Publicaciones');
          res.render('upload', {
            login: true,
            TipoUsuario: req.session.TipoUsuario,
            IdUser: req.session.UserID,
            name: req.session.name,
            photo: req.session.photo,
            alert: true,
            alertTitle: "Archivo Subido",
            alertMessage: "Gracias! Sigue cmpartiendo contenido",
            alertIcon: "success",
            showConfirmButton: true,
            timer: 5000,
            ruta: 'upload'
        });
      }
  });

    connections.query('INSERT INTO recursos SET ?', {RecursosID: recursosID, TipoArchivo: extension, RutaArchivo: rutaArchivo, PublicacionFK: PublicID, ReNombre: nombreArchivoOriginal}, async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error interno del servidor');
        } else {
          
        }
    });

    
  });

  //Actualizar datos
  image.post('/update', async (req, res) => {
  //Persona
  const id = req.body.PersonaID;
  const EstudianteID = req.body.EstudianteID;
  const Nombre = req.body.Nombre;
  const Apellido = req.body.Apellidos;
  const correo = req.body.email;
  //tabla estudiante
  const AreaEstudio = req.body.AreaEstudio;

      connections.query('UPDATE personas SET ? WHERE PersonaID = ?', [{Nombre: Nombre, CorreoElectronico: correo, Apellidos: Apellido}, id], async (error, results) => {
          if (error) {
              console.log(error);
              res.status(500).send('Error interno del servidor');
          } else {
              console.log('ALTA EXITOSA');
              res.redirect('/perfil/'+ EstudianteID);
          }
      });

      connections.query('UPDATE ESTUDIANTE SET ? WHERE PersonaFK = ?', [{AreaEstudio: AreaEstudio}, id], async (error, results) => {
          if (error) {
              console.log(error);
              res.status(500).send('Error interno del servidor');
          } else {
          }
      });

  
});

//Me da la fecha del dia en curso
function obtenerFechaActual() {
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); 
  const anio = fecha.getFullYear();
  return `${anio}-${mes}-${dia}`;
}
//Funcion para obtener la hora en curso
function obtenerHoraActual() {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const segundos = ahora.getSeconds();
  
  const minutosFormateados = minutos < 10 ? '0' + minutos : minutos;
  const segundosFormateados = segundos < 10 ? '0' + segundos : segundos;
  
  return `${hora}:${minutosFormateados}:${segundosFormateados}`;
}
//Otro generador de ID pero numeros
function IDgenerator() {
  const ahora = new Date();
  const año = ahora.getFullYear() - 2000;
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
  const dia = ahora.getDate().toString().padStart(2, '0');
  const hora = ahora.getHours().toString().padStart(2, '0');
  const minutos = ahora.getMinutes().toString().padStart(2, '0');
  const segundos = ahora.getSeconds().toString().padStart(2, '0');
  const idNumerico = Math.floor(Math.random() * (999 - 100 + 1)) + 100;

  const idUnico = `${año}${mes}${dia}${idNumerico}`;
  return idUnico;
}


module.exports = image;