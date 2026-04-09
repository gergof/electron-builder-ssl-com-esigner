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
	const esignerPath = path.join(
		path.dirname(url.fileURLToPath(import.meta.url)),
		'..',
		'esigner',
		'jar',
		'code_sign_tool-*.jar'
	);

	const files = await FastGlob.async(
		FastGlob.convertPathToPattern(esignerPath)
	);

	const tool = files[0];

	if (!tool) {
		log.error(
			'Failed to find eSigner tool. Did the postinstall script execute?'
		);
		throw new Error('Missing eSigner tool');
	}

	return tool;
};

export const checkJavaExists = (): Promise<boolean> => {
	return new Promise(resolve => {
		const proc = cp.spawn('java', ['-version']);

		let version = '';
		proc.stderr.on('data', data => {
			version += data.toString();
		});

		proc.on('error', () => {
			resolve(false);
		});

		proc.on('close', () => {
			log.debug(`Java version: ${version.replaceAll('\n', ' ')}`);
			resolve(true);
		});
	});
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
