const axios = require('axios');
const { dirExists } = require('./utils');
const fs = require('fs/promises');
const ILovePDF = require('./ilovepdf');

/**
 *
 */
async function run() {
  const ilovepdf = new ILovePDF();
  const ARRAY_ERROR = [];
  const input = ['01GKJBRBQJPNTD9BGVKWM7Y1WV'];

  console.log(`Vamos a procesar ${input.length} casos de Contrato Digital.`);
  for (let i = 0; i < input.length; i++) {
    const percentage = (i / input.length) * 100;
    const percentageStr =
      (`${percentage}`.includes('.') ? percentage.toFixed(2) : `${percentage}`) + '%';

    const id = input[i];
    console.log(
      `${percentageStr} | ${i} de ${input.length} | Vamos a procesar el ID: ${id}`
    );

    try {
      const { data: file } = await axios.get(
        `https://files.claro-sv.cloud/CONTRATO-DIGITAL/contrato/${id}-contrato.pdf`,
        {
          responseType: 'arraybuffer',
        }
      );

      const originalBytes = Buffer.byteLength(file, 'utf8');
      console.log(`\tObtenemos el archivo original de ${originalBytes / 1000} KB`);
      const dir = `./out/`;
      const filename = `${id}.pdf`;

      // Comprimir archivo
      await ilovepdf.auth();
      console.log(`\tObtenemos el token ${ilovepdf.token} y task ${ilovepdf.task}`);
      const serverFilename = await ilovepdf.uploadFile(file, filename);
      console.log('\tSubimos el archivo con filename ' + serverFilename);
      await ilovepdf.compress(serverFilename, filename);
      const compressed = await ilovepdf.download();

      const compressedBytes = Buffer.byteLength(compressed, 'utf8');

      console.log(
        `\tOriginal: ${originalBytes / 1000} KB\n` +
          `\tComprimido ${compressedBytes / 1000} KB\n` +
          `\tReduccion: ${(100 - (compressedBytes * 100) / originalBytes).toFixed(2)}%\n`
      );

      if (!(await dirExists(dir))) await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(dir + filename, compressed);
    } catch (e) {
      console.log(`\tOcurrió un error`);
      if (e.response || e.request) {
        console.log(e.toJSON());
        console.log(e.response);
      } else console.log(e);
      ARRAY_ERROR.push(id);
      await fs.writeFile('./error.txt', ARRAY_ERROR.join('\n'), {
        encoding: 'utf-8',
      });
    }
  }
}

run();
