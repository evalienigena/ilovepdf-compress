const axios = require('axios');

/**
 * @class Compress
 * @classdesc Interface to interact with ilovepdf
 */
class ILovePDF {
  token = null;
  task = null;

  /**
   * Class constructor
   */
  constructor() {
    this.http = axios.create({
      baseURL: 'https://api15.ilovepdf.com/v1',
      timeout: 30 * 1000,
      responseType: 'json',
    });
  }

  /**
   * Gets the auth token and task id to perform operations
   * @return {Promise<getAuthAndTaskID__returnType>}
   */
  async auth() {
    // Obtenemos el HTML de la pagina de compresion
    const response = await axios.get('https://www.ilovepdf.com/compress_pdf');
    const html = response.data;
    if (!html.includes('ilovepdfConfig.taskId'))
      throw new Error('Could not find auth token in HTML request body');

    const findConfigRegex = /var ilovepdfConfig\s?=\s(?<config>\{.+\})/gi;
    const foundConfigRegexExec = findConfigRegex.exec(html);
    let { config } = this.getNamedGroupsFromRegexpExecArray(foundConfigRegexExec, [
      'config',
    ]);
    config = JSON.parse(config);

    const findTaskId = /ilovepdfConfig\.taskId\s?=\s?'(?<taskId>.+)'/gi;
    const foundTaskRegexExec = findTaskId.exec(html);
    const { taskId } = this.getNamedGroupsFromRegexpExecArray(foundTaskRegexExec, [
      'taskId',
    ]);

    this.token = config.token;
    this.task = taskId;
    return this;
  }

  /**
   * Uploads a file to ilovepdf to perform an operation
   * @param {Buffer} file File to upload
   * @param {String} filename Name of the file
   * @return {Promise<String>} Name of the file uploaded to ilovepdf server
   */
  async uploadFile(file, filename) {
    if (this.task === null || this.token === null)
      throw new Error('Must authenticate first.');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('task', this.task);
    form.append('name', filename);
    form.append('file', file, filename);

    const response = await this.http.post('/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data',
        Authorization: 'Bearer ' + this.token,
      },
      responseType: 'json',
    });

    if (response.status === 200 && response.data.server_filename)
      return response.data.server_filename;
  }

  /**
   * Requests ilovepdf to compress a previously uploaded file
   * @param {String} serverFilename Name of the file uploaded to ilovepdf server
   * @param {String} filename Name of file
   * @return {Promise<compress__returnType>}
   */
  async compress(serverFilename, filename) {
    const response = await this.http.post(
      '/process',
      {
        task: this.task,
        tool: 'compress',
        compression_level: 'recommended',
        output_filename: '{filename}_compressed',
        packaged_filename: 'ilovepdf_compressed',
        'files[0][filename]': filename,
        'files[0][server_filename]': serverFilename,
        level: '',
        isDefault: '',
      },
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer ' + this.token,
        },
      }
    );

    if (response.status === 200 && response.data) return response.data;
  }

  /**
   * Downloads the file with the task id
   * @return {Promise<Buffer>}
   */
  async download() {
    const response = await this.http.get('/download/' + this.task, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: 'Bearer ' + this.token,
      },
    });
    if (response.status === 200 && response.data) return response.data;
  }

  /**
   * @param {RegExpExecArray} regexpExecArray
   * @param {String[]} groupsToFind
   * @return {Object} Object with found groups values
   */
  getNamedGroupsFromRegexpExecArray(regexpExecArray, groupsToFind) {
    if (regexpExecArray === null) throw new Error('RegExpExecArray is null.');

    const { groups } = regexpExecArray;
    if (!groups || (groups && groupsToFind.some(i => !(i in groups))))
      throw new Error('Could not find one or more named groups.');

    return groupsToFind.reduce((acc, groupName) => {
      const foundValue = groups[groupName];
      acc[groupName] = foundValue;
      return acc;
    }, {});
  }
}
module.exports = ILovePDF;

/**
 * @typedef {Object} compress__returnType
 * @prop {String} download_filename
 * @prop {String} filesize
 * @prop {String} output_filesize
 * @prop {String} output_filenumber
 * @prop {String} output_extensions
 * @prop {String} timer
 * @prop {String} status
 * * * *
 * @typedef {Object} getAuthAndTaskID__returnType
 * @prop {String} authToken
 * @prop {String} taskId
 */
