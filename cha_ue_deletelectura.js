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
      if (context.type === 'edit') {
          log.debug({title:"log before"});

      }if (context.userEventType === 'edit') {
        log.debug({title:"log before extended"});

      }else{log.debug({title:"else beforeSubmit"})}

      log.debug("afuera del if before", context);
    }

    entry_point.afterSubmit = (context) => {
      if (context.type === 'edit') {
          log.debug("log after");

      }if (context.userEventType === 'edit') {
        log.debug("log before extended");

      }else{log.debug({title:"else afterSubmit"})}

      log.debug({title:"afuera del if after"});
    }
    
    return entry_point;

  });