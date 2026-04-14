import cp from 'node:child_process';
import path from 'node:path';
import Stream from 'node:stream';
import url from 'node:url';

import FastGlob from 'fast-glob';

import log from './log.js';

export const camelToSnakeUpper = (str: string): string => {
	return str
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
		.toUpperCase();
};

export const findCodeSignTool = async (): Promise<string> => {
	const eSignerDir = path.join(
		path.dirname(url.fileURLToPath(import.meta.url)),
		'..',
		'esigner',
		'jar'
	);

	log.debug(`Searching for eSigner at: ${eSignerDir}`);

	const files = await FastGlob.async(
		`${FastGlob.convertPathToPattern(eSignerDir)}/code_sign_tool-*.jar`
	);

	log.debug(`Found ${files.length} files matching: ${JSON.stringify(files)}`);

	const tool = files[0];

	if (!tool) {
		log.error(
			'Failed to find eSigner tool. Did the postinstall script execute?'
		);
		throw new Error('Missing eSigner tool');
	}

	return tool;
};

export const consumeStream = (stream: Stream.Readable): Promise<string> => {
	return new Promise(resolve => {
		let str = '';

		stream.on('data', data => {
			str += data.toString();
		});

		stream.on('close', () => {
			resolve(str);
		});
	});
};

export const checkJavaExists = (): Promise<boolean> => {
	return new Promise(resolve => {
		const proc = cp.spawn('java', ['-version']);

		const version = consumeStream(proc.stderr);

		proc.on('error', () => {
			resolve(false);
		});

		proc.on('close', async code => {
			if (code !== 0) {
				resolve(false);
				return;
			}

			log.debug(`Java version: ${(await version).replaceAll('\n', ' ')}`);
			resolve(true);
		});
	});
};
