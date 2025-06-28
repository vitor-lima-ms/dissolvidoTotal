require("dotenv").config();

const express = require("express");
const exphbs = require("express-handlebars");
const session = require("express-session");

const FileStore = require("session-file-store")(session);
const RedisStore = require("connect-redis").RedisStore;
const { createClient } = require("redis");

const flash = require("express-flash");

const app = express();
app.set("trust proxy", 1);

const conn = require("./db/conn");

// Handlebars
const hbs = exphbs.create({
  partialsDir: ["views/partials"],
  helpers: {
    each_object: function (context, options) {
      let ret = "";
      for (const key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
          ret += options.fn({ key: key, value: context[key] });
        }
      }
      return ret;
    },
  },
});
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// Deal with POST requests
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());

app.use(express.static("public"));

// Session config pt.1

// DEV
app.use(
  session({
    name: "session",
    secret: "ourSecret",
    resave: false,
    saveUninitialized: false,
    store: new FileStore({
      logFn: function () {},
      path: require("path").join(require("os").tmpdir(), "sessions"),
    }),
    cookie: {
      secure: false,
      maxAge: 36000000,
      expires: new Date(Date.now() + 36000000),
      httpOnly: true,
    },
  })
);

// // PROD
// const redisHost = process.env.REDIS_HOST;
// const redisPort = process.env.REDIS_PORT;
// const redisPassword = process.env.REDIS_PASSWORD;

// let redisClientOptions = {
//   url: redisPassword
//     ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
//     : `redis://${redisHost}:${redisPort}`,
// };
// if (redisPassword) {
//   redisClientOptions.password = process.env.REDIS_PASSWORD;
// }

// let redisClient = createClient(redisClientOptions);
// redisClient.connect().catch(console.error);

// redisClient.on("error", (err) => {
//   console.error("Erro no Cliente Redis:", err);
// });
// redisClient.on("connect", () => {
//   console.log("Conectado ao Redis com sucesso.");
// });

// app.use(
//   session({
//     store: new RedisStore({ client: redisClient }),
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === "production",
//       httpOnly: true,
//       maxAge: 36000000,
//     },
//   })
// );

// Flash messages
app.use(flash());

// Session config pt.2
app.use((req, res, next) => {
  if (req.session.userid) {
    res.locals.session = req.session;
  }

  next();
});

// Routes
const sampleRoutes = require("./routes/sampleRoutes");
app.use("/sample", sampleRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// Controllers
const SampleController = require("./controllers/SampleController");
const AuthController = require("./controllers/AuthController");
app.get("/", SampleController.index);

// Model
const Sample = require("./models/Sample");
const User = require("./models/User");

// DB sync to start the app
const port = process.env.PORT || 3000;

conn
  .sync()
  .then(() => {
    app.listen(port, () => {
      console.log(`App rodando na porta ${port}.`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
