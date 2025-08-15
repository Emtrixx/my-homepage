if(process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


const express = require('express');
const app = express();
const helmet = require('helmet');
const compression = require('compression');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose')
const Comment = require('./models/comment');
//package zum einmaligen flashen von Nachrichten(z.B "Erfolgreich eingeloggt") wird mit app.use initialisiert
const flash = require('connect-flash');
//ermöglicht session cookie
const session = require('express-session');

// const dburl = process.env.DB_URL || "mongodb://mongo:27017/my-homepage"
const dburl = process.env.DB_URL || "mongodb://127.0.0.1:27017/my-homepage";
mongoose.connect(dburl)
    .then(() => {
        console.log("Connected to mongodb");
    }).catch((error) => {
        console.log(error);
        console.log("ERROR - Could not connect to mongodb");
    })

app.engine('ejs',ejsMate);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Use helmet to set various security-related HTTP headers
app.use(helmet());
// Use compression to gzip responses
app.use(compression());
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Passport zu User Authentifizierung und User Model von mongoose
const passport = require("passport");
const LocalStrategy = require('passport-local');
const User = require('./models/user');

//Session config
const sessionConfig = {
    name: 'session',
    secret: "bliblablub", // könnte man auch in die env secrets laden
    resave: false,
    saveUninitialized: true,
    cookie: {
        // httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());

//Passort initialisieren und an session koppeln
//Local Strategy (eigene db mit pw, kein z.B Google Login)
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

//threejs
app.use('/build/', express.static(__dirname + '/node_modules/three/build'));
app.use('/jsm/', express.static(__dirname + '/node_modules/three/examples/jsm'));


//routes
app.get('/', async(_, res) => {
    const comments = await Comment.find();
    res.render('home', {comments});
})

app.get('/impressum', (_, res) => {
    res.render('impressum')
})

app.get('/mandelbrot', (_, res) => {
    res.render('mandelbrot/index')
})

app.get('/raytracer', (_, res) => {
    res.render('raytracer/index')
})

app.get('/chatroom', (_, res) => {
    res.render('chatroom/index')
})

const pdfEditorRoutes = require('./routes/pdfEditor');
app.use('/pdfEditor', pdfEditorRoutes);

//User routes
const userRoutes = require('./routes/users');
app.use('/', userRoutes);

app.post('/', async(req,res) => {
    const comment = new Comment(req.body);
    comment.date = Date.now()
    await comment.save()
    res.redirect('/');
})

app.get('/*', (req, res) => {
    res.render('404')
})

const port = 3000;
app.listen(3000, () => {
    console.log('Server gestartet: ' + port);
})