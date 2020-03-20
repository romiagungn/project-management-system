var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {

    // main page, filtering data/table, and showing data
    router.get('/', helpers.isLoggedIn, (req, res) => {
        let sql = `SELECT userid, email, password, CONCAT(firstname,' ',lastname) as name, position, isfulltime FROM users`;
        //filter logic
        let result = [];
        const {
            cid,
            inputID,
            cnama,
            nama,
            cemail,
            email,
            cposition,
            position,
            cjob,
            job
        } = req.query;

        if (cid && inputID) {
            result.push(`userid=${inputID}`);
        }
        if (cnama && nama) {
            result.push(` CONCAT(firstname,' ',lastname) like '%${nama}%'`)
        }
        if (cemail && email) {
            result.push(`email like '%${email}%'`)
        }
        if (cposition && position) {
            result.push(`position='${position}'`)
        }
        if (cjob && job) {
            result.push(`isfulltime='${job}'`)
        }

        if (result.length > 0) {
            sql += ` WHERE ${result.join(' AND ')}`;
        }
        console.log(sql)
        console.log(result)
        sql += ` ORDER BY userid`;
        // end filter

        // start logic for pagination
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;

        db.query(sql, (err, data) => {
            if (err) return res.send(err)

            const pages = Math.ceil(data.rows.length / limit);
            const url = req.url == '/' ? '/?page=1' : req.url;

            sql += ` LIMIT ${limit} OFFSET ${offset}`;
            // end logic for pagination

            db.query(sql, (err, data) => {
                let result = data.rows;
                if (err) return res.send(err)
                res.render('users/listUsers', {
                    user: req.session.user,
                    result,
                    url,
                    pages,
                    page,
                    url,
                    query: req.query
                })
            })
        });
    });

    // route to add data page
    router.get('/add', helpers.isLoggedIn, (req, res) => {
        res.render('users/add', {
            title: "PMS Dashboard"
        });
    });

    // post data
    router.post('/add', helpers.isLoggedIn, (req, res) => {
        const { email, password, firstname, lastname, position } = req.body;
        const isfulltime = req.body.job == 'Full Time' ? 'Full Time' : 'Part Time';
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) return res.send(err)
            db.query('INSERT INTO users (email, password, firstname, lastname, position, isfulltime ) VALUES ($1, $2, $3, $4, $5 , $6)', [email, hash, firstname, lastname, position, isfulltime], (err, data) => {
                if (err) return res.send(err)
                res.redirect('/users');
            });
        });
    });

    // get user by id for editing
    router.get('/edit/:userid', helpers.isLoggedIn, (req, res) => {
        const { userid } = req.params
        db.query(`SELECT * from users WHERE userid = $1`, [userid], (err, data) => {
            if (err) return res.send(err);
            let result = data.rows[0];
            res.render('users/edit', {
                title: "PMS Dashboard",
                result,
                query: req.query
            });
        });
    });

    // update data edit
    router.post('/edit/:userid', helpers.isLoggedIn, (req, res) => {
        const { email, password, firstname, lastname, position, job } = req.body
        const { userid } = req.params;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) return res.send(err)
            let sql = `UPDATE users SET email = '${email}', password = '${hash}', firstname = '${firstname}', lastname = '${lastname}', position = '${position}', isfulltime='${job == 'Full Time' ? 'Full Time' : 'Part Time'}' WHERE userid = ${userid}`;
            console.log(sql)
            db.query(sql, (err) => {
                if (err) return res.send(err);
                res.redirect('/users')
            })
        })
    })

    // delete data
    router.get('/delete/:userid', helpers.isLoggedIn, (req, res) => {
        const { userid } = req.params;
        console.log(req.params)
        let sql = `DELETE FROM users WHERE userid = ${userid}`
        db.query(sql, (err, data) => {
            console.log(sql)
            if (err) return res.send(err)
            res.redirect('/users')
        })
    })

    return router;
}