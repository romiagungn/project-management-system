//import depedencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session')
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');

//Model setup
const { Pool } = require("pg");
const pool = new Pool({
  user: 'imrchskmuhmzmd',
  host: 'ec2-52-207-93-32.compute-1.amazonaws.com',
  database: 'd6oiu1sqqiv8f3',
  password: '486d2fa95722a3f7ee098e4a8689ac7184a77ca89a52c3489f23a30bc7e36675',
  port: 5432

  // user: 'postgres',
  // host: 'localhost',
  // database: 'pms',
  // password: 'binatang',
  // port: 5432,
})

// setup routes
var indexRouter = require('./routes/index')(pool);
var projectRouter = require('./routes/project')(pool);
var usersRouter = require('./routes/users')(pool);
var profileRouter = require('./routes/profile')(pool);

// setup app
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// use
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'login')));
// trust first proxy
app.set('trust proxy', 1) 
app.use(session({
  secret: 'semuanyatai'
}));

//default options
app.use(flash());
app.use(fileUpload());
app.use(function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

//page routes
app.use('/', indexRouter);
app.use('/projects', projectRouter);
app.use('/users', usersRouter);
app.use('/profile', profileRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
