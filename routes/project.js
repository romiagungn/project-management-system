var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, (req, res) => {
        let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects LEfT JOIN members ON members.projectid = projects.projectid LEFT JOIN users ON users.userid = members.userid `
        //filter logic
        let result = [];
        const { cid, cnama, cmember, idproject, namaproject, member } = req.query;

        if (cid && idproject) {
            result.push(`projects.projectid=${idproject}`)
        }
        if (cnama && namaproject) {
            result.push(`projects.name LIKE '%${namaproject}%'`)
        }
        if (cmember && member) {
            result.push(`members.userid=${member}`)
        }

        if (result.length > 0) {
            getData += ` WHERE ${result.join(" AND ")}`;
        }
        getData += `) AS projectname`;
        console.log(result)
        console.log(getData)

        db.query(getData, (err, totalData) => {
            if (err) res.status(500).json(err)
            let getData = `SELECT DISTINCT projects.projectid, projects.name, string_agg(users.firstname || ' ' || users.lastname, ', ') as nama FROM projects LEFT JOIN members ON members.projectid = projects.projectid
            LEFT JOIN users ON users.userid = members.userid `;

            if (result.length > 0) {
                getData += ` WHERE ${result.join(" AND ")}`
            }
            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC`;

            db.query(getData, (err, dataProject) => {
                if (err) res.status(500).json(err)
                let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

                db.query(getUser, (err, dataUsers) => {
                    if (err) res.status(500).json(err)
                    res.render('projects/listProject', {
                        user: req.session.user,
                        title: 'Dasrboard Projects',
                        url: 'project',
                        result: dataProject.rows,
                        user: dataUsers.rows
                    })
                })
            })
        })
    })


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

    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        let projectid = req.params.projectid;
        let sql = `SELECT members.userid, projects.name, projects.projectid FROM projects LEFT JOIN members ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid}`;
        let sql2 = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid};`
        let sql3 = `SELECT * FROM users`;

        db.query(sql, (err, data) => {
            if (err) res.status(500).json(err)
            let dataProject = data.rows[0];
            db.query(sql2, (err, data) => {
                if (err) res.status(500).json(err)
                db.query(sql3, (err, dataUsers) => {
                    let dataUser = dataUsers.rows;
                    if (err) res.status(500).json(err)
                    res.render('projects/edit', {
                        title: 'Dasboard Edit Project',
                        url: 'project',
                        user: req.session.user,
                        project: dataProject,
                        dataUser,
                        dataMembers: data.rows.map(item => item.userid)
                    })
                })
            })
        })
    })

    router.post('/edit/:projectid', (req, res) => {
        const { editname, editmember } = req.body;
        console.log(req.body)
        let projectid = req.params.projectid;
        let sql = `UPDATE projects SET name= '${editname}' WHERE projectid = ${projectid}`
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`;

            db.query(sqlDeleteMember, (err) => {
                if (err) res.status(500).json(err)
                let result = [];
                console.log(result);
                if (typeof editmember == "string") {
                    result.push(`(${editmember}, ${projectid})`);
                } else {
                    for (let i = 0; i < editmember.length; i++) {
                        result.push(`(${editmember[i]}, ${projectid})`);
                    }
                }
                let sqlUpdate = `INSERT INTO members (userid, role, projectid) VALUES ${result.join(",")}`;
                console.log(sqlUpdate)
                db.query(sqlUpdate, (err) => {
                    if (err) res.status(500).json(err)
                    res.redirect('/projects')
                })
            })
        })
    })

    // to delete project 
    router.get('/delete/:projectid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid;
        let sqlDeleteProject = `DELETE FROM members WHERE projectid=${projectid};
                                DELETE FROM projects WHERE projectid=${projectid}`;
        db.query(sqlDeleteProject, (err) => {
            if (err) res.status(500).json(err)
            res.redirect('/projects');
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