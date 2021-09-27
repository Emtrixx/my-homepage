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

app.get('/', async(req, res) => {
    const comments = await Comment.find();
    res.render('home', {comments});
})

app.get('/impressum', (req, res) => {
    res.render('impressum')
})

app.post('/', async(req,res) => {
    const comment = new Comment(req.body);
    comment.date = Date.now()
    await comment.save()
    res.redirect('/');
})

app.get('/Test', (req, res) => {
    res.send('Gefunden!')
})

const port = 3000;
app.listen(3000, () => {
    console.log('Server gestartet: ' + port);
})