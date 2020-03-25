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
        // end filter logic

        db.query(getData, (err, totalData) => {
            if (err) res.status(500).json(err)

            // start pagenation logic 
            const link = req.url == '/' ? '/?page=1' : req.url;
            const page = req.query.page || 1;
            const limit = 2;
            const offset = (page - 1) * limit;
            const total = totalData.rows[0].total
            const pages = Math.ceil(total / limit);
            let getData = `SELECT DISTINCT projects.projectid, projects.name, string_agg(users.firstname || ' ' || users.lastname, ', ') as nama FROM projects LEFT JOIN members ON members.projectid = projects.projectid
            LEFT JOIN users ON users.userid = members.userid `;

            if (result.length > 0) {
                getData += ` WHERE ${result.join(" AND ")}`
            }
            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;
            // end pagenation logic

            db.query(getData, (err, dataProject) => {
                if (err) res.status(500).json(err)
                let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

                db.query(getUser, (err, dataUsers) => {
                    if (err) res.status(500).json(err)
                    res.render('projects/listProject', {
                        user: req.session.user,
                        title: 'Dasrboard Projects',
                        url: 'projects',
                        page,
                        pages,
                        link,
                        result: dataProject.rows,
                        users: dataUsers.rows
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
                url: 'projects',
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
            res.redirect('/projects/add')
        }
    })

    // get data @edit project
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
                        url: 'projects',
                        user: req.session.user,
                        project: dataProject,
                        dataUser,
                        dataMembers: data.rows.map(item => item.userid)
                    })
                })
            })
        })
    })

    // save data edit project
    router.post('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
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
    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;

        db.query(getProject, (err, getData) => {
            if (err) res.status(500).json(err)
            res.render('projects/overview', {
                user: req.session.user,
                title: 'Darsboard Overview',
                url: 'projects',
                url2: 'overview',
                result: getData.rows[0]
            })
        })
    })

    //get page project/ actoivity
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        db.query(getProject, (err, getData) => {
            if (err) res.status(500).json(err)
            res.render('projects/activity', {
                user: req.session.user,
                title: 'Darsboard Activity',
                url: 'projects',
                url2: 'activity',
                result: getData.rows[0]
            })
        })
    })

    // *** member page *** //

    // to landing member page
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        let sqlMember = `SELECT users.userid, projects.name , projects.projectid, members.id, members.role, CONCAT(users.firstname,' ',users.lastname) AS nama FROM members 
        LEFT JOIN projects ON projects.projectid = members.projectid 
        LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid};`
        db.query(sqlProject, (err, dataProject) => {
            if (err) res.status(500).json(err)
            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                res.render('projects/members/listMembers', {
                    user: req.session.user,
                    title: 'Dasboard Members',
                    url: 'projects',
                    url2: 'members',
                    result: dataProject.rows[0],
                    result2: dataMember.rows,
                    memberMessage: req.flash('memberMessage')
                })
            })
        })
    })

    // landing to add member page at member page
    router.get('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        let sqlMember = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS nama FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid=${projectid})`
        db.query(sqlProject, (err, dataProject) => {
            if (err) res.status(500).json(err)
            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                res.render('projects/members/add', {
                    title: 'Dasboard Members Add',
                    url: 'projects',
                    url2: 'member',
                    result: dataProject.rows[0],
                    result2: dataMember.rows,
                    memberMessage: req.flash('memberMessage')
                })
            })
        })
    })

    // to post add member at member page
    router.post('/members/:projectid/add', helpers.isLoggedIn, (req, res, next) => {
        const { projectid } = req.params
        const { inputmember, inputposition } = req.body
        let sql = `INSERT INTO members(userid, role, projectid) VALUES(${inputmember}, '${inputposition}', ${projectid})`
        db.query(sql, (err) => {
            if (err) res.status(500).json(err);
            res.redirect(`/projects/members/${projectid}`)
        })
    })

    // landing to edit page at member page
    router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(sqlProject, (err, dataProject) => {
            if (err) res.status(500).json(err)
            let sqlMember = `SELECT projects.projectid, users.userid , users.firstname, users.lastname, members.role, members.id FROM members
            LEFT JOIN projects ON members.projectid = projects.projectid 
            LEFT JOIN users ON members.userid = users.userid 
            WHERE projects.projectid=${projectid} AND id=${memberid}`;
            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                res.render('projects/members/edit', {
                    user: req.session.user,
                    title: 'Dasrboard Edit Members',
                    url: 'projects',
                    url2: 'members',
                    result: dataProject.rows[0],
                    result2: dataMember.rows[0]
                })
            })
        })
    })

    // to post edit member page
    router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        const { inputposition } = req.body
        let sql = `UPDATE members SET role='${inputposition}' WHERE id=${memberid}`;
        console.log(sql)
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })

    router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, (req, res) => {
        const {projectid , memberid} = req.params
        let sql = `DELETE FROM members WHERE projectid=${projectid} AND id=${memberid}`
        console.log(sql)
        db.query(sql, (err) => {
            if(err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })





    //get page project/ Issuess
    router.get('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        db.query(getProject, (err, getData) => {
            if (err) res.status(500).json(err)
            res.render('projects/issues/listIssues', {
                user: req.session.user,
                title: 'Darsboard Issues',
                url: 'project',
                url2: 'issues',
                result: getData.rows[0]
            })
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