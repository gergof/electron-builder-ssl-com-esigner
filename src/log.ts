import chalk, { ChalkInstance } from 'chalk';
import env from 'env-var';

import { CONFIG_PREFIX } from './const.js';

const isDebugEnabled = env
	.get(`${CONFIG_PREFIX}_DEBUG`)
	.default('false')
	.asBool();

const logFactory =
	(color: ChalkInstance, enabled: boolean = true) =>
	(message: string) => {
		if (!enabled) {
			return;
		}

		console.log(
			`  ${color(String.fromCharCode(8226))} [ssl-com-esigner] ${message}`
		);
	};

const log = {
	info: logFactory(chalk.blue),
	error: logFactory(chalk.red),
	debug: logFactory(chalk.gray, isDebugEnabled)
};

export default log;
