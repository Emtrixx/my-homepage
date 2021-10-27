if(process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose')
const Comment = require('./models/comment');

const dburl = process.env.DB_URL || "mongodb://mongo:27017/my-homepage"
mongoose.connect(dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
    .then(() => {
        console.log("Connected to mongodb");
    }).catch(() => {
        console.log("ERROR - Could not connect to mongodb");
    })

app.engine('ejs',ejsMate);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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