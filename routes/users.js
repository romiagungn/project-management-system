var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {
    
    // main page, filtering data/table, and showing data
    router.get('/', helpers.isLoggedIn, (req, res) => {
        let sql = `SELECT userid, email, password, CONCAT(firstname,' ',lastname) as name FROM users`;
        
        //filterring logic
        let result = [];
        const {
            cid,
            inputID,
            cnama,
            nama,
            cemail,
            email
        } = req.query;

        if (cid && inputID){
            result.push(`userid=${inputID}`);
        }
        if ( cnama && nama){
            result.push(` CONCAT(firstname,' ',lastname) like '%${nama}%'`)
        }
        if ( cemail && email){
            result.push(`email like '%${email}%'`)
        }

        if( result.length > 0 ) {
            sql += ` WHERE ${result.join(' AND ')}`;
        }
        console.log(result);
        console.log(sql);

        db.query( sql, (err, data) => {
            let result = data.rows;
            if (err) return res.send(err)
            res.render('users/listUsers', {
                user: req.session.user,
                result,
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
    router.post('/add',helpers.isLoggedIn, (req, res) => {
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
    router.get('/edit/:userid', helpers.isLoggedIn, (req, res) => {
        const { userid } = req.params
        db.query(`SELECT * from users WHERE userid = $1`, [userid] , (err, data) => {
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
        const { email, password, firstname, lastname } = req.body
        const { userid } = req.params;
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) return res.send(err)
            db.query(`UPDATE users SET email = $1, password = $2, firstname = $3, lastname = $4 WHERE userid = $5`, 
            [email, hash, firstname, lastname, userid] ,(err) => {
                if (err) return res.send(err);
                res.redirect('/users')
            })
        })
    })

    // delete data
    router.get('/delete/:userid', helpers.isLoggedIn, (req, res) => {
        const {userid} = req.params;
        console.log(req.params)
        let sql = `DELETE FROM users WHERE userid = ${userid}`
        db.query(sql, (err , data) => {
            console.log(sql)
            if (err) return res.send(err)
            res.redirect('/users')
        })
    })

    return router;
}