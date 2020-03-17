var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

module.exports = (db) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        res.render('users/listUsers', {
            user : req.session.user 
        });
    });

    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('users/add', {
            title: "PMS Dashboard"
        });
    });

    return router;
}