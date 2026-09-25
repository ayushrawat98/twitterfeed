import express from 'express';
import instance from './db/db.js';
import upload from './lib/multer.js';
import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';

import escapeHTML from './lib/sanitize.js';
import { burstLimiter, quotaLimiter } from './lib/ratelimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const route = express.Router()

route.get("/", (req, res, next) => {
	return res.redirect("/feed")
})

route.get('/feed', async (req, res, next) => {	
	let threadsList = instance.queries.getThreads.all()

	return res.render('feed.html', {
		board : true,
		datalist: threadsList
	});
})

route.post('/feed', burstLimiter, quotaLimiter, upload.single("file"), async (req, res, next) => {
	
	const sanitizedText = escapeHTML(req.body.content.trim())

	if (sanitizedText.length == 0) {
		return res.end("Content is required.")
	}

	let newFile
	if(req.file){
		
		let fileObj = {
		path: req.file.filename,
		mime_type: req.file.mimetype,
		created_at: new Date().toISOString()
	}

	 newFile = instance.insertFile(fileObj)
	}


	let obj = {
		username: req.body.name.trim() == '' ? 'Anonymous' : req.body.name.trim().slice(0, 40),
		content: sanitizedText.slice(0, 280),
		op_file_id: newFile?.lastInsertRowid ?? null,
		ip : req.ip ?? "failed",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
	const newThread = instance.queries.insertThread.run(null, obj.username, obj.content, obj.op_file_id, obj.ip, obj.created_at, obj.updated_at)
	return res.send("success")
})

route.get('/thread/:threadName', async (req, res, next) => {
	const currentThread = instance.getThreadForPost(req.params.threadName) //threadName is a integer
	if(!currentThread) {
		return res.send("Thread does not exist")
	}
	const currentPosts = instance.getPosts(req.params.threadName)
	const combined = [currentThread, ...currentPosts]
	return res.render('thread.html', {
		board: false,
		datalist: combined
	});
})

route.post('/thread/:threadName', burstLimiter, quotaLimiter, upload.single("file"), async (req, res, next) => {

	const threadExist = instance.getThreadForPost(req.params.threadName)

	if (!threadExist) {
		return res.end("Thread doesn't exist")
	}

	const sanitizedText = escapeHTML(req.body.content.trim())

	if (sanitizedText.length == 0) {
		return res.end("Content is required")
	}

	let newFile = undefined

	if (req.file) {
		let fileObj = {
			path: req.file.filename,
			mime_type: req.file.mimetype,
			created_at: new Date().toISOString()
		}
		newFile = instance.insertFile(fileObj)
	}

	let obj = {
		parent_id: req.params.threadName,
		username: req.body.name.trim() == '' ? 'Anonymous' : req.body.name.trim().slice(0, 255),
		content: sanitizedText.slice(0, 4000),
		file_id: newFile?.lastInsertRowid ?? null,
		ip : req.ip ?? "failed",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
	instance.insertPost(obj)
	// console.log(obj)
	instance.updateThread(new Date().toISOString(), req.params.threadName)

	return res.send("success")
})

route.get("/delete/:id", (req,res,next) => {
	let post = instance.queries.getPostById.get(req.params.id)
	let file = instance.queries.getFile.get(post.file_id)
	if(file?.path) fs.unlink(path.resolve("public", "files", file.path), (err) => console.log);
	let deletedResult = instance.queries.deletePostById.run(post.id)
	// console.log(instance.queries.see.all())
	res.send(deletedResult)
})


export { route as boardRoute }
