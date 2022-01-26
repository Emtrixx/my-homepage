const express = require("express");
const router = express.Router();
const isLoggedIn = require("../utils/isLoggedIn");
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { exec } = require("child_process");

router
  .route("/")
  .post(isLoggedIn, upload.single("pdf"), (req, res) => {
    console.log(req.file);
    const { path, originalname } = req.file;
    const newPath = `uploads/decrypt_${originalname}`;
    // TODO Put path in env
    exec(`qpdf --show-encryption /home/node/app/${path}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        res.status(422);
        console.log("Wrong File format");
        req.flash('error', "Wrong File format");
        res.redirect('/pdfEditor');
        deleteFile(`/home/node/app/${path}`)
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);

      if (stdout == "File is not encrypted\n") {
        res.status(422);
        console.log("File not encrypted");
        req.flash('error', "File not encrypted");
        res.redirect('/pdfEditor');
        deleteFile(`/home/node/app/${path}`)
        return;
      } else {
        exec(
          `qpdf --decrypt /home/node/app/${path} /home/node/app/${newPath}`,
          (err, stdout, stderr) => {
            if (err) {
              console.log(err);
              res.status(500);
              console.log("File could not be decrypted");
              req.flash('error', "File could not be decrypted");
              res.redirect('/pdfEditor');
              deleteFile(`/home/node/app/${path}`)
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);

            if (fs.existsSync(newPath)) {
              res.contentType("application/pdf");
              fs.createReadStream(newPath).pipe(res);
            } else {
              res.status(500);
              console.log("File not found");
              res.send("File not found");
            }
            deleteFile(`/home/node/app/${path}`)
          }
        );
      }
    });
  })

  .get(isLoggedIn, (req, res) => {
    res.render("pdfEditor/index");
  });

module.exports = router;


function deleteFile(path) {
  try {
    fs.unlinkSync(path)
    console.log('File deleted')
  } catch(err) {
    console.error(err)
  }
}