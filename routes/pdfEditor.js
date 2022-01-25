const express = require('express');
const router = express.Router();
const isLoggedIn = require('../utils/isLoggedIn');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');

router.route('/')
.post(isLoggedIn ,upload.single('pdf'), (req, res) => {
    console.log(req.file)
    const { path } = req.file;
    exec(`qpdf --decrypt ${path} output.pdf`, (err, stdout, stderr) => {
      if (err) {
        console.log('fail')
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
})

.get(isLoggedIn,(req, res) => {
    res.render('pdfEditor/index');
})


 module.exports = router;