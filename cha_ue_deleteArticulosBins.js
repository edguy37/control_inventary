/**
 * @author 
 * @Name cha_ue_deleteArticulos-Bins.js
 * @description 
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */


define(
  ['N/file', 'N/search', 'N/record', 'N/log', './libraries/lib_items'], function (file, search, record, log, items) {
    const entry_point = {
      beforeSubmit: (context) => {}
    };
    
    entry_point.beforeSubmit = (context) => {
      log.debug("log context before", context);
      if(context.type === "edit"|| context.type === "delete"){
        log.debug("Validar si entra al if");
	  }
    }
    
    return entry_point;

  });