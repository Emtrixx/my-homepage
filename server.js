const express = require('express');
const app = express();


app.get('/', (req,res) => {
    res.sendFile(__dirname+'/index.html');
})


const port = 3000;
app.listen(3000, () => {
    console.log('Server gestarten: '+port)
})