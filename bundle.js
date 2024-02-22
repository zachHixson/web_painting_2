import * as fs from 'fs';

fs.cpSync('./server', './dist', {recursive: true});