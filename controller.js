const express = require('express');
const controller = express();
const connections = require ('./database/db');

//Acciones
//Registracion Persona
controller.post('/register', async (req, res) => {
    //Persona
    const Nombre = req.body.Nombre;
    const Apellido = req.body.Apellidos;
    const correo = req.body.email;
    const fecnac = req.body.birthdate;
    //tabla estudiante
    const user = req.body.user;
    const AreaEstudio = req.body.AreaEstudio;
    const contra = req.body.password;
    const estudianteID = generateUniqueId();
    const PersonaID = generateUniqueId();
    const estatus = 1;
    const foto = "resources/img/UserSinPerfil.png";


        connections.query('INSERT INTO personas SET ?', {PersonaID: PersonaID, Nombre: Nombre, CorreoElectronico: correo, FechaNacimiento: fecnac, Apellidos: Apellido}, async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
            }
        });

        connections.query('INSERT INTO estudiante SET ?', { estudianteID: estudianteID, AreaEstudio: AreaEstudio, Usuario: user, Contraseña: contra, PersonaFK: PersonaID, Estatus: estatus, Perfil: foto}, async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA');
                res.render('login', {
                    alert: true,
                    alertTitle: "Registro Exitoso",
                    alertMessage: "¡BIENVENIDO! Ya eres parte de esta gran comunidad",
                    alertIcon: "success",
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: 'login'
                });
                
            }
        });
});

// Login
controller.post('/auth', async (req, res) => {
    const Usuario = req.body.user;
    const Contra = req.body.pass;

    if (Usuario && Contra) {
        connections.query('SELECT * FROM estudiante INNER JOIN PERSONAS ON estudiante.PersonaFK = PERSONAS.PersonaID WHERE PERSONAS.CorreoElectronico = ? AND estudiante.Contraseña = ? AND estudiante.Estatus = 1', [Usuario, Contra], async (error, results) => {
            if (results.length == 0) {
                connections.query('SELECT * FROM moderador INNER JOIN PERSONAS ON moderador.PersonaFK = PERSONAS.PersonaID WHERE PERSONAS.CorreoElectronico = ? AND moderador.Contraseña = ? AND moderador.status = 1', [Usuario, Contra], async (error, resultsmoderador) => {
                    if (resultsmoderador && resultsmoderador.length > 0) {
                        req.session.loggedin = true; 
                        req.session.name = resultsmoderador[0].Nombre + ' ' + resultsmoderador[0].Apellidos;
                        req.session.photo = resultsmoderador[0].ModPerfil;
                        req.session.UserID = resultsmoderador[0].moderadorID;
                        req.session.TipoUsuario = 'Mod';
                        res.render('login', {
                            alert: true,
                            alertTitle: "Conexion Exitosa",
                            alertMessage: "¡BIENVENIDO moderador!",
                            alertIcon: "success",
                            showConfirmButton: false,
                            timer: 1500,
                            ruta: ''
                        });
                    } else {
                        res.render('login', {
                            alert: true,
                            alertTitle: "Error",
                            alertMessage: "Password o Usuario incorrecto!",
                            alertIcon: "error",
                            showConfirmButton: false,
                            timer: 1500,
                            ruta: 'login'
                        });
                    }
                });
            } else {
                req.session.loggedin = true;
                req.session.name = results[0].Usuario;
                req.session.photo = results[0].Perfil;
                req.session.UserID = results[0].estudianteID;
                req.session.TipoUsuario = 'User';
                res.render('login', {
                    alert: true,
                    alertTitle: "Conexion Exitosa",
                    alertMessage: "¡LOGIN CORRECTO!",
                    alertIcon: "success",
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''
                });
            }
        });
    } else {
        res.send("Por favor ingrese una contraseña y/o usuario");
    }
});


//Login Pages (Index)
controller.get('/', (req,res)=>{
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        //SELECT * FROM publicaciones  INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID WHERE status = 2 OR status = 5 ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;
        connections.query('SELECT * FROM vista_publicaciones;', (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('index', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
        
    } else {
        res.render('index', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})




controller.get('/BusquedaBarra', (req, res) => {
    // 1. Validar la sesión del usuario
    const barraBusqueda = req.query.Busqueda;
    if (req.session.loggedin) {
      // SELECT * FROM publicaciones  INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID WHERE status = 2 OR status = 5 ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC
      connections.query(`SELECT * FROM publicaciones 
      RIGHT JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK 
      RIGHT JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID 
      WHERE (Titulo LIKE "%${barraBusqueda}%" OR Descripcion LIKE "%${barraBusqueda}%") 
      AND (status = 2 OR status = 5);
  `,
        (error, resultadosBusqueda) => {
          // 3. Manejar los resultados de la consulta
          if (error) {
            console.error('Error en la consulta:', error);
            res.status(500).send('Error en la búsqueda');
          } else {
            res.json({ resultados: resultadosBusqueda });
          }
        }
      );
    } else {
      res.status(403).send('Acceso no autorizado');
    }
  });
  

  




//Login Pages (upload)
controller.get('/upload', (req, res)=>{
    if(req.session.loggedin){
        res.render('upload',{
            login: true,
            TipoUsuario: req.session.TipoUsuario,
            IdUser: req.session.UserID,
            name: req.session.name,
            photo: req.session.photo
        })
        
    } else {
        res.render('upload', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})

//Login Pages (file)
controller.get('/file', (req, res) => {
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query(`SELECT * FROM publicaciones
        LEFT JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK
        LEFT JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID
        LEFT JOIN historial ON historial.PublicacionFK = publicaciones.PublicacionID
        WHERE estudiante.estudianteID = ? AND publicaciones.status = 1
        ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;`,[idUserActual], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('file', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
    } else {
        res.render('file', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});
//Login Pages (AceptadosUser)
controller.get('/AceptadosUser', (req, res) => {
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query(`SELECT * FROM publicaciones
        LEFT JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK
        LEFT JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID
        LEFT JOIN historial ON historial.PublicacionFK = publicaciones.PublicacionID
        WHERE estudiante.estudianteID = ? AND publicaciones.status = 2
        ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;`,[idUserActual], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('AceptadosUser', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
    } else {
        res.render('AceptadosUser', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});

//Login Pages (RechazadosUser)
controller.get('/RechazadosUser', (req, res) => {
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query(`SELECT * FROM publicaciones
        LEFT JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK
        LEFT JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID
        LEFT JOIN historial ON historial.PublicacionFK = publicaciones.PublicacionID
        WHERE estudiante.estudianteID = ? AND publicaciones.status = 3
        ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;`,[idUserActual], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('RechazadosUser', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
    } else {
        res.render('RechazadosUser', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});



//Login Pages (Users)
controller.get('/users', (req, res) => {
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query('SELECT * FROM personas p INNER JOIN estudiante e ON p.PersonaID = e.PersonaFK where estudianteID <> ? AND e.Estatus = 1;', [idUserActual], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('users', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
    } else {
        res.render('users', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});


//Login Pages (To-Do)
controller.get('/to-do', (req,res)=>{
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query('SELECT * FROM publicaciones  INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID WHERE status = 1 ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;', (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('to-do', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
        
    } else {
        res.render('to-do', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})

//Login Pages (Rechazados)
controller.get('/rechazados', (req,res)=>{
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query('SELECT * FROM publicaciones  INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID INNER JOIN historial ON publicaciones.PublicacionID = historial.PublicacionFK WHERE status = 3 ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;', (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('rechazados', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
        
    } else {
        res.render('to-do', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})

//Login Pages (reportes)
controller.get('/reportes', (req,res)=>{
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        connections.query(`SELECT * FROM publicaciones  
        INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK 
        INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID 
        INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID 
        WHERE status = 5 ORDER BY publicaciones.Fecha ASC;`, (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('reportes', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
        
    } else {
        res.render('reportes', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})



//Login Pages (Revision)
controller.get('/revision/:PublicacionID', (req, res) => {
    const PublicacionID = req.params.PublicacionID;
    if (req.session.loggedin) {
        connections.query('SELECT * FROM publicaciones INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID WHERE PublicacionID = ? ORDER BY publicaciones.Fecha ASC, publicaciones.Hora ASC;', [PublicacionID], (error, results) => {
            if (error) {
                throw error;
            } else {
                connections.query(`SELECT * FROM reportes
                    INNER JOIN estudiante ON reportes.estudianteFK = estudiante.estudianteID
                    INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID
                    WHERE PublicacionFK = ?;`, [PublicacionID], (error, resultadosReportes) => {
                    if (error) {
                        throw error;
                    } else {
                        res.render('revision', {
                            login: true,
                            TipoUsuario: req.session.TipoUsuario,
                            IdUser: req.session.UserID,
                            name: req.session.name,
                            photo: req.session.photo,
                            revision: 'simon',
                            publicaciones:results[0],
                            resultadosReportes: resultadosReportes
                        });
                    }
                });
            }
        });

    } else {
        res.render('revision', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});

//Login Pages (Comentarios)
controller.get('/commentary/:PublicacionID', (req, res) => {
    const PublicacionID = req.params.PublicacionID;
    if (req.session.loggedin) {
        connections.query('SELECT * FROM publicaciones INNER JOIN recursos ON publicaciones.PublicacionID = recursos.PublicacionFK INNER JOIN estudiante ON publicaciones.estudianteFK = estudiante.estudianteID INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID WHERE PublicacionID = ?;', [PublicacionID], (error, results) => {
            if (error) {
                throw error;
            } else {
                connections.query(`select * from comentarios 
                INNER JOIN estudiante ON estudiante.estudianteID = comentarios.estudianteFK
                INNER JOIN Personas ON estudiante.PersonaFK = Personas.PersonaID
                WHERE comentarios.PublicacionFK = ?;`, [PublicacionID], (error, results2) => {
                    if (error) {
                        throw error;
                    } else {
                        res.render('commentary', {
                            login: true,
                            TipoUsuario: req.session.TipoUsuario,
                            IdUser: req.session.UserID,
                            name: req.session.name,
                            photo: req.session.photo,
                            revision: 'simon',
                            publicaciones:results[0],
                            results2: results2
                        });
                    }
                });
            }
        });

    } else {
        res.render('commentary', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});

//Intentando Hacer funcionar al chat chido
controller.get('/chat/:estudianteID', (req,res)=>{
    const estudianteID = req.params.estudianteID;
    const idUserActual = req.session.UserID;
    const Visto = 'Visto';
    
    connections.query('UPDATE chats SET ? WHERE estudianteFK1 = ?', [{Visto: Visto}, estudianteID], async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error interno del servidor');
        } else {
        }
    });

    
    if (req.session.loggedin) {
        connections.query(`SELECT * FROM estudiante 
        INNER JOIN Personas ON PersonaID =PersonaFK
            WHERE estudianteID = ?;`,
        [estudianteID], (error, results) => {
            if (error) {
                throw error;
            } else {
                // SELECT * FROM chats
                // INNER JOIN estudiante ON estudiante.estudianteID = chats.estudianteFK1
                // INNER JOIN Personas ON Personas.PersonaID = estudiante.PersonaFK
                // WHERE (estudianteFK1 = ? OR estudianteFK2 = ?)
                // AND (estudianteFK1 = ? OR estudianteFK2 = ?);
                connections.query(`SELECT *
                FROM chats
                INNER JOIN estudiante ON estudiante.estudianteID = chats.estudianteFK1
                INNER JOIN Personas ON Personas.PersonaID = estudiante.PersonaFK
                WHERE (estudianteFK1 = ? OR estudianteFK2 = ?)
                  AND (estudianteFK1 = ? OR estudianteFK2 = ?)
                ORDER BY chats.FechaHora ASC;
                `, [estudianteID,estudianteID, idUserActual,idUserActual], (error, results2) => {
                    if (error) {
                        throw error;
                    } else {
                        res.render('chat', {
                            login: true,
                            TipoUsuario: req.session.TipoUsuario,
                            IdUser: req.session.UserID,
                            name: req.session.name,
                            photo: req.session.photo,
                            results: results[0],
                            results2: results2
                        });
                    }
                });
            }
        });
        
    } else {
        res.render('chat', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})



//Login Pages (chat)
// controller.get('/chat/:estudianteID', (req, res) => {
//     const estudianteID = req.params.estudianteID;
//     const idUserActual = req.session.UserID;
//     if (req.session.loggedin) {
//         connections.query(`SELECT * FROM chats
//         INNER JOIN estudiante ON estudiante.estudianteID = chats.estudianteFK1
//         INNER JOIN Personas ON Personas.PersonaID = estudiante.PersonaFK
//         WHERE estudianteFK1 = ? OR estudianteFK2 = ?;`,
//         [estudianteID, estudianteID], (error, results) => {
//             if (error) {
//                 throw error;
                
//             } else {
//                 connections.query(`SELECT * FROM chats
//                 INNER JOIN estudiante ON estudiante.estudianteID = chats.estudianteFK1
//                 INNER JOIN Personas ON Personas.PersonaID = estudiante.PersonaFK
//                 WHERE (estudianteFK1 = ? OR estudianteFK2 = ?)
//                 AND (estudianteFK1 = ? OR estudianteFK2 = ?);`, [estudianteID,estudianteID, idUserActual,idUserActual], (error, results2) => {
//                     if (error) {
//                         throw error;
//                     } else {
//                         res.render('chat', {
//                             login: true,
//                             TipoUsuario: req.session.TipoUsuario,
//                             IdUser: req.session.UserID,
//                             name: req.session.name,
//                             photo: req.session.photo,
//                             revision: 'simon',
//                             results:results[0],
//                             results2: results2
//                         });
//                     }
//                 });
//             }
//         });

//     } else {
//         res.render('chat', {
//             login: false,
//             name: 'Ingresa a EduShare',
//             photo: 'resources/img/Usuario 2.svg'
//         });
//     }
// });


controller.get('/message', (req,res)=>{
    const idUserActual = req.session.UserID;
    if (req.session.loggedin) {
        // SELECT DISTINCT estudianteID, Nombre, Apellidos, Perfil, Usuario, estudianteID, COUNT(CASE WHEN chats.Visto = 'No Visto' AND chats.estudianteFK2 = estudianteID THEN 1 ELSE NULL END) AS NoVisto
        //         FROM chats
        //         INNER JOIN estudiante ON estudianteID = estudianteFK1
        //         INNER JOIN Personas  ON PersonaID = PersonaFK
        //         WHERE estudianteFK1 = ? OR estudianteFK2 = ?
        //         GROUP BY Nombre, Apellidos, Perfil, Usuario, estudianteID; 
        connections.query(`SELECT DISTINCT Nombre, Apellidos, Perfil, Usuario, estudianteID, estudianteFK2,
		COUNT(CASE WHEN chats.Visto = 'No Visto' AND estudianteFK1 = estudianteID THEN 1 ELSE NULL END) AS NoVisto
                FROM chats
                INNER JOIN estudiante ON estudianteID = estudianteFK1
                INNER JOIN Personas  ON PersonaID = PersonaFK
                WHERE (estudianteFK1 = ? OR estudianteFK2 = ?) AND estudianteFK1 <> ?
                GROUP BY Nombre, Apellidos, Perfil, Usuario, estudianteID, estudianteFK2;
        `,[idUserActual,idUserActual,idUserActual], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('message', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    results: results
                });
            }
        });
        
    } else {
        res.render('message', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        })
    }
})


//Login Pages (Perfil)
controller.get('/perfil/:estudianteID', (req, res) => {
    const estudianteID = req.params.estudianteID;
    if (req.session.loggedin) {
        connections.query(`SELECT 
        estudiante.estudianteID,
        estudiante.AreaEstudio,
        estudiante.Usuario,
        estudiante.Contraseña,
        estudiante.PersonaFK,
        estudiante.Estatus AS estudianteEstatus,
        estudiante.Perfil,
        personas.PersonaID,
        personas.Nombre,
        personas.FechaNacimiento,
        personas.CorreoElectronico,
        TIMESTAMPDIFF(YEAR, personas.FechaNacimiento, CURDATE()) AS Edad,
        personas.Apellidos,
        personas.Estatus AS PersonaEstatus,
        (SELECT COUNT(*) FROM publicaciones WHERE estudianteFK = estudiante.estudianteID) AS NumPublicaciones
        FROM 
        estudiante 
        INNER JOIN 
        personas ON estudiante.PersonaFK = personas.PersonaID 
        WHERE 
        estudiante.estudianteID = ?;    
    `, [estudianteID], (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render('perfil', {
                    login: true,
                    TipoUsuario: req.session.TipoUsuario,
                    IdUser: req.session.UserID,
                    name: req.session.name,
                    photo: req.session.photo,
                    revision: 'simon',
                    perfil: results[0]
                });
            }
        });

    } else {
        res.render('perfil', {
            login: false,
            name: 'Ingresa a EduShare',
            photo: 'resources/img/Usuario 2.svg'
        });
    }
});




//Logout
controller.get('/logout', (req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/')
    })
})







//Actualizar datos (files)
controller.post('/upfile', async (req, res) => {
    //Persona
    const id = req.body.PublicacionesID;
    const titulo = req.body.TituloModel;
    const descripcion = req.body.descripcionModel;

        connections.query('UPDATE publicaciones SET ? WHERE PublicacionID = ?', [{Descripcion: descripcion, Titulo: titulo}, id], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA');
                res.redirect('/file');
            }
        });
    
});

//Rechazo de Publicaciones y el motivo (Revision)
controller.post('/EliminarConMotivo', async (req, res) => {
    //historial
    const motivo = req.body.RechazoMotivo;
    const Estado = 'Rechazado';
    const Publicacionfk = req.body.PublicacionIDForm;
    const moderador = req.session.UserID;
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();

    //tabla publicacion
    const status = 3;

        connections.query('INSERT INTO historial SET ?', [{Motivo: motivo, Estado: Estado, PublicacionFK: Publicacionfk, moderadorFK: moderador, HistoFecha: fecha, HistoHora: hora}], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA REVISION');
                res.redirect('../to-do');
            }
        });

        connections.query('UPDATE publicaciones SET ? WHERE PublicacionID = ?', [{status: status}, Publicacionfk], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA UPDATE REVISION');
            }
        });
 
    
});


//Enviar reporte (Comantary)
controller.post('/EnviarReporte', async (req, res) => {
    //Reporte
    const IdPublicacionModal = req.body.IdPublicacionModal;
    const Motivo = req.body.motivo;
    const estudiante = req.session.UserID;
    //Publicacion
    const status = 5;

        connections.query('INSERT INTO reportes SET ?', [{Motivo: Motivo, estudianteFK: estudiante, PublicacionFK: IdPublicacionModal}], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA REPORTE');
                res.redirect('../commentary/'+IdPublicacionModal);
            }
        });

        connections.query('UPDATE publicaciones SET ? WHERE PublicacionID = ?', [{status: status}, IdPublicacionModal], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA UPDATE REPORTE');
            }
        });
 
    
});



//Actualizar datos (Revision)
controller.get('/Aceptar/:PublicacionID', async (req, res) => {
    //Publicaciones
    const IdPublicacion = req.params.PublicacionID;
    const status = 2;
    //historial
    const motivo = 'Es Apto Para La Plataforma';
    const Estado = 'Aceptado';
    const moderador = req.session.UserID;
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();


        connections.query('UPDATE publicaciones SET ? WHERE PublicacionID = ?', [{status: status}, IdPublicacion], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA');
                res.redirect('../to-do');
            }
        });

        connections.query('INSERT INTO historial SET ?', [{Motivo: motivo, Estado: Estado, PublicacionFK: IdPublicacion, moderadorFK: moderador, HistoFecha: fecha, HistoHora: hora}], async (error, results) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error interno del servidor');
            } else {
                console.log('ALTA EXITOSA REVISION');
            }
        });
    
});

controller.post('/enviarComentario', async (req, res) => {
    const IdPublic = req.body.Publicacion2;
    const Comentario = req.body.comentario;
    const Fecha = obtenerFechaActual();
    const Hora = obtenerHoraActual();
    const Yo = req.session.UserID;

    connections.query('INSERT INTO Comentarios SET ?', [{Contenido: Comentario, ComentarioFecha: Fecha, ComentarioHora: Hora, estudianteFK: Yo, PublicacionFK: IdPublic}], async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error interno del servidor');
        } else {
            console.log('ALTA EXITOSA REVISION');
            res.redirect('../commentary/'+IdPublic);
        }
    });
});

//Enviar mensaje
controller.post('/enviarMensaje', async (req, res) => {
    const IdMensaje = IDgenerator();
    const Remitente = req.body.IdRemitente;
    const Mensaje = req.body.message;
    const FechaHora = obtenerFechaActual() + " " + obtenerHoraActual();
    const Yo = req.session.UserID;
    const Menso = 123;
    const NoVisto = 'No Visto';

    connections.query('INSERT INTO chats SET ?', [{ComentarioID: IdMensaje, Contenido: Mensaje, FechaHora: FechaHora, estudianteFK1: Yo, estudianteFK2: Remitente, ConversacionID: Menso, Visto: NoVisto}], async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error interno del servidor');
        } else {
            console.log('ALTA EXITOSA MENSAJE');
            res.redirect('../chat/'+Remitente);
        }
    });
});

//Subir archivos
controller.use('/', require('./image.controller'));
// Subir archivos y editarlos
controller.use('/', require('./editar'));

//Generador de ID
function generateUniqueId() {
    const timestamp = Date.now().toString(36); 
    const random = Math.random().toString(36).substr(2, 5); 
    return timestamp + random; 
}
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
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const segundos = ahora.getSeconds();
    
    const minutosFormateados = minutos < 10 ? '0' + minutos : minutos;
    const segundosFormateados = segundos < 10 ? '0' + segundos : segundos;
    
    const horaNumeros = parseInt(`${hora}${minutosFormateados}${segundosFormateados}`);
    
    return horaNumeros;
}
module.exports = controller;