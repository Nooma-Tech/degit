import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import mri from 'mri';
import glob from 'tiny-glob/sync.js';
import fuzzysearch from 'fuzzysearch';
import enquirer from 'enquirer';
import degit from './index.js';
import { tryRequire, base } from './utils.js';

const parseArgs = () => mri(process.argv.slice(2), {
	alias: {
		f: 'force',
		c: 'cache',
		v: 'verbose',
		m: 'mode'
	},
	boolean: ['force', 'cache', 'verbose']
});

const formatHelp = content =>
	content
		.replace(/^(\s*)#+ (.+)/gm, (m, s, _) => s + chalk.bold(_))
		.replace(/_([^_]+)_/g, (m, _) => chalk.underline(_))
		.replace(/`([^`]+)`/g, (m, _) => chalk.cyan(_));

const showHelp = () => {
	try {
		const helpPath = path.resolve(__dirname, '..', 'help.md');
		const help = fs.readFileSync(helpPath, 'utf-8');
		process.stdout.write(`\n${formatHelp(help)}\n`);
	} catch {
		const fallbackHelp = `
# @nooma-tech/degit

Usage: degit <src>[#ref] [<dest>] [options]

Straightforward project scaffolding with advanced template support.

Options:
  --help,    -h  Show this message
  --cache,   -c  Only use local cache
  --force,   -f  Allow non-empty destination directory
  --verbose, -v  Extra logging
  --mode=,   -m= Clone mode: tar (default), git-ssh, git-https

Template Actions:
- prompt: Interactive variable collection
- template: Text replacement with variables
- rename: File/directory renaming
- script: Execute shell commands
- remove: Delete files/directories

Examples:
  npx @nooma-tech/degit user/repo
  npx @nooma-tech/degit --mode=git-https user/private-repo
  npx @nooma-tech/degit template-repo my-project

See https://github.com/Nooma-Tech/degit for full documentation
		`;
		process.stdout.write(`\n${formatHelp(fallbackHelp)}\n`);
	}
};

const buildAccessLookup = () => {
	const accessLookup = new Map();

	glob(`**/access.json`, { cwd: base }).forEach(file => {
		const [host, user, repo] = file.split(path.sep);
		const json = fs.readFileSync(`${base}/${file}`, 'utf-8');
		const logs = JSON.parse(json);

		Object.entries(logs).forEach(([ref, timestamp]) => {
			const id = `${host}:${user}/${repo}#${ref}`;
			accessLookup.set(id, new Date(timestamp).getTime());
		});
	});

	return accessLookup;
};

const createChoice = file => {
	const [host, user, repo] = file.split(path.sep);
	const mapData = tryRequire(`${base}/${file}`);

	return Object.entries(mapData).map(([ref, hash]) => ({
		name: hash,
		message: `${host}:${user}/${repo}#${ref}`,
		value: `${host}:${user}/${repo}#${ref}`
	}));
};

const buildChoices = accessLookup => {
	return glob(`**/map.json`, { cwd: base })
		.map(createChoice)
		.flat()
		.sort((a, b) => {
			const aTime = accessLookup.get(a.value) || 0;
			const bTime = accessLookup.get(b.value) || 0;
			return bTime - aTime;
		});
};

const promptForOptions = async choices => {
	return enquirer.prompt([
		{
			type: 'autocomplete',
			name: 'src',
			message: 'Repo to clone?',
			suggest: (input, choices) =>
				choices.filter(({ value }) => fuzzysearch(input, value)),
			choices
		},
		{
			type: 'input',
			name: 'dest',
			message: 'Destination directory?',
			initial: '.'
		},
		{
			type: 'toggle',
			name: 'cache',
			message: 'Use cached version?'
		}
	]);
};

const checkForceOverwrite = async dest => {
	const isEmpty = !fs.existsSync(dest) || fs.readdirSync(dest).length === 0;

	if (isEmpty) return true;

	const { force } = await enquirer.prompt([{
		type: 'toggle',
		name: 'force',
		message: 'Overwrite existing files?'
	}]);

	if (!force) {
		console.error(chalk.magenta(`! Directory not empty — aborting`));
		return false;
	}

	return true;
};

const runInteractiveMode = async () => {
	const accessLookup = buildAccessLookup();
	const choices = buildChoices(accessLookup);
	const options = await promptForOptions(choices);

	const canProceed = await checkForceOverwrite(options.dest);
	if (!canProceed) return;

	run(options.src, options.dest, {
		force: true,
		cache: options.cache
	});
};

const setupEventHandlers = degitInstance => {
	degitInstance.on('info', event => {
		console.error(chalk.cyan(`> ${event.message.replace('options.', '--')}`));
	});

	degitInstance.on('warn', event => {
		console.error(chalk.magenta(`! ${event.message.replace('options.', '--')}`));
	});
};

const run = (src, dest, args) => {
	const degitInstance = degit(src, args);

	setupEventHandlers(degitInstance);

	degitInstance.clone(dest).catch(err => {
		console.error(chalk.red(`! ${err.message.replace('options.', '--')}`));
		process.exit(1);
	});
};

const main = async () => {
	const args = parseArgs();
	const [src, dest = '.'] = args._;

	if (args.help) {
		showHelp();
	} else if (!src) {
		await runInteractiveMode();
	} else {
		run(src, dest, args);
	}
};

main();
