'use strict'

// Requires
var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var SEED = require('../config/config').SEED;
const GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;
var Usuario = require('../models/usuario');

var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
// Inicializar variables
var app = express();


// ================================================================================
//  Autenticacion Google
// ================================================================================
app.post('/google', (req, res) => {
    var token = req.body.token || 'XXX';
    var client = new auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_SECRET, '');

    client.verifyIdToken(
        token,
        GOOGLE_CLIENT_ID,
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
        function(e, login) {

            if (e) {
                return res.status(400).json({
                    ok: true,
                    mensaje: 'Token no válido',
                    errors: e
                });
            }
            var payload = login.getPayload();
            var userid = payload['sub'];
            // If request specified a G Suite domain:
            //var domain = payload['hd'];

            Usuario.findOne({ email: payload.email }, (err, usuario) => {
                if (err) {
                    return res.status(500).json({
                        ok: true,
                        mensaje: 'Error al buscar usuario - login',
                        errors: err
                    });
                }

                if (usuario) {
                    if (usuario.google === false) {
                        return res.status(400).json({
                            ok: true,
                            mensaje: 'Debe autenticarse con su cuenta de usuario'
                        });
                    } else {
                        usuario.password = ':)';
                        var token = jwt.sign({ usuario: usuario }, SEED, { expiresIn: 14400 }); // 4horas

                        res.status(200).json({
                            ok: true,
                            usuario: usuario,
                            token: token,
                            id: usuario._id
                        });
                    }
                    // Si el usuario no existe por correo
                } else {
                    var usuario = new Usuario();
                    usuario.nombre = payload.name;
                    usuario.email = payload.email;
                    usuario.password = ':)';
                    usuario.img = payload.picture;
                    usuario.google = true;

                    usuario.save((err, usuarioDB) => {
                        if (err) {
                            return res.status(500).json({
                                ok: true,
                                mensaje: 'Error al crear usuario - Google',
                                errors: err
                            });
                        }

                        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4horas

                        res.status(200).json({
                            ok: true,
                            usuario: usuarioDB,
                            token: token,
                            id: usuarioDB._id
                        });
                    });
                }
            });
        });
});

// ================================================================================
//  Autenticacion local
// ================================================================================
app.post('/', (req, res) => {
    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioBD) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (!usuarioBD) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }

        if (bcrypt.compareSync(body.password, usuarioBD.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - password',
                errors: err
            });
        }

        // Crear token!!!
        usuarioBD.password = ':)';
        var token = jwt.sign({ usuario: usuarioBD }, SEED, { expiresIn: 14400 }); // 4horas

        res.status(200).json({
            ok: true,
            usuario: usuarioBD,
            token: token,
            id: usuarioBD._id
        });
    });


});

module.exports = app;