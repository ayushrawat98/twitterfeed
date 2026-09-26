import express from 'express';
import instance from './db/db.js';
import upload from './lib/multer.js';
import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';

import escapeHTML from './lib/sanitize.js';
import { burstLimiter, quotaLimiter } from './lib/ratelimit.js';
import { xxh32 } from "@node-rs/xxhash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const route = express.Router()

const NAME_LENGTH = 50
const CONTENT_LENGTH = 280

route.get("/", (req, res, next) => {
	return res.redirect("/feed")
})

route.get('/feed', async (req, res, next) => {
	let threadsList = instance.queries.getThreads.all()

	return res.render('feed.html', {
		board: true,
		datalist: threadsList
	});
})

route.post('/feed', burstLimiter, quotaLimiter, upload.single("file"), async (req, res, next) => {

	const sanitizedContent = escapeHTML((req.body?.content ?? "").trim()).slice(0, CONTENT_LENGTH)
	const sanitizedUsername = escapeHTML((req.body?.name ?? "").trim()).slice(0, NAME_LENGTH)

	if (sanitizedContent.length == 0) {
		return res.end("Content is required.")
	}

	let newFile
	if (req.file) {
		let fileObj = {
			path: req.file.filename,
			mime_type: req.file.mimetype,
			size: req.file.size,
			created_at: new Date().toISOString()
		}

		newFile = instance.queries.insertFile.run(fileObj.path, fileObj.mime_type, fileObj.size, fileObj.created_at)
	}


	let obj = {
		username: sanitizedUsername,
		content: sanitizedContent,
		op_file_id: newFile?.lastInsertRowid ?? null,
		ip: req.ip ?? "failed",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
	const newThread = instance.queries.insertThread.run(null, obj.username, obj.content, obj.op_file_id, obj.ip, obj.created_at, obj.updated_at)
	const threadHash = xxh32(req.ip, newThread.lastInsertRowid).toString(16)
	instance.queries.updateThreadHash.run(threadHash, newThread.lastInsertRowid)

	return res.send({message : "success"})
})

route.get('/thread/:threadId', async (req, res, next) => {
	const currentThread = instance.getThreadForPost(req.params.threadId) //threadId is a integer
	if (!currentThread) {
		return res.send("Thread does not exist")
	}
	const currentPosts = instance.getPosts(req.params.threadId)
	const combined = [currentThread, ...currentPosts]

	return res.render('thread.html', {
		board: false,
		datalist: combined
	});
})

route.post('/thread/:threadId', burstLimiter, quotaLimiter, upload.single("file"), async (req, res, next) => {

	const threadExist = instance.getThreadForPost(req.params.threadId)

	if (!threadExist) {
		return res.end("Thread doesn't exist")
	}

	const sanitizedContent = escapeHTML((req.body?.content ?? "").trim()).slice(0, CONTENT_LENGTH)
	const sanitizedUsername = escapeHTML((req.body?.name ?? "").trim()).slice(0, NAME_LENGTH)

	if (sanitizedContent.length == 0) {
		return res.end("Content is required")
	}

	let newFile = undefined

	if (req.file) {
		let fileObj = {
			path: req.file.filename,
			mime_type: req.file.mimetype,
			size : req.file.size,
			created_at: new Date().toISOString()
		}
		newFile = instance.queries.insertFile.run(fileObj.path, fileObj.mime_type, fileObj.size, fileObj.created_at)
	}

	let obj = {
		parent_id: req.params.threadId,
		username: sanitizedUsername,
		content: sanitizedContent,
		file_id: newFile?.lastInsertRowid ?? null,
		ip: req.ip ?? "failed",
		ip_hash: xxh32(req.ip, parseInt(req.params.threadId, 10)).toString(16),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}

	instance.insertPost(obj)

	instance.updateThreadTime(new Date().toISOString(), req.params.threadId)

	return res.send({message : "success"})
})

route.get("/delete/:id", (req, res, next) => {
	let post = instance.queries.getPostById.get(req.params.id)
	let file = instance.queries.getFile.get(post.file_id)
	if (file?.path) fs.unlink(path.resolve("public", "files", file.path), (err) => console.log);
	let deletedResult = instance.queries.deletePostById.run(post.id)
	// console.log(instance.queries.see.all())
	res.send(deletedResult)
})


export { route as boardRoute }
