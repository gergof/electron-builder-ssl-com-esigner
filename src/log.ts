import chalk, { ChalkInstance } from 'chalk';
import debug from 'debug';

const logFactory =
	(color: ChalkInstance, log = console.log) =>
	(message: string) => {
		log(
			`  ${color(String.fromCharCode(8266))} [ssl-com-esigner] ${message}`
		);
	};

const log = {
	info: logFactory(chalk.blue),
	error: logFactory(chalk.red),
	debug: logFactory(chalk.gray, debug('electron-builder-ssl-com-esigner'))
};

export default log;
