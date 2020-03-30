var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util');
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {

    // get data profile 
    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        let user = req.session.user;
        console.log(user)
        let sql = `SELECT * FROM users WHERE email = '${user.email}'`
        db.query(sql, (err, data) => {
            console.log(sql)
            let result = data.rows[0];
            if (err) return res.send(err)
            res.render('profile/listProfile', {
                title: 'Edit Profile',
                result,
                url : 'profile'
            })
        });
    });

        // update data profile
        router.post('/', helpers.isLoggedIn, (req, res) => {
            const {password, firstname, lastname, position, job } = req.body;
            let user = req.session.user;
            bcrypt.hash(password, saltRounds, function (err, hash) {
                if (err) return res.send(err)
                let sql = `UPDATE users SET password = '${hash}', firstname = '${firstname}', lastname = '${lastname}', position = '${position}', isfulltime='${job == 'Full Time' ? 'Full Time' : 'Part Time'}' WHERE email = '${user.email}'`;
                console.log(sql)
                db.query(sql, (err) => {
                    if (err) return res.send(err);
                    res.redirect('/projects')
                })
            })
        })

    return router;
}