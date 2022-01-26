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
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);

      if (stdout == "File is not encrypted \n") {
        res.status(422);
        console.log("File not encrypted");
        res.send("File not encrypted");
      } else {
        exec(
          `qpdf --decrypt /home/node/app/${path} /home/node/app/${newPath}`,
          (err, stdout, stderr) => {
            if (err) {
              console.log(err);
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
          }
        );
      }
    });
  })

  .get(isLoggedIn, (req, res) => {
    res.render("pdfEditor/index");
  });

module.exports = router;

const { exec } = require("child_process");

exec("qpdf --show-encryption ./IV_06.pdf", (err, stdout, stderr) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);

  if (stdout == "File is not encrypted \n") {
    console.log("not encripted");
  } else {
    exec(
      "qpdf --decrypt ./IV_06.pdf ./decrypt1.pdf ",
      (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
      }
    );
  }
});
