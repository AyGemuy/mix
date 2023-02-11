console.log("🐾 Starting...")

import yargs from "yargs"
import cfonts from "cfonts"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import { createRequire } from "module"
import { createInterface } from "readline"
import { setupMaster, fork } from "cluster"
import { watchFile, unwatchFile } from "fs"

// https://stackoverflow.com/a/50052194
const { say } = cfonts
const rl = createInterface(process.stdin, process.stdout)
const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname) // Bring in the ability to create the "require" method
const { name, author } = require(join(__dirname, "./package.json")) // https://www.stefanjudis.com/snippets/how-to-import-json-files-in-es-modules-node-js/

say("HinataBot", {
  font: "shade",
  align: "center",
  colors: ["red", "yellow"]
})
say("🐾 RPG BOT Multi-Device HinataBot", {
  font: "console",
  align: "center",
  colors: ["green"]
})

var isRunning = false
/**
 * Start a js file
 * @param {String} file `path/to/file`
 */
function start(file) {
  if (isRunning) return
  isRunning = true
  let args = [join(__dirname, file), ...process.argv.slice(2)]
  say([process.argv[0], ...args].join(" "), {
    font: "console",
    align: "center",
    colors: ["magenta"]
  })
  say("🌎 MEMUAT SOURCE...", {
    font: "console",
    align: "center",
    colors: ["red"]
  })
  say("📑 MEMUAT PLUGINS...", {
    font: "console",
    align: "center",
    colors: ["yellow"]
  })
  say("✅ DONE !", {
    font: "console",
    align: "center",
    colors: ["green"]
  })
  setupMaster({
    exec: args[0],
    args: args.slice(1),
  })
  let p = fork()
  p.on("message", data => {
    console.log("[✅RECEIVED]", data)
    switch (data) {
      case "reset":
        p.process.kill()
        isRunning = false
        start.apply(this, arguments)
        break
      case "uptime":
        p.send(process.uptime())
        break
    }
  })
  p.on("exit", (_, code) => {
    isRunning = false
    console.error("[❗]Exited with code:", code)
    if (code !== 0) return start(file)
    watchFile(args[0], () => {
      unwatchFile(args[0])
      start(file)
    })
  })
  let opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
  if (!opts["test"])
    if (!rl.listenerCount()) rl.on("line", line => {
      p.emit("message", line.trim())
    })
  // console.log(p)
}

start("main.js")

import favicon from "serve-favicon"
import express from "express"
import cookieParser from "cookie-parser"
import session from "express-session"
import MemoryStore from "memorystore"
import expressLayout from "express-ejs-layouts"
import compression from "compression"
import passport from "passport"
import flash from "connect-flash"
import Limiter from "express-rate-limit"
import fileUpload from "express-fileupload"
import cron from "node-cron"
import time from "moment-timezone"

const { hitCounter, getRoute } = await(await import("./library/functions.js"));
const { profilePath, user } = await(await import("./library/settings.js"));
const { connectMongoDb } = await(await import("./database/connect.js"));
const { User } = await(await import("./database/model.js"));
const apirouter = await(await import("./routing/api.js"));
const userRouters = await(await import("./routing/users.js"));
const premiumRouters = await(await import('./routing/premium.js'));
const app = new express();
const PORT = process.env.PORT || 3000;

app.use(Limiter({
	windowMs: 1 * 60 * 1000,
	max: 1000,
	message: "Oops too many requests #Greats Farhannn"
}));

connectMongoDb();

app.enable("trust proxy", 1);
app.set("json spaces", 2);
app.set("view engine", "ejs");
app.use(function (req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

res.on("finish", () => {
		if (!getRoute(req)) {

		} else {
			hitCounter(1);
		}
	});
	next();
});	

app.use(expressLayout);
app.use(fileUpload());
app.use(compression());
app.use(favicon("./views/favicon.ico"));
app.use(express.static("assets"));
app.use(session({
	secret: "secret",
	resave: true,
	saveUninitialized: true,
	cookie: {
		maxAge: 86400000
	},
	store: new MemoryStore({
		checkPeriod: 86400000
	}),
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
require(join(__dirname, "./library/config.js"))(passport);
app.use(flash());
app.use(function (req, res, next) {
	res.locals.success_msg = req.flash("success_msg");
	res.locals.warning_msg = req.flash("warning_msg");
	res.locals.error_msg = req.flash("error_msg");
	res.locals.error = req.flash("error");
	res.locals.user = req.user || null;
	next();
});

app.get("/", async (req, res) => {
	res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/docs", async (req, res) => {
	let users;
	let text_running;
	//let hit;
	/**let users_count = [...await User.find({}, async function (er, resp) {
		let allUsers;
		if (er) allUsers = {};
		else allUsers = resp;
		return allUsers;
	})].length + 100;**/

	/**const Hit = await User.findOne({ gmail: user });
	if (!Hit.hitCount) hit = hitCount.count;
	else hit = Hit.hitCount;**/
	if (!req.user) {
		text_running = "Update+Instagram+Stories;Silahkan+lapor;Bila+menemukan+bug;Terima+kasih.";
		users = {
			apikey: "Lann",
			url: profilePath
		};
	} else {
		users = req.user;
		if (users.email == user) text_running = "Kamu+Terlalu+Berharga+Bagiku;Tetapi.....;Aku+Terlalu+Sepele+Bagimu.;😊😊😊";
		else text_running = `Welcome+${users.username}.;Silahkan+gunakan+rest+api;Dengan+bijak.`;
	}
	res.render("docs", {
		text_running,
		//hit_counter: hit,
		androUser: req.headers["sec-ch-ua-platform"],
		//users_count,
		apikey: users.apikey,
		profile: users.url,
		layout: "layouts/main"
	});
});

app.use("/api", apirouter);
app.use("/users", userRouters);
app.use('/premium', premiumRouters);

app.listen(PORT, function () {
	console.log("Server running on port " + PORT);
});

cron.schedule("0 0 * * *", async () => {
	await User.find({ limit: 0 }, async function (er, resp) {
		for (let i = 0; i < resp.length; i++) {
			await User.findOneAndUpdate({
				email: resp[i].email
			}, {
				limit: 15
			});
		}
		console.log(`[ ${time.tz("Asia/Jakarta").format("HH:mm")} ] Success Reset Limit`);
	});
}, {
	scheduled: true,
	timezone: "Asia/Jakarta"
});
