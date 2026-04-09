import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import url from 'node:url';

import { rimraf } from 'rimraf';
import unzipper from 'unzipper';

const ESIGNER_URL =
	'https://app.esigner.com/documents/084005ab-5d44-4466-84ed-a09b160bfde1/file';

const main = async () => {
	console.log('Downloading SSL.com eSigner');

	const esignerDir = path.join(
		path.dirname(url.fileURLToPath(import.meta.url)),
		'..',
		'esigner'
	);

	console.log('- Deleting existing folder');
	await rimraf(esignerDir);

	console.log('- Downloading zip archive');
	const res = await fetch(ESIGNER_URL);

	if (!res.ok || !res.body) {
		throw new Error(`Download failed: ${res.status} ${res.statusText}`);
	}

	const zipFile = path.join(os.tmpdir(), `${crypto.randomUUID()}.zip`);

	console.log(`- Saving archive to ${zipFile}`);
	const fileStream = fs.createWriteStream(zipFile);
	await new Promise((resolve, reject) => {
		Readable.fromWeb(res.body)
			.pipe(fileStream)
			.on('error', reject)
			.on('finish', resolve);
	});

	console.log('- Extracting archive');
	const directory = await unzipper.Open.file(zipFile);
	await directory.extract({ path: esignerDir });

	console.log('- Removing temporary file');
	await fsp.unlink(zipFile);

	console.log('- Done');
};

main();
