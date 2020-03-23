var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, (req, res) => {
        let sql = `SELECT projects.projectid , projects.name , members.role, CONCAT(firstname,' ',lastname) AS nama FROM projects 
        JOIN members ON members.projectid = projects.projectid
        JOIN users ON members.userid = users.userid`;
        db.query(sql, (err, dataProject) => {
            if(err) res.status(500).json(err)
            let result = dataProject.rows;
            res.render('projects/listProject', {
                user: req.session.user,
                title: 'Dasrboard List Projects',
                url: 'project',
                result
            })
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
                result,
                projectMessage: req.flash('projectMessage')
            })
        });
    });

    // post add project
    router.post('/add', helpers.isLoggedIn, (req, res) => {
        const { name, member } = req.body;
        if (name && member) {
            const insertId = `INSERT INTO projects (name) VALUES ('${name}')`;
            console.log(insertId)
            db.query(insertId, (err, dataProject) => {

                let selectidMax = `SELECT MAX (projectid) FROM projects`;
                db.query(selectidMax, (err, dataMax) => {
                    let insertidMax = dataMax.rows[0].max;
                    console.log(insertidMax);
                    let insertMember = 'INSERT INTO members (userid, role, projectid) VALUES '
                    if (typeof member == 'string') {
                        insertMember += `(${member}, ${insertidMax});`
                    } else {
                        let members = member.map(item => {
                            return `(${item}, ${insertidMax})`
                        }).join(',')
                        insertMember += `${members}`;
                    }
                    db.query(insertMember, (err, dataSelect) => {
                        res.redirect('/projects')
                    })
                })
            })
        } else {
            req.flash('projectMessage', 'Please Add Members');
            res.redirect('/project/add')
        }
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

    //get page project/ Issuess / add
    router.get('/issues/add', helpers.isLoggedIn, (req, res) => {
        res.render('projects/issues/add', {
            title: 'Darsboard Issues Add'
        })
    })



    return router;
}