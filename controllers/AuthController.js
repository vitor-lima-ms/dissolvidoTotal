const User = require("../models/User");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Op, Model } = require("sequelize");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_PORT === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const TOKEN_EXPIRATION_MINUTES = 10;

module.exports = class AuthController {
  static loginGet(req, res) {
    res.render("auth/login");
  }

  static async loginPost(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      req.flash("message", "Usuário não encontrado!");
      res.render("auth/login");
      return;
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      req.flash("message", "Senha incorreta!");
      res.render("auth/login");
      return;
    }
    req.flash("message", "Login realizado com sucesso!");
    req.session.userid = user.id;
    req.session.save(() => {
      res.redirect("/");
    });
  }

  static registerGet(req, res) {
    res.render("auth/register");
  }

  static async registerPost(req, res) {
    const { name, email, password1, password2 } = req.body;

    if (password1 !== password2) {
      req.flash("message", "As senhas não conferem. Tente novamente!");
      res.render("auth/register");
      return;
    }

    const checkIfUserExists = await User.findOne({ where: { email: email } });
    if (checkIfUserExists) {
      req.flash("message", "Email já cadastrado. Tente novamente!");
      res.render("auth/register");
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password1, salt);

    const user = {
      name,
      email,
      password: hashedPassword,
    };
    try {
      const createdUser = await User.create(user);

      req.flash("message", "Usuário criado com sucesso!");

      req.session.userid = createdUser.id;
      req.session.save(() => {
        res.redirect("/");
      });
    } catch (error) {
      req.flash("message", error);
    }
  }

  static logout(req, res) {
    req.session.destroy();
    res.redirect("/auth/login");
  }

  static forgotPasswordGet(req, res) {
    res.render("auth/forgotPassword");
  }

  static async forgotPasswordPost(req, res) {
    const { email } = req.body;

    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      req.flash(
        "message",
        "Se o email estiver cadastrado, um link de redefinição será enviado!"
      );
      return res.render("auth/forgot-password");
    }

    try {
      await PasswordResetToken.destroy({ where: { UserId: user.id } });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000
      );

      await PasswordResetToken.create({
        email: user.email,
        UserId: user.id,
        token: token,
        expiresAt: expiresAt,
      });

      const BASE_URL = req.protocol + "://" + req.get("host");
      const resetLink = `${BASE_URL}/auth/reset-password/${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Redefinição de senha",
        html: `
                    <p>Olá ${user.name || ""},</p>
                    <p>Você solicitou a redefinição de senha para sua conta.</p>
                    <p>Clique no link abaixo para criar uma nova senha:</p>
                    <a href="${resetLink}">${resetLink}</a>
                    <p>Este link expirará em ${TOKEN_EXPIRATION_MINUTES} minutos.</p>
                    <p>Se você não solicitou esta redefinição, por favor, ignore este email.</p>
                `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email enviado com sucesso!");
      req.flash(
        "message",
        "Se o email estiver cadastrado, um link de redefinição será enviado!"
      );
    } catch (error) {
      console.log("Erro fpp:", error);
    }
    res.render("auth/forgotPassword");
  }

  static async resetPasswordGet(req, res) {
    const token = req.params.token;
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token: token,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!resetToken) {
      req.flash(
        "message",
        "Token de redefinição inválido ou expirado. Por favor, solicite um novo link!"
      );
      return res.render("auth/resetPassword", { tokenValid: false });
    }

    res.render("auth/resetPassword", { token: token, tokenValid: true });
  }

  static async resetPasswordPost(req, res) {
    const token = req.params.token;
    const { password1, password2 } = req.body;

    if (password1 !== password2) {
      req.flash("message", "As senhas não conferem. Tente novamente!");
      return res.render("auth/resetPassword", {
        token: token,
        tokenValid: true,
      });
    }

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token: token,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    const userId = resetToken.dataValues.UserId;
    let user = await User.findOne({ where: { id: userId } });

    if (!resetToken || !user) {
      req.flash(
        "message",
        "Token de redefinição inválido, expirado ou usuário não encontrado. Por favor, solicite um novo link!"
      );
      return res.render("auth/resetPassword", { tokenValid: false });
    }

    try {
      let user = User.findOne({ where: { id: userId } });
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(password1, salt);
      await User.update(user, { where: { id: userId } });

      await PasswordResetToken.destroy({ where: { id: resetToken.id } });

      req.flash("message", "Senha redefinida com sucesso!");
      res.render("auth/login");
    } catch (error) {
      console.log("Erro rpp:", error);
      req.flash(
        "message",
        "Ocorreu um erro ao tentar redefinir sua senha. Tente novamente!"
      );
      res.render("auth/resetPassword", { token: token, tokenValid: true });
    }
  }
};
