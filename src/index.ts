import fs from 'node:fs';
import path from 'node:path';

import { WindowsSignTaskConfiguration } from 'electron-builder';

import getConfig from './config.js';
import eSignerSign from './esigner.js';
import log from './log.js';
import { checkJavaExists } from './utils.js';

const sign = async (signTask: WindowsSignTaskConfiguration) => {
	let nativeAddon = false;
	let fileToSign = signTask.path;

	log.info(`Signing '${path.basename(fileToSign)}' with SSL.com eSigner`);

	log.debug('Loading configuration from env vars');
	const config = getConfig();

	log.debug('Checking if Java is installed');
	const javaExists = await checkJavaExists();
	if (!javaExists) {
		log.error('Java is required to run SSL.com eSigner');
		throw new Error('Java not installed');
	}

	if (path.extname(fileToSign).toLowerCase() == '.node') {
		log.info('Signing native addon, renaming to have .dll extension first');
		nativeAddon = true;
		const dllPath = `${fileToSign}.dll`;
		await fs.promises.rename(fileToSign, dllPath);
		fileToSign = dllPath;
	}

	await eSignerSign(config, fileToSign);

	if (nativeAddon) {
		log.info('Restoring extension to .node');
		await fs.promises.rename(fileToSign, signTask.path);
	}

	log.info('Signing process completed');
};

export default sign;
