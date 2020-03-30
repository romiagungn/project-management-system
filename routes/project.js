const express = require('express');
const router = express.Router();
const helpers = require('../helpers/util');
const moment = require('moment');
const path = require('path');

module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, (req, res) => {
        let user = req.session.user;
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
            const limit = 3;
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
                    let sqlOption = `SELECT optionprojects FROM users WHERE userid = ${user.userid}`;
                    db.query(sqlOption, (err, dataOption) => {
                        if (err) res.status(500).json(err)
                        let option = dataOption.rows[0].optionprojects;
                        res.render('projects/listProject', {
                            user,
                            title: 'Dasrboard Projects',
                            url: 'projects',
                            page,
                            pages,
                            link,
                            result: dataProject.rows,
                            users: dataUsers.rows,
                            option
                        })
                    })
                })
            })
        })
    })

    // for option table
    router.post("/option", helpers.isLoggedIn, (req, res) => {
        const user = req.session.user;
        let sqlUpdateOption = `UPDATE users SET optionprojects = '${JSON.stringify(req.body)}' WHERE userid=${user.userid}`;
        db.query(sqlUpdateOption, (err) => {
            if (err) res.status(500).json(err);
            res.redirect('/projects');
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
            db.query(insertId, (err, dataProject) => {
                if (err) res.status(500).json(err)
                let selectidMax = `SELECT MAX (projectid) FROM projects`;
                db.query(selectidMax, (err, dataMax) => {
                    if (err) res.status(500).json(err)
                    let insertidMax = dataMax.rows[0].max;
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
                        dataMembers: data.rows.map(item => item.userid),
                        projectMessage: req.flash('projectMessage')
                    })
                })
            })
        })
    })

    // save data edit project
    router.post('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        const { editname, editmember } = req.body;
        let projectid = req.params.projectid;
        let sql = `UPDATE projects SET name= '${editname}' WHERE projectid = ${projectid}`
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`;

            db.query(sqlDeleteMember, (err) => {
                if (err) res.status(500).json(err)
                let result = [];
                if (typeof editmember == "string") {
                    result.push(`(${editmember}, ${projectid})`);
                } else {
                    for (let i = 0; i < editmember.length; i++) {
                        result.push(`(${editmember[i]}, ${projectid})`);
                    }
                }
                let sqlUpdate = `INSERT INTO members (userid, role, projectid) VALUES ${result.join(",")}`;
                db.query(sqlUpdate, (err) => {
                    if (err) res.status(500).json(err)
                    res.redirect('/projects')
                })
            })
        })
    })

    // to delete project 
    router.get('/delete/:projectid', helpers.isLoggedIn, (req, res) => {
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
        let sql = `SELECT * FROM projects WHERE projectid=${projectid}`;
        let sql1 = `SELECT users.firstname, users.lastname , members.role FROM members 
        LEFT JOIN users ON members.userid = users.userid 
        LEFT JOIN projects ON members.projectid = projects.projectid
        WHERE members.projectid = ${projectid}`;
        let sql2 = `SELECT * FROM issues WHERE projectid = ${projectid}`
        db.query(sql, (err, getData) => {
            if (err) res.status(500).json(err)
            db.query(sql1, (err, dataUser) => {
                if (err) res.status(500).json(err)
                db.query(sql2, (err, dataIssues) => {
                    if (err) res.status(500).json(err)
                    let bugOpen = 0;
                    let bugTotal = 0;
                    let featureOpen = 0;
                    let featureTotal = 0;
                    let supportOpen = 0;
                    let supportTotal = 0;

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'bug' && item.status !== "Closed") {
                            bugOpen += 1;
                        }
                        if (item.tracker == 'bug') {
                            bugTotal += 1;
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'feature' && item.status !== "Closed") {
                            featureOpen += 1;
                        }
                        if (item.tracker == 'feature') {
                            featureTotal += 1;
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'support' && item.status !== "Closed") {
                            supportOpen += 1;
                        }
                        if (item.tracker == 'support') {
                            supportTotal += 1;
                        }
                    })

                    res.render('projects/overview', {
                        user: req.session.user,
                        title: 'Darsboard Overview',
                        url: 'projects',
                        url2: 'overview',
                        result: getData.rows[0],
                        result2: dataUser.rows,
                        result3: dataIssues.rows,
                        bugOpen,
                        bugTotal,
                        supportOpen,
                        supportTotal,
                        featureOpen,
                        featureTotal
                    })
                })
            })
        })
    })

    //get page project/ actoivity
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sql = `SELECT activityid, (time AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'asia/jakarta')::DATE dateactivity, (time AT TIME ZONE 'Asia/Jakarta' AT time zone 'asia/jakarta')::time timeactivity, title, description, CONCAT(users.firstname,' ',users.lastname) AS nama FROM activity 
                    INNER JOIN users ON activity.author = users.userid
                    WHERE projectid = ${projectid} ORDER BY activityid DESC`
        let sql2 = `SELECT DISTINCT members.projectid, projects.name projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid=${projectid}`;

        function convertDateTerm(date) {
            date = moment(date).format('YYYY-MM-DD')
            const today = moment().format('YYYY-MM-DD')
            const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
            if (date == today) {
                return "Today";
            } else if (date == yesterday) {
                return "Yesterday"
            }
            return moment(date).format("MMMM Do, YYYY")
        }
        db.query(sql, (err, dataActivity) => {
            if (err) res.status(500).json(err)
            db.query(sql2, (err, getData) => {
                if (err) res.status(500).json(err)
                let result2 = getData.rows;
                let result3 = dataActivity.rows;

                result3 = result3.map(data => {
                    data.dateactivity = moment(data.dateactivity).format('YYYY-MM-DD')
                    data.timeactivity = moment(data.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss')
                    return data
                })

                let dateonly = result3.map(data => data.dateactivity)
                dateunix = dateonly.filter((date, index, arr) => {
                    return arr.indexOf(date) == index
                })

                let activitydate = dateunix.map(date => {
                    let dataindate = result3.filter(item => item.dateactivity == date);
                    return {
                        date: convertDateTerm(date),
                        data: dataindate
                    }
                })

                projectname = result2.map(data => data.projectname)

                let sql2 = `SELECT * FROM projects WHERE projectid = ${projectid}`;
                db.query(sql2, (err, data) => {
                    if (err) res.status(500).json(err)
                    res.render('projects/activity', {
                        user: req.session.user,
                        title: 'Darsboard Activity',
                        url: 'projects',
                        url2: 'activity',
                        result: data.rows[0],
                        activitydate,
                        result3,
                        moment
                    })
                })
            })
        })
    })

    // *** member page *** //

    // to landing member page
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        const { cid, cnama, cposition, id, nama, position } = req.query;
        let sql = `SELECT COUNT(member) as total  FROM (SELECT members.userid FROM members JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid} `;
        // start filter logic
        result = [];

        if (cid && id) {
            result.push(`members.id=${id}`)
        }
        if (cnama && nama) {
            result.push(`CONCAT(users.firstname,' ',users.lastname) LIKE '%${nama}%'`)
        }
        if (cposition && position) {
            result.push(`members.role = '${position}'`)
        }
        if (result.length > 0) {
            sql += ` AND ${result.join(' AND ')}`
        }
        sql += `) AS member`;
        // end filter logic
        db.query(sql, (err, totalData) => {
            if (err) res.status(500).json(err)

            // start pagenation members logic
            const link = (req.url == `/members/${projectid}`) ? `/members/${projectid}/?page=1` : req.url;
            const page = req.query.page || 1;
            const limit = 3;
            const offset = (page - 1) * limit;
            const total = totalData.rows[0].total
            const pages = Math.ceil(total / limit);
            let sqlMember = `SELECT users.userid, projects.name , projects.projectid, members.id, members.role, CONCAT(users.firstname,' ',users.lastname) AS nama FROM members 
            LEFT JOIN projects ON projects.projectid = members.projectid 
            LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`

            if (result.length > 0) {
                sqlMember += ` AND ${result.join(' AND ')}`
            }
            sqlMember += ` ORDER BY members.id ASC`
            sqlMember += ` LIMIT ${limit} OFFSET ${offset}`;
            // end pagenation members logic

            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`;
                db.query(sqlProject, (err, dataProject) => {
                    if (err) res.status(500).json(err)
                    let user = req.session.user
                    let sqlOption = `SELECT optionmembers FROM users WHERE userid=${user.userid}`;
                    db.query(sqlOption, (err, option) => {
                        if (err) res.status(500).json(err);
                        res.render('projects/members/listMembers', {
                            user: req.session.user,
                            title: 'Dasboard Members',
                            url: 'projects',
                            url2: 'members',
                            pages,
                            page,
                            link,
                            result: dataProject.rows[0],
                            result2: dataMember.rows,
                            option: option.rows[0].optionmembers,
                            memberMessage: req.flash('memberMessage')
                        })
                    })
                })
            })
        })
    })

    // post option at member page
    router.post('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        let user = req.session.user
        const { projectid } = req.params;
        let sqlUpdateOption = `UPDATE users SET optionmembers ='${JSON.stringify(req.body)}' WHERE userid = ${user.userid}`;
        db.query(sqlUpdateOption, err => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`);
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
                    url2: 'members',
                    result: dataProject.rows[0],
                    result2: dataMember.rows,
                    memberMessage: req.flash('memberMessage')
                })
            })
        })
    })

    // to post add member at member page
    router.post('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
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
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })

    // to post delete member page
    router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        let sql = `DELETE FROM members WHERE projectid=${projectid} AND id=${memberid}`;
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })

    //get page project/ Issuess
    router.get('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        const user = req.session.user;
        const { cissues, csubject, ctracker, issues, subject, tracker } = req.query
        let sql = `SELECT count(total) AS total FROM (SELECT i1.*, users.userid, concat(users.firstname, ' ', users.lastname) as fullname, concat(u2.firstname, ' ', u2.lastname) author FROM issues i1 INNER JOIN users ON  users.userid = i1.assignee INNER JOIN users u2 ON i1.author = u2.userid  WHERE projectid = ${projectid}`;
        // start filter logic
        let result = []

        if (cissues && issues) {
            result.push(`issueid = ${issues}`)
        }
        if (csubject && subject) {
            result.push(`subject LIKE '%${subject}%'`)
        }
        if (ctracker && tracker) {
            result.push(`tracker = '${tracker}'`)
        }
        if (result.length > 0) {
            sql += ` AND ${result.join(' AND ')}`
        }

        sql += `) AS total`
        // end filter logic
        db.query(sql, (err, totalData) => {
            if (err) res.status(500).json(err)

            // start pagenation members logic
            const link = (req.url == `/issues/${projectid}`) ? `/issues/${projectid}/?page=1` : req.url;
            const page = req.query.page || 1;
            const limit = 3;
            const offset = (page - 1) * limit;
            const total = totalData.rows[0].total
            const pages = Math.ceil(total / limit);
            let getIssues = `SELECT i1.*, users.userid, concat(users.firstname, ' ', users.lastname) as nama, concat(u2.firstname, ' ', u2.lastname) author, i1.subject issuename FROM issues i1 
            LEFT JOIN users ON  users.userid = i1.assignee 
            LEFT JOIN users u2 ON i1.author = u2.userid  WHERE projectid = ${projectid}`;

            if (result.length > 0) {
                getIssues += ` AND ${result.join(' AND ')}`
            }

            getIssues += ` ORDER BY issueid ASC`
            getIssues += ` LIMIT ${limit} OFFSET ${offset}`
            // end pagenation members logic
            db.query(getIssues, (err, dataIssues) => {
                if (err) res.status(500).json(err)
                let result2 = dataIssues.rows.map(item => {
                    item.startdate = moment(item.startdate).format('LL')
                    item.duedate = moment(item.duedate).format('LL')
                    item.createdate = moment(item.createdate).format('LL')
                    return item;
                });
                let getProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
                db.query(getProject, (err, data) => {
                    if (err) res.status(500).json(err)
                    let issues = `SELECT * FROM issues WHERE projectid = ${projectid} ORDER BY issueid ASC`;
                    db.query(issues, (err, issuesData) => {
                        if (err) res.status(500).json(err)

                        let sqlOption = `SELECT optionissues FROM users WHERE userid=${user.userid}`;
                        db.query(sqlOption, (err, optionissue) => {
                            if (err) res.status(500).json(err);
                            let option = optionissue.rows[0].optionissues;
                            console.log(option)
                            
                            res.render('projects/issues/listIssues', {
                                user,
                                title: 'Darsboard Issues',
                                url: 'projects',
                                url2: 'issues',
                                result: data.rows[0],
                                result2,
                                moment,
                                link,
                                pages,
                                page,
                                memberMessage: req.flash('memberMessage'),
                                result3: issuesData.rows[0],
                                option
                            })
                        })
                    })
                })
            })
        })
    })

    // for option column issues page
    router.post('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
        const {projectid}= req.params
        const user = req.session.user

        let sqlOption = `UPDATE users SET optionissues='${JSON.stringify(req.body)}' WHERE userid=${user.userid}`
        console.log(sqlOption)
        db.query(sqlOption, err => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/issues/${projectid}`)
        })
    })

    //get page project/ Issuess / add
    router.get('/issues/:projectid/add', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        let getUser = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) as nama , projects.projectid FROM members 
        LEFT JOIN users ON members.userid = users.userid
        LEFT JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${projectid}`;
        db.query(getUser, (err, dataUser) => {
            if (err) res.status(500).json(err)
            db.query(getProject, (err, getData) => {
                if (err) res.status(500).json(err)
                res.render('projects/issues/add', {
                    user: req.session.user,
                    title: 'Darsboard Issues Add',
                    title2: 'New Issues',
                    url: 'projects',
                    url2: 'issues',
                    result: getData.rows[0],
                    result2: dataUser.rows
                })
            })
        })
    })

    // posting data to issues
    router.post('/issues/:projectid/add', (req, res) => {
        const { projectid } = req.params;
        const user = req.session.user;
        const { tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file } = req.body;
        const addIssues = `INSERT INTO issues (projectid, userid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedate, done, files, author, createdate) 
                            VALUES($1,${user.userid},$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,${user.userid},NOW())`;
        const issuesData = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file]
        if (req.files) {
            let file = req.files.file;
            let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
            file.mv(path.join(__dirname, "..", 'public', "images", fileName), function (err) {
                if (err) res.status(500).json(err);
                issuesData[11] = `/images/${fileName}`;
                db.query(addIssues, issuesData, (err) => {
                    if (err) res.status(500).json(err);
                    res.redirect(`/projects/issues/${projectid}`);
                })
            })
        } else {
            db.query(addIssues, issuesData, (err) => {
                if (err) res.status(500).json(err);
                res.redirect(`/projects/issues/${projectid}`);
            })
        }
    });

    //landing to page project/ Issuess / edit
    router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, (req, res) => {
        const { projectid, issueid } = req.params;
        let getProject = `SELECT i1.*, projects.name FROM issues i1 
            LEFT JOIN projects ON i1.projectid = projects.projectid
            WHERE issueid = ${issueid}
            AND projects.projectid = ${projectid}`;
        let getUser = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) as nama , projects.projectid FROM members 
            LEFT JOIN users ON members.userid = users.userid
            LEFT JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${projectid}`;
        let getIssues = `SELECT issueid, subject, tracker FROM issues WHERE issueid  NOT IN (SELECT issueid FROM issues WHERE issueid = $1) GROUP BY issueid HAVING projectid = $2`
        db.query(getProject, (err, getData) => {
            if (err) res.status(500).json(err)
            db.query(getUser, (err, dataUser) => {
                if (err) res.status(500).json(err)
                db.query(getIssues, [issueid, projectid], (err, dataIssues) => {
                    if (err) res.status(500).json(err)
                    res.render('projects/issues/edit', {
                        user: req.session.user,
                        title: 'Darsboard Issues Edit',
                        title2: 'Edit Issues',
                        url: 'projects',
                        url2: 'issues',
                        result: getData.rows[0],
                        result2: dataUser.rows,
                        result3: dataIssues.rows,
                        moment
                    })
                })
            })
        })
    })

    router.post('/issues/:projectid/edit/:issueid', (req, res) => {
        const { projectid, issueid } = req.params;
        const user = req.session.user.userid;
        const { tracker, subject, description, status, priority, assignee, duedate, done, file, spentime, targetversion, parentask } = req.body;
        let updateIssues = `UPDATE issues SET tracker= $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, duedate = $7, done = $8, files = $9, spentime = $10, targetversion = $11, parentask = $12, author = $13, updatedate = NOW(), closedate = NOW() WHERE issueid = $14`;
        let issuesData = [tracker, subject, description, status, priority, assignee, duedate, done, file, spentime, targetversion, parentask, user, issueid]
        if (req.files) {
            let file = req.files.file;
            let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
            file.mv(path.join(__dirname, "..", 'public', "images", fileName), (err) => {
                if (err) res.status(500).json(err);
                issuesData[8] = `/images/${fileName}`;
                db.query(updateIssues, issuesData, (err) => {
                    if (err) res.status(500).json(err)
                    const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${description}] - Done: ${done}%', $3)`
                    const activityData = [projectid, subject, user];
                    db.query(addActivity, activityData, (err) => {
                        if (err) res.status(500).json(err);
                        res.redirect(`/projects/issues/${projectid}`)
                    })
                })
            })
        } else {
            db.query(updateIssues, issuesData, (err) => {
                if (err) res.status(500).json(err)
                const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${description}] - Done: ${done}%', $3)`
                const activityData = [projectid, subject, user];
                db.query(addActivity, activityData, (err) => {
                    if (err) res.status(500).json(err)
                    res.redirect(`/projects/issues/${projectid}`)
                })
            })
        }
    })

    router.get('/issues/:projectid/delete/:issueid', (req, res) => {
        const { projectid, issueid } = req.params
        let deleteIssues = `DELETE FROM issues WHERE issueid = ${issueid}`;
        db.query(deleteIssues, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/issues/${projectid}`)
        })
    })




    return router;
}