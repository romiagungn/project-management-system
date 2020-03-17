var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {
    // main page, filtering data/table, and showing data
    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        db.query('SELECT * FROM users', (err, data) => {
            let result = data.rows.map(item => {
                return item
            })
            if (err) return res.send(err)
            res.render('users/listUsers', {
                user: req.session.user,
                query: req.query,
                result
            })
        });
    });

    // route to add data page
    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('users/add', {
            title: "PMS Dashboard"
        });
    });
    // post data
    router.post('/add', function (req, res, next) {
        const { email, password, firstname, lastname } = req.body;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) return res.send(err)
            db.query('INSERT INTO users (email, password, firstname, lastname) VALUES ($1, $2, $3, $4)', [email, hash, firstname, lastname], (err, data) => {
                if (err) return res.send(err)
                res.redirect('/users');
            });
        });
    });

    // get user by id for editing
    router.get('/edit/:userid', (req, res, next) => {
        const { userid } = req.params
        let sql = `SELECT * from USERS WHERE userid = ${userid} `
        db.query(sql, (err, data) => {
            console.log(sql)
            if (err) return res.send(err);
            let result = data.rows[0];
            res.render('users/edit', {
                title: "PMS Dashboard",
                result,
                query : req.query
            });
        });
    });

    return router;
}