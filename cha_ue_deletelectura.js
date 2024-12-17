/**
 * @author Enrique Martin <enrique.martin@chapur.com>
 * @Name cha_ue_deletelectura.js
 * @description User event para cuando se elimina una lectura. Borra las existencias asociadas a la lectura y elimina los archivos del gabinete.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */


define(
  ['N/file', 'N/search', 'N/record', 'N/log', './libraries/lib_items'], function (file, search, record, log, items) {
    const entry_point = {
      beforeSubmit: (context) => {}
    };
    
    entry_point.beforeSubmit = (context) => {
      //log.debug("log context before", context.type);
      if(context.type === "edit"|| context.type === "delete"){
        //log.debug("context", context);
        const order = context.oldRecord.getValue({ fieldId: 'custrecord_control_inventory_order' });
        const lectura = context.oldRecord.getValue({ fieldId: 'custrecord_control_inventory_files_raw' });
        let file_items = items.get_items_by_file({
          order: order,
          file: lectura
        });
        let ids = file_items.map(item => item.internalid);
        // log.debug("file_items", file_items);
        // log.debug("items.internalid", ids);
        // let item = {};
        // let i = 0;
        var s = search.create({
          type: "customrecord_control_inventory_body",
          filters:
          [
             ["custrecord_ci_body_parent","anyof","922"], 
             "AND", 
             ["custrecord_ci_body_itemid.internalid","anyof", ...ids]
          ],
          columns:
          [
             "internalid",
             "custrecord_ci_body_availabe",
             "custrecord_ci_body_in_store",
             "custrecord_ci_body_difference"
          ]
       }).run().each((el)=>{
          item = {
            itemid: el.getText('internalid'),
            in_system: Number(el.getValue('custrecord_ci_body_availabe')),
            in_store: Number(el.getValue('custrecord_ci_body_in_store')),
            difference: Number(el.getValue('custrecord_ci_body_difference')),
          }
          let in_store = item.in_store - file_items.count;
          let in_system = item.in_system;
          let difference = in_store - in_system;
          i++;
          return true;
        });
      /* record.submitFields({
        type: 'customrecord_control_inventory_body',
        id: el.internalid,
        values: {
            custrecord_ci_body_in_store: 0,
            custrecord_ci_body_difference: (el.custrecord_ci_body_difference * -1), //restar la cantidad real
        }
      }); */
      }

    }
    
    return entry_point;

  });