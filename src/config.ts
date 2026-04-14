import env from 'env-var';

import { CONFIG_PREFIX } from './const.js';
import { camelToSnakeUpper } from './utils.js';

export interface Config {
	credentialId: string;
	username: string;
	password: string;
	totpSecret: string;
}

const getEnvVar = (paramName: string) => {
	return env
		.get(`${CONFIG_PREFIX}_${camelToSnakeUpper(paramName)}`)
		.required()
		.asString();
};

const getConfig = (): Config => {
	return ['credentialId', 'username', 'password', 'totpSecret'].reduce(
		(acc, cur) => ({
			...acc,
			[cur]: getEnvVar(cur)
		}),
		{}
	) as Config;
};

export default getConfig;
