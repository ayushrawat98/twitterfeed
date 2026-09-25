import express from 'express';
import nunjucks from 'nunjucks';
import path from "path";
import { fileURLToPath } from "url";
import { boardRoute } from './routes.js';
import helmet from 'helmet';
import fs from "fs"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//create folders if not exists
if(!fs.existsSync(path.join(__dirname, 'public'))){
	fs.mkdirSync(path.join(__dirname, 'public'))
}
if(!fs.existsSync(path.join(__dirname, 'public', 'files'))){
	fs.mkdirSync(path.join(__dirname, 'public', 'files'))
}

const app = express()

// app.use(helmet())

app.use('/public', express.static(path.resolve(__dirname, "public"), {maxAge : '1y'}));

const nunjucksEnv = nunjucks.configure('views', {
	autoescape: true,
	express: app,
	noCache : false //false for prod
});

//filter for getting indian date
nunjucksEnv.addFilter('indianDate', (str) => {
	let t = new Date(str)
	return t.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
})

nunjucksEnv.addFilter('greenText', (str) => {
	let regex = /^(&gt;(?!&gt;).*?)$/gm
	let regexTwo = /&gt;&gt;(\d+)/gm
	let regexThree = /^(&lt;.*?)$/gm
	return str
			.replace(regex, "<span class='greentext'>$1</span>")
			.replace(regexTwo, "<a data-post-number-link='$1' href='#$1'>&gt;&gt;$1</a>")
			.replace(regexThree, "<span style='color:red'>$1</span>")
})

nunjucksEnv.addFilter('safeFileName', (name) => {
		return encodeURIComponent(name)
	})


app.use('', boardRoute)

app.listen(3100, "::", () => {
	console.log("Server started at port 3100")
})