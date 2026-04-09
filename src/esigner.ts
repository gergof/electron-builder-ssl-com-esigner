import cp from 'node:child_process';

import { Config } from './config.js';
import log from './log.js';
import { consumeStream, findCodeSignTool } from './utils.js';

const logESignOutput = (type: string, output: string, logger = log.debug) => {
	if (!output) {
		return;
	}

	output.split('\n').forEach(line => logger(`[eSigner:${type}] ${line}`));
};

const eSignerSign = async (config: Config, exe: string): Promise<void> => {
	const codeSignTool = await findCodeSignTool();

	return new Promise((resolve, reject) => {
		log.debug('Spawning eSigner process');
		const proc = cp.spawn('java', [
			'-jar',
			codeSignTool,
			`-credential_id=${config.credentialId}`,
			`-username=${config.username}`,
			`-password=${config.password}`,
			`-totp_secret=${config.totpSecret}`,
			`-input_file_path=${exe}`,
			`-override`
		]);

		const stdout = consumeStream(proc.stdout);
		const stderr = consumeStream(proc.stderr);

		proc.on('error', e => {
			log.error(`eSigner error: ${e.toString()}`);
			reject(e);
		});

		proc.on('close', async code => {
			if (code !== 0) {
				log.error(`eSigner finished with non-zero exit code: ${code}`);
				logESignOutput('stdout', await stdout, log.error);
				logESignOutput('stderr', await stderr, log.error);
				reject(
					new Error(
						`eSigner finished with non-zero exit code: ${code}`
					)
				);
				return;
			}

			logESignOutput('stdout', await stdout);
			logESignOutput('stderr', await stderr);
			log.debug('eSigner finished');

			resolve();
		});
	});
};

export default eSignerSign;
