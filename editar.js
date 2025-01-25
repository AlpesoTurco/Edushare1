const express = require('express');
const editar = express();
const connections = require('./database/db');
const path = require('path');
const multer = require('multer');

let nombreArchivoAsignado;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/Perfil/')
    },
    filename: (req, file, cb) => {
        nombreArchivoAsignado = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, nombreArchivoAsignado);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('No es un archivo de imagen!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 }
});

editar.post('/update3', upload.single('photo'), (req, res) => {
    const id = req.body.PersonaID;
    const EstudianteID = req.body.EstudianteID;
    //tabla estudiante
    const Perfil = 'resources/Perfil/' + nombreArchivoAsignado;

        connections.query('UPDATE ESTUDIANTE SET ? WHERE PersonaFK = ?', [{Perfil: Perfil}, id], async (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error interno del servidor');
            }
            res.redirect('/perfil/' + EstudianteID);
        });
});


editar.post('/update2', upload.single('photo'), (req, res) => {
    const id = req.body.PersonaID;
    const fec = req.body.birthdate;
    const EstudianteID = req.body.EstudianteID;
    const Nombre = req.body.Nombre;
    const Apellido = req.body.Apellidos;
    const correo = req.body.email;
    //tabla estudiante
    const AreaEstudio = req.body.AreaEstudio;

    connections.query('UPDATE personas SET ? WHERE PersonaID = ?', [{Nombre: Nombre, CorreoElectronico: correo, Apellidos: Apellido, FechaNacimiento: fec}, id], async (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error interno del servidor');
        }

        connections.query('UPDATE ESTUDIANTE SET ? WHERE PersonaFK = ?', [{AreaEstudio: AreaEstudio}, id], async (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error interno del servidor');
            }
            res.redirect('/perfil/' + EstudianteID);
        });
    });
});


module.exports = editar;
