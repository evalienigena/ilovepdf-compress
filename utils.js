/**
 * Evalua si un directorio existe
 * @param {String} dirname Nombre del folder
 * @return {Promise<Boolean>}
 */
async function dirExists(dirname) {
  try {
    await fs.access(dirname, 1, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}
exports.dirExists = dirExists;
