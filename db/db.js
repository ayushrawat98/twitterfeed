import sqlite from "better-sqlite3"
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class DB {
	db;
	queries;
	constructor() {
		this.db = sqlite(path.join(__dirname, 'database.db'), {})

		this.db.pragma('journal_mode = WAL')
		this.db.pragma("synchronous = NORMAL");
		this.db.pragma("journal_size_limit = 67108864"); // 64 MB
		this.db.pragma("mmap_size = 134217728"); // 128 MB
		this.db.pragma("cache_size = 2000");

		this.db.exec(
			`

				CREATE TABLE if not exists posts (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
					username TEXT,
					content TEXT,
					file_id INTEGER REFERENCES files(id),
					ip TEXT,
					created_at TEXT,
					updated_at text
				);

				create table if not exists files (
					id integer primary key autoincrement,
					path text not null,
					mime_type text,
					size integer,
  					width integer,
  					height integer,
  					created_at text
				);

				CREATE INDEX IF NOT EXISTS idx_posts_parent_created
				ON posts(parent_id, created_at DESC);
				

            `
		)
		this.queries = {
			insertThread: this.db.prepare('insert into posts ( parent_id, username, content, file_id, ip, created_at, updated_at) values (?,?,?,?,?,?,?)'),
			getThreads: this.db.prepare('select t.id, t.content, t.username, t.created_at, f.path as image_path, f.mime_type as mimetype, count(p.id) as reply_count from posts t left join files f on t.file_id = f.id left join posts p on p.parent_id = t.id where t.parent_id is null group by t.id order by t.created_at desc'),
			updateThread : this.db.prepare('update posts set updated_at = ? where id = ?'),

			insertFile : this.db.prepare('insert into files (path, mime_type, created_at) values (?,?,?)'),
			getFile : this.db.prepare('select * from files where id = ?'),
			
			getThreadForPost: this.db.prepare('select t.id, t.content, t.username, t.file_id, t.created_at, f.path as image_path, f.mime_type as mimetype from posts t left join files f on t.file_id = f.id where t.id = ?'),
			getPosts : this.db.prepare('select p.id, p.parent_id, p.username, p.content, p.created_at, p.file_id, f.path as image_path, f.mime_type as mimetype from posts p left join files f on p.file_id = f.id where p.parent_id = ?'),
			insertPost : this.db.prepare('insert into posts (parent_id, username, content, file_id, ip,  created_at) values (?,?,?,?,?,?)'),

			getPostById : this.db.prepare("select * from posts p where id = ?"),
			deletePostById : this.db.prepare("delete from posts where id = ?"),

			see : this.db.prepare("select * from posts")
		}
	}

	insertBoard(name, description) {
		this.queries.insertBoard.run(name, description)
	}

	getBoards() {
		return this.queries.getBoards.all()
	}

	insertThread(obj) {
		return this.queries.insertThread.run(obj.board_id, obj.parent_id, obj.username, obj.title, obj.content, obj.op_file_id, obj.created_at, obj.updated_at)
	}

	getThreads(id) {
		//pass the board id
		return this.queries.getThreads.all(id)
	}

	insertFile(obj) {
		return this.queries.insertFile.run(obj.path, obj.mime_type, obj.created_at)
	}

	getRecentImages(){
		return this.queries.recentImages.all()
	}

	getFile(id){
		return this.queries.getFile.get(id)
	}

	getThreadForPost(id){
		return this.queries.getThreadForPost.get(id)
	}

	getPosts(id){
		return this.queries.getPosts.all(id)
	}

	insertPost(obj){
		return this.queries.insertPost.run(obj.parent_id, obj.username, obj.content, obj.file_id, obj.ip, obj.created_at)
	}

	updateThread(date, id){
		return this.queries.updateThread.run(date, id)
	}

	getRandomFile(){
		return this.queries.getRandomFile.get()
	}
}

const instance = new DB()
export default instance