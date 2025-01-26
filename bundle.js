// bundles the server with the rest of the build

import * as fs from 'fs';

fs.cpSync('./server', './dist', {recursive: true});