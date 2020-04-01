-- table user
CREATE TABLE users
(
    userid SERIAL PRIMARY KEY,
    email VARCHAR(30),
    password VARCHAR(100),
    firstname VARCHAR(30),
    lastname VARCHAR(30),
    isfulltime boolean,
    position VARCHAR(50)
    option json,
    optionprojects json,
    optionmembers json,
    optionissues json,
);

-- table project 
CREATE TABLE projects
(
    projectid SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

--  table members 
CREATE TABLE members
(
    id SERIAL PRIMARY KEY,
    userid INT,
    role VARCHAR(20),
    projectid INT,
    FOREIGN KEY (userid) REFERENCES users(userid),
    FOREIGN KEY (projectid) REFERENCES projects(projectid)
);

-- table issues 

CREATE TABLE issues
(
    issueid SERIAL PRIMARY KEY,
    projectid INT,
    userid INT,
    tracker VARCHAR(100),
    subject VARCHAR(100),
    description VARCHAR,
    status VARCHAR(100),
    priority VARCHAR(100),
    assignee INT,
    startdate DATE,
    duedate DATE,
    estimatedate REAL,
    done INT,
    files VARCHAR(100),
    spentime REAL,
    targetversion VARCHAR(100),
    author INT,
    createdate TIMESTAMP,
    updatedate TIMESTAMP,
    closedate TIMESTAMP,
    parentask INT,
    FOREIGN KEY (userid) REFERENCES users(userid),
    FOREIGN KEY (projectid) REFERENCES projects(projectid)
);

-- ** table activity **
CREATE TABLE activity
(
    activityid SERIAL PRIMARY KEY,
    time TIMESTAMP,
    title VARCHAR(50),
    description TEXT,
    author INT,
    projectid INT,
    FOREIGN KEY (projectid) REFERENCES projects(projectid),
    FOREIGN KEY (author) REFERENCES users(userid)
)