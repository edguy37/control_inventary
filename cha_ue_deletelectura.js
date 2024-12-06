/**
 * @author Enrique Martin <enrique.martin@chapur.com>
 * @Name cha_ue_deletelectura.js
 * @description User event para cuando se elimina una lectura. Borra las existencias asociadas a la lectura y elimina los archivos del gabinete.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */


define(
  ['N/file', 'N/search', 'N/record', 'N/log',], function (file, search, record, log) {
    const entry_point = {
      beforeSubmit: (context) => {}
    };

    entry_point.beforeSubmit = (context) => {
      log.debug("log context before", context.type);
    }

    entry_point.afterSubmit = (context) => {
      log.debug("log context after", context.type);
    }
    
    return entry_point;

  });