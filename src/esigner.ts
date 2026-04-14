import cp from 'node:child_process';
import path from 'node:path';

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
		const proc = cp.spawn(
			'java',
			[
				'-jar',
				codeSignTool,
				'sign',
				`-credential_id=${config.credentialId}`,
				`-username=${config.username}`,
				`-password=${config.password}`,
				`-totp_secret=${config.totpSecret}`,
				`-input_file_path=${exe}`,
				`-override`
			],
			{
				cwd: path.join(path.dirname(codeSignTool), '..')
			}
		);

		const stdout = consumeStream(proc.stdout);
		const stderr = consumeStream(proc.stderr);

		proc.on('error', e => {
			log.error(`eSigner error: ${e.toString()}`);
			reject(e);
		});

		proc.on('close', async code => {
			const stdoutText = await stdout;
			const stderrText = await stderr;

			const handleError = (message: string) => {
				log.error(message);
				logESignOutput('stdout', stdoutText, log.error);
				logESignOutput('stderr', stderrText, log.error);
				reject(new Error(message));
			};

			if (code !== 0) {
				handleError(
					`eSigner finished with non-zero exit code: ${code}`
				);
				return;
			}

			if (stderrText.trim()) {
				handleError(`eSigner wrote error messages`);
				return;
			}

			if (
				stdoutText.split('\n').some(line => line.startsWith('Error:'))
			) {
				handleError('eSigner failed');
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
