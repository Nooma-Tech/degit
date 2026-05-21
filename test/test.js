require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const glob = require('tiny-glob/sync');
const rimraf = require('rimraf').sync;
const assert = require('assert');
const child_process = require('child_process');

const degit = require('../dist/index.js');
const degitPath = path.resolve('dist/bin.js');

const timeout = process.env.CI ? 60000 : 30000;

function exec(cmd) {
	return new Promise((fulfil, reject) => {
		child_process.exec(cmd, (err, stdout, stderr) => {
			if (err) return reject(err);
			console.log(stdout);
			console.error(stderr);
			fulfil();
		});
	});
}

describe('degit', function() {
	this.timeout(timeout);

	function compare(dir, files) {
		const expected = glob('**', { cwd: dir });
		assert.deepEqual(Object.keys(files).sort(), expected.sort());

		expected.forEach(file => {
			if (!fs.lstatSync(`${dir}/${file}`).isDirectory()) {
				assert.equal(files[file].trim(), read(`${dir}/${file}`).trim());
			}
		});
	}

	beforeEach(async () => await rimraf('.tmp'));
	afterEach(async () => await rimraf('.tmp'));

	describe('github', () => {
		[
			'mhkeller/degit-test-repo-compose',
			'Rich-Harris/degit-test-repo',
			'github:Rich-Harris/degit-test-repo',
			'git@github.com:Rich-Harris/degit-test-repo',
			'https://github.com/Rich-Harris/degit-test-repo.git'
		].forEach(src => {
			it(src, async () => {
				await exec(`node ${degitPath} ${src} .tmp/test-repo -v`);
				compare(`.tmp/test-repo`, {
					'file.txt': 'hello from github!',
					subdir: null,
					'subdir/file.txt': 'hello from a subdirectory!'
				});
			});
		});
	});

	// GitLab tests removed due to external service connectivity issues

	describe('bitbucket', () => {
		[
			'bitbucket:Rich_Harris/degit-test-repo',
			'git@bitbucket.org:Rich_Harris/degit-test-repo',
			'https://bitbucket.org/Rich_Harris/degit-test-repo.git'
		].forEach(src => {
			it(src, async () => {
				await exec(`node ${degitPath} ${src} .tmp/test-repo -v`);
				compare(`.tmp/test-repo`, {
					'file.txt': 'hello from bitbucket'
				});
			});
		});
	});

	// Sourcehut tests removed due to SSL certificate issues

	describe('Subdirectories', () => {
		[
			'Rich-Harris/degit-test-repo/subdir',
			'github:Rich-Harris/degit-test-repo/subdir',
			'git@github.com:Rich-Harris/degit-test-repo/subdir',
			'https://github.com/Rich-Harris/degit-test-repo.git/subdir'
		].forEach(src => {
			it(src, async () => {
				await exec(`node ${degitPath} ${src} .tmp/test-repo -v`);
				compare(`.tmp/test-repo`, {
					'file.txt': 'hello from a subdirectory!'
				});
			});
		});
	});

	describe('non-empty directories', () => {
		it('fails without --force', async () => {
			let succeeded;

			try {
				await exec(`mkdir -p .tmp/test-repo`);
				await exec(`echo "not empty" > .tmp/test-repo/file.txt`);
				await exec(
					`node ${degitPath} Rich-Harris/degit-test-repo .tmp/test-repo -v`
				);
				succeeded = true;
			} catch (err) {
				assert.ok(/destination directory is not empty/.test(err.message));
			}

			assert.ok(!succeeded);
		});

		it('succeeds with --force', async () => {
			await exec(
				`node ${degitPath} Rich-Harris/degit-test-repo .tmp/test-repo -fv`
			);
		});
	});

	describe('command line arguments', () => {
		it('allows flags wherever', async () => {
			await exec(
				`node ${degitPath} -v Rich-Harris/degit-test-repo .tmp/test-repo`
			);
			compare(`.tmp/test-repo`, {
				'file.txt': 'hello from github!',
				subdir: null,
				'subdir/file.txt': 'hello from a subdirectory!'
			});
		});
	});

	describe('api', () => {
		it('is usable from node scripts', async () => {
			await degit('Rich-Harris/degit-test-repo', { force: true }).clone(
				'.tmp/test-repo'
			);

			compare(`.tmp/test-repo`, {
				'file.txt': 'hello from github!',
				subdir: null,
				'subdir/file.txt': 'hello from a subdirectory!'
			});
		});
	});

	describe('actions', () => {
		it('removes specified file', async () => {
			await exec(
				`node ${degitPath} -v mhkeller/degit-test-repo-remove-only .tmp/test-repo`
			);
			compare(`.tmp/test-repo`, {});
		});

		it('clones repo and removes specified file', async () => {
			await exec(
				`node ${degitPath} -v mhkeller/degit-test-repo-remove .tmp/test-repo`
			);
			compare(`.tmp/test-repo`, {
				'other.txt': 'hello from github!',
				subdir: null,
				'subdir/file.txt': 'hello from a subdirectory!'
			});
		});

		it('removes and adds nested files', async () => {
			await rimraf('.tmp');

			await exec(
				`node ${degitPath} -v mhkeller/degit-test-repo-nested-actions .tmp/test-repo`
			);
			compare(`.tmp/test-repo`, {
				dir: null,
				folder: null,
				subdir: null,
				'folder/file.txt': 'hello from clobber file!',
				'folder/other.txt': 'hello from other file!',
				'subdir/file.txt': 'hello from a subdirectory!'
			});
		});
	});

	describe('git modes', () => {
		it('clones public repo using git-https mode', async () => {
			await exec(`node ${degitPath} --mode=git-https Rich-Harris/degit-test-repo .tmp/test-repo -v`);
			compare('.tmp/test-repo', {
				'file.txt': 'hello from github!',
				subdir: null,
				'subdir/file.txt': 'hello from a subdirectory!'
			});
		});

		// Note: git-ssh and git modes require SSH keys configured
		// These are tested manually and work when proper SSH setup is available
	});

	describe('shell injection (CVE)', () => {
		const sandbox = path.resolve('.tmp/sandbox');

		function tryRun(cmd, cwd) {
			return new Promise(resolve => {
				child_process.exec(cmd, { cwd }, () => resolve());
			});
		}

		beforeEach(async () => {
			await rimraf('.tmp');
			fs.mkdirSync(sandbox, { recursive: true });
		});

		it('does not interpret shell metacharacters in src (mode=git)', async () => {
			const marker = path.join(sandbox, 'PWN_GIT');
			const src = `github:foo/bar;:>PWN_GIT`;
			await tryRun(`node ${degitPath} '${src}' --mode=git --force out`, sandbox);
			assert.ok(
				!fs.existsSync(marker),
				`shell injection succeeded: ${marker} was created`
			);
		});

		it('does not interpret shell metacharacters in src (mode=git-https)', async () => {
			const marker = path.join(sandbox, 'PWN_HTTPS');
			const src = `github:foo/bar;:>PWN_HTTPS`;
			await tryRun(`node ${degitPath} '${src}' --mode=git-https --force out`, sandbox);
			assert.ok(
				!fs.existsSync(marker),
				`shell injection succeeded: ${marker} was created`
			);
		});

		it('does not interpret shell metacharacters in src (mode=tar, via ls-remote)', async () => {
			const marker = path.join(sandbox, 'PWN_TAR');
			const src = `github:foo/bar;:>PWN_TAR`;
			await tryRun(`node ${degitPath} '${src}' --force out`, sandbox);
			assert.ok(
				!fs.existsSync(marker),
				`shell injection succeeded: ${marker} was created`
			);
		});

		it('rejects user names with shell metacharacters at parse time', async () => {
			const { RepoParser } = degit;
			assert.throws(
				() => RepoParser.parse('foo;rm/bar'),
				/invalid characters in user/
			);
			assert.throws(
				() => RepoParser.parse('foo/bar`whoami`'),
				/invalid characters in repo/
			);
			assert.throws(
				() => RepoParser.parse('foo/bar/sub$dir'),
				/invalid characters in subdir/
			);
		});
	});

	describe('script hardening', () => {
		const sandbox = path.resolve('.tmp/sandbox');
		const dest = path.join(sandbox, 'dest');

		beforeEach(async () => {
			await rimraf('.tmp');
			fs.mkdirSync(dest, { recursive: true });
		});

		function makeProcessor(opts = {}) {
			const { DirectiveProcessor } = degit;
			const emitted = [];
			const fakeDegit = {
				_info: e => emitted.push(['info', e]),
				_warn: e => emitted.push(['warn', e]),
				_verbose: e => emitted.push(['verbose', e]),
				_hasStashed: false,
				allowScripts: opts.allowScripts === true,
				yes: opts.yes === true
			};
			return { proc: new DirectiveProcessor(fakeDegit), emitted };
		}

		it('skips script action without --allow-scripts', async () => {
			const marker = path.join(sandbox, 'SCRIPT_PWN');
			const { proc, emitted } = makeProcessor({ allowScripts: false });
			await proc.handleScript(dest, dest, {
				commands: [{ file: 'touch', args: [marker] }]
			});
			assert.ok(!fs.existsSync(marker), 'script should not have run');
			assert.ok(
				emitted.some(([, e]) => e.code === 'SCRIPTS_DISABLED'),
				'expected SCRIPTS_DISABLED warning'
			);
		});

		it('runs argv-list command with --allow-scripts --yes', async () => {
			const marker = path.join(sandbox, 'SCRIPT_OK');
			const { proc } = makeProcessor({ allowScripts: true, yes: true });
			await proc.handleScript(dest, dest, {
				commands: [{ file: 'touch', args: [marker] }]
			});
			assert.ok(fs.existsSync(marker), 'argv-list command should run');
		});

		it('treats interpolated prompt vars as argv literals (no shell parsing)', async () => {
			const marker = path.join(sandbox, 'PROMPT_PWN');
			const { proc } = makeProcessor({ allowScripts: true, yes: true });
			proc.variables = { evil: `foo;touch ${marker}` };
			await proc.handleScript(dest, dest, {
				commands: ['echo {{evil}}']
			});
			assert.ok(
				!fs.existsSync(marker),
				'interpolated var must not execute as shell — it should be an argv literal'
			);
		});

		it('rejects legacy string commands containing shell operators', async () => {
			const marker = path.join(sandbox, 'OPERATOR_PWN');
			const { proc, emitted } = makeProcessor({ allowScripts: true, yes: true });
			await proc.handleScript(dest, dest, {
				commands: [`echo hi; touch ${marker}`],
				failOnError: false
			});
			assert.ok(
				!fs.existsSync(marker),
				'shell operator ";" must be rejected, not executed'
			);
			assert.ok(
				emitted.some(([, e]) => e.code === 'UNSUPPORTED_SHELL_OPERATOR' || e.code === 'COMMAND_ERROR'),
				'expected error about unsupported operator'
			);
		});
	});
});

function read(file) {
	return fs.readFileSync(file, 'utf-8');
}
