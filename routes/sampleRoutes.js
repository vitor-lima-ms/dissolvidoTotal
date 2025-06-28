const express = require("express");
const router = express.Router();
const multer = require("multer");

const SampleController = require("../controllers/SampleController");

router.get("/list", SampleController.listSamples);

router.post("/delete", SampleController.deleteSample);

router.get("/edit/:id", SampleController.editSampleGet);
router.post("/edit", SampleController.editSamplePost);

const upload = multer({ dest: "uploads" });
router.get("/import", SampleController.importCsvGet);
router.post(
  "/import",
  upload.single("csvFile"),
  SampleController.importCsvPost
);

router.get("/delete-import", SampleController.deleteImportGet);
router.post("/delete-import", SampleController.deleteImportPost);

module.exports = router;
