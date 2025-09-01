import fs from 'fs';
import path from 'path';
import tar from 'tar';
import EventEmitter from 'events';
import chalk from 'chalk';
import { rimrafSync } from 'sander';
import enquirer from 'enquirer';
import glob from 'tiny-glob/sync.js';
import {
	DegitError,
	exec,
	fetch,
	mkdirp,
	tryRequire,
	stashFiles,
	unstashFiles,
	degitConfigName,
	base
} from './utils.js';

const validModes = new Set(['tar', 'git', 'git-ssh', 'git-https']);
const supportedSites = new Set(['github', 'gitlab', 'bitbucket', 'git.sr.ht']);

export default function degit(src, opts) {
	return new Degit(src, opts);
}

class RepoParser {
	static parse(src) {
		const match = /^(?:(?:https:\/\/)?([^:/]+\.[^:/]+)\/|git@([^:/]+)[:/]|([^/]+):)?([^/\s]+)\/([^/\s#]+)(?:((?:\/[^/\s#]+)+))?(?:\/)?(?:#(.+))?/.exec(src);

		if (!match) {
			throw new DegitError(`could not parse ${src}`, { code: 'BAD_SRC' });
		}

		const site = (match[1] || match[2] || match[3] || 'github').replace(/\.(com|org)$/, '');

		if (!supportedSites.has(site)) {
			throw new DegitError(`degit supports GitHub, GitLab, Sourcehut and BitBucket`, {
				code: 'UNSUPPORTED_HOST'
			});
		}

		const user = match[4];
		const name = match[5].replace(/\.git$/, '');
		const subdir = match[6];
		const ref = match[7] || 'HEAD';

		const domain = `${site}.${site === 'bitbucket' ? 'org' : site === 'git.sr.ht' ? '' : 'com'}`;
		const url = `https://${domain}/${user}/${name}`;
		const ssh = `git@${domain}:${user}/${name}`;
		const mode = supportedSites.has(site) ? 'tar' : 'git';

		return { site, user, name, ref, url, ssh, subdir, mode };
	}
}

class RefService {
	static async fetchRefs(repo) {
		try {
			const { stdout } = await exec(`git ls-remote ${repo.url}`);

			return stdout
				.split('\n')
				.filter(Boolean)
				.map(row => {
					const [hash, ref] = row.split('\t');

					if (ref === 'HEAD') {
						return { type: 'HEAD', hash };
					}

					const match = /refs\/(\w+)\/(.+)/.exec(ref);
					if (!match) {
						throw new DegitError(`could not parse ${ref}`, { code: 'BAD_REF' });
					}

					return {
						type: match[1] === 'heads' ? 'branch' : match[1] === 'refs' ? 'ref' : match[1],
						name: match[2],
						hash
					};
				});
		} catch (error) {
			throw new DegitError(`could not fetch remote ${repo.url}`, {
				code: 'COULD_NOT_FETCH',
				url: repo.url,
				original: error
			});
		}
	}

	static selectRef(refs, selector) {
		for (const ref of refs) {
			if (ref.name === selector) {
				return ref.hash;
			}
		}

		if (selector.length < 8) return null;

		for (const ref of refs) {
			if (ref.hash.startsWith(selector)) return ref.hash;
		}
	}
}

class CacheService {
	static updateCache(dir, repo, hash, cached) {
		this.updateAccessLogs(dir, repo);

		if (cached[repo.ref] === hash) return;

		this.cleanupOldFiles(dir, cached, hash, repo);
		this.updateMapFile(dir, cached, repo, hash);
	}

	static updateAccessLogs(dir, repo) {
		const logs = tryRequire(path.join(dir, 'access.json')) || {};
		logs[repo.ref] = new Date().toISOString();
		fs.writeFileSync(
			path.join(dir, 'access.json'),
			JSON.stringify(logs, null, '  ')
		);
	}

	static cleanupOldFiles(dir, cached, hash, repo) {
		const oldHash = cached[repo.ref];
		if (!oldHash) return;

		const isHashUsed = Object.values(cached).some(cachedHash => cachedHash === hash);

		if (!isHashUsed) {
			try {
				fs.unlinkSync(path.join(dir, `${oldHash}.tar.gz`));
			} catch {
				// ignore cleanup errors
			}
		}
	}

	static updateMapFile(dir, cached, repo, hash) {
		cached[repo.ref] = hash;
		fs.writeFileSync(
			path.join(dir, 'map.json'),
			JSON.stringify(cached, null, '  ')
		);
	}
}

class TarExtractor {
	static async extract(file, dest, subdir = null) {
		return tar.extract(
			{
				file,
				strip: subdir ? subdir.split('/').length : 1,
				C: dest
			},
			subdir ? [subdir] : []
		);
	}
}

class DirectiveProcessor {
	constructor(degitInstance) {
		this.degit = degitInstance;
		this.variables = {};
		this.actions = {
			clone: this.handleClone.bind(this),
			remove: this.handleRemove.bind(this),
			template: this.handleTemplate.bind(this),
			rename: this.handleRename.bind(this),
			prompt: this.handlePrompt.bind(this),
			script: this.handleScript.bind(this),
			preScript: this.handlePreScript.bind(this),
			postScript: this.handlePostScript.bind(this)
		};
	}

	async handleClone(dir, dest, action) {
		if (!this.degit._hasStashed) {
			stashFiles(dir, dest);
			this.degit._hasStashed = true;
		}

		const opts = { force: true, cache: action.cache, verbose: action.verbose };
		const d = degit(action.src, opts);

		d.on('info', event => {
			console.error(chalk.cyan(`> ${event.message.replace('options.', '--')}`));
		});

		d.on('warn', event => {
			console.error(chalk.magenta(`! ${event.message.replace('options.', '--')}`));
		});

		await d.clone(dest).catch(err => {
			console.error(chalk.red(`! ${err.message}`));
			throw err;
		});
	}

	handleRemove(dir, dest, action) {
		const files = Array.isArray(action.files) ? action.files : [action.files];

		const removedFiles = files
			.map(file => this.removeFile(dest, file))
			.filter(Boolean);

		if (removedFiles.length > 0) {
			this.degit._info({
				code: 'REMOVED',
				message: `removed: ${chalk.bold(removedFiles.map(d => chalk.bold(d)).join(', '))}`
			});
		}
	}

	removeFile(dest, file) {
		const filePath = path.resolve(dest, file);

		if (!fs.existsSync(filePath)) {
			this.degit._warn({
				code: 'FILE_DOES_NOT_EXIST',
				message: `action wants to remove ${chalk.bold(file)} but it does not exist`
			});
			return null;
		}

		const isDir = fs.lstatSync(filePath).isDirectory();

		if (isDir) {
			rimrafSync(filePath);
			return file + '/';
		} else {
			fs.unlinkSync(filePath);
			return file;
		}
	}

	async handlePrompt(dir, dest, action) {
		const { variables = [], message } = action;

		if (message) {
			this.degit._info({ code: 'PROMPT', message });
		}

		for (const variable of variables) {
			const prompt = {
				type: variable.type || 'input',
				name: 'value',
				message: variable.message || `Enter value for ${variable.name}:`,
				initial: variable.default || this.variables[variable.name]
			};

			if (variable.choices) {
				prompt.type = 'select';
				prompt.choices = variable.choices;
			}

			const response = await enquirer.prompt([prompt]);
			this.variables[variable.name] = response.value;
		}

		this.degit._info({
			code: 'VARIABLES_SET',
			message: `Variables set: ${Object.keys(this.variables).join(', ')}`
		});
	}

	async handleTemplate(dir, dest, action) {
		const { replacements = [], extensions = ['.js', '.ts', '.json', '.md', '.yml', '.yaml', '.txt'] } = action;

		const processFile = (filePath) => {
			const ext = path.extname(filePath);
			if (!extensions.includes(ext)) return;

			try {
				let content = fs.readFileSync(filePath, 'utf-8');
				let modified = false;

				for (const replacement of replacements) {
					const { from, to } = replacement;
					const processedTo = this.processTemplate(to);

					if (content.includes(from)) {
						content = content.replace(new RegExp(from, 'g'), processedTo);
						modified = true;
					}
				}

				Object.entries(this.variables).forEach(([key, value]) => {
					const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
					if (content.match(pattern)) {
						content = content.replace(pattern, value);
						modified = true;
					}
				});

				if (modified) {
					fs.writeFileSync(filePath, content, 'utf-8');
				}
			} catch (err) {
				this.degit._warn({
					code: 'TEMPLATE_ERROR',
					message: `Failed to process template in ${filePath}: ${err.message}`
				});
			}
		};

		this.walkDirectory(dest, processFile);

		this.degit._info({
			code: 'TEMPLATE_PROCESSED',
			message: `Template processing completed with ${replacements.length} replacement rules`
		});
	}

		async handleRename(dir, dest, action) {
		const { files = [] } = action;

		for (const renameRule of files) {
			const { from, to } = renameRule;
			
			if (from === '**/*.tmpl') {
				this.handleTmplRename(dest);
			} else if (from.includes('*')) {
				this.handleGlobRename(dest, from, to);
			} else {
				this.handleSingleRename(dest, from, to);
			}
		}
	}

	handleTmplRename(dest) {
		const tmplFiles = glob('**/*.tmpl', { cwd: dest, absolute: true });
		
		tmplFiles.forEach(filePath => {
			const newPath = filePath.replace(/\.tmpl$/, '');
			this.moveFile(filePath, newPath);
		});
	}

	handleGlobRename(dest, pattern, toPattern) {
		const matches = glob(pattern, { cwd: dest, absolute: false });

		matches.forEach(relativePath => {
			const filePath = path.resolve(dest, relativePath);
			const processedTo = this.processTemplate(toPattern);
			const newPath = path.resolve(dest, processedTo);

			if (newPath !== filePath && fs.existsSync(filePath)) {
				this.moveFile(filePath, newPath);
			}
		});
	}

	handleSingleRename(dest, from, to) {
		const fromPath = path.resolve(dest, from);
		const processedTo = this.processTemplate(to);
		const toPath = path.resolve(dest, processedTo);

		if (fs.existsSync(fromPath)) {
			this.moveFile(fromPath, toPath);
		} else {
			this.degit._warn({
				code: 'RENAME_SOURCE_NOT_FOUND',
				message: `Cannot rename ${from}: file or directory not found`
			});
		}
	}

	moveFile(fromPath, toPath) {
		try {
			mkdirp(path.dirname(toPath));
			fs.renameSync(fromPath, toPath);

			this.degit._info({
				code: 'FILE_RENAMED',
				message: `Renamed: ${path.basename(fromPath)} → ${path.basename(toPath)}`
			});
		} catch (err) {
			this.degit._warn({
				code: 'RENAME_ERROR',
				message: `Failed to rename ${fromPath}: ${err.message}`
			});
		}
	}

		applyRenamePattern(filePath, pattern, toPattern) {
		if (pattern === '**/*.tmpl') {
			return filePath.replace(/\.tmpl$/, '');
		}
		
		if (pattern === '**/*') {
			return this.processTemplate(toPattern);
		}
		
		const patternRegex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
		const regex = new RegExp(`^${patternRegex}$`);
		
		if (regex.test(filePath)) {
			return this.processTemplate(toPattern);
		}
		
		return filePath;
	}

	processTemplate(template) {
		let processed = template;

		Object.entries(this.variables).forEach(([key, value]) => {
			processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
		});

		return processed;
	}

	walkDirectory(dir, callback) {
		const walk = (currentPath) => {
			const items = fs.readdirSync(currentPath);

			items.forEach(item => {
				const itemPath = path.join(currentPath, item);
				const stat = fs.lstatSync(itemPath);

				if (stat.isDirectory()) {
					walk(itemPath);
				} else if (stat.isFile()) {
					callback(itemPath);
				}
			});
		};

		walk(dir);
	}

	async handleScript(dir, dest, action) {
		await this.executeScript(dest, action, 'SCRIPT');
	}

	async handlePreScript(dir, dest, action) {
		await this.executeScript(dest, action, 'PRE_SCRIPT');
	}

	async handlePostScript(dir, dest, action) {
		await this.executeScript(dest, action, 'POST_SCRIPT');
	}

	async executeScript(dest, action, type) {
		const { commands = [], message, workingDirectory } = action;
		const cwd = workingDirectory ? path.resolve(dest, workingDirectory) : dest;

		if (message) {
			this.degit._info({ code: type, message });
		}

		for (const command of commands) {
			const processedCommand = this.processTemplate(command);

			this.degit._verbose({
				code: 'EXECUTING_COMMAND',
				message: `Executing: ${processedCommand} (in ${cwd})`
			});

			try {
				const result = await this.executeCommand(processedCommand, cwd);

				if (result.stdout) {
					this.degit._verbose({
						code: 'COMMAND_OUTPUT',
						message: result.stdout.trim()
					});
				}

				this.degit._info({
					code: 'COMMAND_SUCCESS',
					message: `✅ ${processedCommand}`
				});
			} catch (err) {
				this.degit._warn({
					code: 'COMMAND_ERROR',
					message: `❌ Command failed: ${processedCommand} - ${err.message}`
				});

				if (action.failOnError !== false) {
					throw new DegitError(`Script execution failed: ${processedCommand}`, {
						code: 'SCRIPT_ERROR',
						command: processedCommand,
						original: err
					});
				}
			}
		}
	}

	async executeCommand(command, cwd) {
		return new Promise((resolve, reject) => {
			const child_process = require('child_process');

			child_process.exec(command, { cwd }, (error, stdout, stderr) => {
				if (error) {
					reject(error);
					return;
				}
				resolve({ stdout, stderr });
			});
		});
	}
}

class Degit extends EventEmitter {
	constructor(src, opts = {}) {
		super();

		this.src = src;
		this.cache = opts.cache;
		this.force = opts.force;
		this.verbose = opts.verbose;
		this.proxy = process.env.https_proxy;

		this.repo = RepoParser.parse(src);
		this.mode = this.normalizeMode(opts.mode || this.repo.mode);

		if (!validModes.has(this.mode)) {
			throw new Error(`Valid modes are ${Array.from(validModes).join(', ')}`);
		}

		this._hasStashed = false;
		this.directiveProcessor = new DirectiveProcessor(this);
	}

	normalizeMode(mode) {
		if (mode === 'git') return 'git-ssh';
		return mode;
	}

	async clone(dest) {
		this.checkDirIsEmpty(dest);

		const { repo } = this;
		const dir = path.join(base, repo.site, repo.user, repo.name);

		if (this.mode === 'tar') {
			await this.cloneWithTar(dir, dest);
		} else if (this.mode === 'git-ssh') {
			await this.cloneWithGitSsh(dir, dest);
		} else if (this.mode === 'git-https') {
			await this.cloneWithGitHttps(dir, dest);
		}

		this._info({
			code: 'SUCCESS',
			message: `cloned ${chalk.bold(repo.user + '/' + repo.name)}#${chalk.bold(repo.ref)}${dest !== '.' ? ` to ${dest}` : ''}`,
			repo,
			dest
		});

		await this.processDirectives(dir, dest);
	}

	async processDirectives(dir, dest) {
		const directives = this.getDirectives(dest);
		if (!directives) return;

		for (const directive of directives) {
			await this.directiveProcessor.actions[directive.action](dir, dest, directive);
		}

		if (this._hasStashed) {
			unstashFiles(dir, dest);
		}
	}

	getDirectives(dest) {
		const directivesPath = path.resolve(dest, degitConfigName);
		const directives = tryRequire(directivesPath, { clearCache: true });

		if (directives) {
			fs.unlinkSync(directivesPath);
		}

		return directives;
	}

	checkDirIsEmpty(dir) {
		try {
			const files = fs.readdirSync(dir);

			if (files.length > 0) {
				if (this.force) {
					this._info({
						code: 'DEST_NOT_EMPTY',
						message: `destination directory is not empty. Using options.force, continuing`
					});
				} else {
					throw new DegitError(
						`destination directory is not empty, aborting. Use options.force to override`,
						{ code: 'DEST_NOT_EMPTY' }
					);
				}
			} else {
				this._verbose({
					code: 'DEST_IS_EMPTY',
					message: `destination directory is empty`
				});
			}
		} catch (err) {
			if (err.code !== 'ENOENT') throw err;
		}
	}

	async getHash(repo, cached) {
		try {
			const refs = await RefService.fetchRefs(repo);
			if (repo.ref === 'HEAD') {
				return refs.find(ref => ref.type === 'HEAD').hash;
			}
			return RefService.selectRef(refs, repo.ref);
		} catch (err) {
			this._warn(err);
			this._verbose(err.original);
			return this.getHashFromCache(repo, cached);
		}
	}

	getHashFromCache(repo, cached) {
		if (repo.ref in cached) {
			const hash = cached[repo.ref];
			this._info({
				code: 'USING_CACHE',
				message: `using cached commit hash ${hash}`
			});
			return hash;
		}
	}

	async cloneWithTar(dir, dest) {
		const { repo } = this;
		const cached = tryRequire(path.join(dir, 'map.json')) || {};

		const hash = this.cache
			? this.getHashFromCache(repo, cached)
			: await this.getHash(repo, cached);

		const subdir = repo.subdir ? `${repo.name}-${hash}${repo.subdir}` : null;

		if (!hash) {
			throw new DegitError(`could not find commit hash for ${repo.ref}`, {
				code: 'MISSING_REF',
				ref: repo.ref
			});
		}

		const file = `${dir}/${hash}.tar.gz`;
		const url = this.buildDownloadUrl(repo, hash);

		await this.downloadFile(url, file);
		CacheService.updateCache(dir, repo, hash, cached);

		this._verbose({
			code: 'EXTRACTING',
			message: `extracting ${subdir ? repo.subdir + ' from ' : ''}${file} to ${dest}`
		});

		mkdirp(dest);
		await TarExtractor.extract(file, dest, subdir);
	}

	buildDownloadUrl(repo, hash) {
		const urlMap = {
			gitlab: `${repo.url}/repository/archive.tar.gz?ref=${hash}`,
			bitbucket: `${repo.url}/get/${hash}.tar.gz`,
			default: `${repo.url}/archive/${hash}.tar.gz`
		};

		return urlMap[repo.site] || urlMap.default;
	}

	async downloadFile(url, file) {
		try {
			if (!this.cache) {
				try {
					fs.statSync(file);
					this._verbose({
						code: 'FILE_EXISTS',
						message: `${file} already exists locally`
					});
				} catch {
					mkdirp(path.dirname(file));

					if (this.proxy) {
						this._verbose({
							code: 'PROXY',
							message: `using proxy ${this.proxy}`
						});
					}

					this._verbose({
						code: 'DOWNLOADING',
						message: `downloading ${url} to ${file}`
					});

					await fetch(url, file, this.proxy);
				}
			}
		} catch (err) {
			throw new DegitError(`could not download ${url}`, {
				code: 'COULD_NOT_DOWNLOAD',
				url,
				original: err
			});
		}
	}

	async cloneWithGitSsh(dir, dest) {
		await exec(`git clone ${this.repo.ssh} ${dest}`);
		await exec(`rm -rf ${path.resolve(dest, '.git')}`);
	}

	async cloneWithGitHttps(dir, dest) {
		await exec(`git clone ${this.repo.url} ${dest}`);
		await exec(`rm -rf ${path.resolve(dest, '.git')}`);
	}

	_info(info) {
		this.emit('info', info);
	}

	_warn(info) {
		this.emit('warn', info);
	}

	_verbose(info) {
		if (this.verbose) this._info(info);
	}
}
