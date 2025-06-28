const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/AuthController");

const checkAuth = require("../helpers/auth").checkAuth

router.get("/login", AuthController.loginGet)
router.post("/login", AuthController.loginPost)

router.get("/register", AuthController.registerGet)
router.post("/register", AuthController.registerPost)

router.get("/logout", AuthController.logout)

router.get("/forgot-password", AuthController.forgotPasswordGet)
router.post("/forgot-password", AuthController.forgotPasswordPost)

router.get("/reset-password/:token", AuthController.resetPasswordGet)
router.post("/reset-password/:token", AuthController.resetPasswordPost)

module.exports = router