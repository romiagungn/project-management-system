var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

module.exports = (db) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/listProject', {
            user : req.session.user 
        });
    });

    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/add', {
            title: "PMS Dashboard"
        });
    });

    return router;
}