var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {
  /* GET home page. */
  router.get('/', (req, res, next) => {
    res.render('login', {
      info: req.flash('info')
    });
  });

  router.post('/register', function (req, res, next) {
    const { email, password, firstname, lastname } = req.body;
    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) return res.send(err)
      db.query('INSERT INTO users (email, password, firstname, lastname) VALUES ($1, $2, $3, $4)', [email, hash, firstname, lastname], (err, data) => {
        if (err) return res.send(err)
        res.json(data.rows);
      });
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body
    db.query(`SELECT * FROM users WHERE email = $1`, [email], (err, data) => {
      if (err) return res.send(err)
      if (data.rows.length == 0) {
        req.flash('info', 'user not found')
        return res.redirect('/')
      }
      bcrypt.compare(password, data.rows[0].password, function (err, result) {
        if (err) return res.send(err)
        if (!result) {
          req.flash('info', 'user or password is wrong')
          return res.redirect('/')
        }
        req.session.user = data.rows[0]
        res.redirect('/projects')
      });
    });
  });

  router.get('/logout', function(req, res, next) {
    req.session.destroy(function(err) {
      res.redirect('/')
    })
  }); 


  return router
}