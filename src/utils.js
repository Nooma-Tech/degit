import fs from 'fs';
import path from 'path';
import homeOrTmp from 'home-or-tmp';
import https from 'https';
import child_process from 'child_process';
import URL from 'url';
import Agent from 'https-proxy-agent';
import { rimrafSync, copydirSync } from 'sander';

const tmpDirName = 'tmp';
const degitConfigName = 'degit.json';

export { degitConfigName };

export class DegitError extends Error {
	constructor(message, opts) {
		super(message);
		Object.assign(this, opts);
	}
}

export const tryRequire = (file, opts = {}) => {
	try {
		if (opts.clearCache) {
			delete require.cache[require.resolve(file)];
		}
		return require(file);
	} catch {
		return null;
	}
};

export const exec = command => 
	new Promise((resolve, reject) => {
		child_process.exec(command, (err, stdout, stderr) => {
			if (err) {
				reject(err);
				return;
			}
			resolve({ stdout, stderr });
		});
	});

export const mkdirp = dir => {
	const parent = path.dirname(dir);
	if (parent === dir) return;

	mkdirp(parent);

	try {
		fs.mkdirSync(dir);
	} catch (err) {
		if (err.code !== 'EEXIST') throw err;
	}
};

const createHttpsOptions = (url, proxy) => {
	if (!proxy) return url;
	
	const parsedUrl = URL.parse(url);
	return {
		hostname: parsedUrl.host,
		path: parsedUrl.path,
		agent: new Agent(proxy)
	};
};

const handleHttpResponse = (response, dest, proxy, resolve, reject) => {
	const { statusCode: code, statusMessage: message, headers } = response;
	
	if (code >= 400) {
		reject({ code, message });
		return;
	}
	
	if (code >= 300) {
		fetch(headers.location, dest, proxy).then(resolve, reject);
		return;
	}
	
	response
		.pipe(fs.createWriteStream(dest))
		.on('finish', resolve)
		.on('error', reject);
};

export const fetch = (url, dest, proxy) => 
	new Promise((resolve, reject) => {
		const options = createHttpsOptions(url, proxy);
		
		https
			.get(options, response => 
				handleHttpResponse(response, dest, proxy, resolve, reject)
			)
			.on('error', reject);
	});

const moveFile = (source, target) => {
	const isDirectory = fs.lstatSync(source).isDirectory();
	
	if (isDirectory) {
		copydirSync(source).to(target);
		rimrafSync(source);
	} else {
		fs.copyFileSync(source, target);
		fs.unlinkSync(source);
	}
};

export const stashFiles = (dir, dest) => {
	const tmpDir = path.join(dir, tmpDirName);
	rimrafSync(tmpDir);
	mkdirp(tmpDir);
	
	fs.readdirSync(dest).forEach(file => {
		const filePath = path.join(dest, file);
		const targetPath = path.join(tmpDir, file);
		moveFile(filePath, targetPath);
	});
};

const restoreFile = (source, target, filename) => {
	const isDirectory = fs.lstatSync(source).isDirectory();
	
	if (isDirectory) {
		copydirSync(source).to(target);
		rimrafSync(source);
	} else {
		if (filename !== 'degit.json') {
			fs.copyFileSync(source, target);
		}
		fs.unlinkSync(source);
	}
};

export const unstashFiles = (dir, dest) => {
	const tmpDir = path.join(dir, tmpDirName);
	
	fs.readdirSync(tmpDir).forEach(filename => {
		const tmpFile = path.join(tmpDir, filename);
		const targetPath = path.join(dest, filename);
		restoreFile(tmpFile, targetPath, filename);
	});
	
	rimrafSync(tmpDir);
};

export const base = path.join(homeOrTmp, '.degit');