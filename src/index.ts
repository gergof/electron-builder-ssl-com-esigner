import path from 'node:path';

import { WindowsSignTaskConfiguration } from 'electron-builder';

import getConfig from './config.js';
import eSignerSign from './esigner.js';
import log from './log.js';
import { checkJavaExists } from './utils.js';

const sign = async (signTask: WindowsSignTaskConfiguration) => {
	log.info(`Signing '${path.basename(signTask.path)}' with SSL.com eSigner`);

	log.debug('Loading configuration from env vars');
	const config = getConfig();

	log.debug('Checking if Java is installed');
	const javaExists = await checkJavaExists();
	if (!javaExists) {
		log.error('Java is required to run SSL.com eSigner');
		throw new Error('Java not installed');
	}

	await eSignerSign(config, signTask.path);

	log.info('Signing process completed');
};

export default sign;
