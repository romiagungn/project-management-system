var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, (req, res) => {
        res.render('projects/listProject', {
            user: req.session.user
        });
    });

    //get users name in project/add
    router.get('/add', helpers.isLoggedIn, (req, res) => {
        const sql = `SELECT * FROM users ORDER BY userid`;
        db.query(sql, (err, data) => {
            if (err) res.status(500).json(err);
            let result = data.rows;

            res.render('projects/add', {
                user: req.session.user,
                title: 'DASBOARD PMS',
                url: 'project',
                result
            })
        });
    });

    // post add project
    router.post('/add', helpers.isLoggedIn, (req, res) => {
        const { nameproject } = req.body;
        const sql = `INSERT INTO projects name VALUES (${nameproject})`;
        console.log(sql)
        db.query(sql, (err, dataProject) => {
            if (err) res.status(500).json(err)
            let result = dataProject.rows;

            res.redirect('/projects')
        })
    })


    //get page project/ overview
    router.get('/overview', helpers.isLoggedIn, (req, res) => {
        res.render('projects/overview', {
            user: req.session.user,
            title: 'Darsboard Overview',
            url: 'project',
            url2: 'overview'
        })
    })

    //get page project/ actoivity
    router.get('/activity', helpers.isLoggedIn, (req, res) => {
        res.render('projects/activity', {
            user: req.session.user,
            title: 'Darsboard Activity',
            url: 'project',
            url2: 'activity'
        })
    })

    //get page project/ members
    router.get('/members', helpers.isLoggedIn, (req, res) => {
        res.render('projects/members/listMembers', {
            user: req.session.user,
            title: 'Dasboard Members',
            url: 'project',
            url2: 'members'
        })
    })

    //get page project/ members / add
    router.get('/members/add', helpers.isLoggedIn, (req, res) => {
        res.render('projects/members/add', {
            user: req.session.user,
            title: 'Dasboard Members Add'
        })
    })

    //get page project/ Issuess
    router.get('/issues', helpers.isLoggedIn, (req, res) => {
        res.render('projects/issues/listIssues', {
            user: req.session.user,
            title: 'Darsboard Issues',
            url: 'project',
            url2: 'issues'
        })
    })



    return router;
}