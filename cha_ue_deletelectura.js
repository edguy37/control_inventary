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
      //log.debug("log context before", context.type);
      if(context.type === "edit"|| context.type === "delete"){
        log.debug("context", context);
      }

    }
    
    return entry_point;

  });


  function beforeSubmit(context) {
    //saveLog("BeforeSubmit context", context)
    //log.debug("Beforesubtmit TYPE_VIEW_SUBMIT", context.type);
    if (context.type == context.UserEventType.DELETE) {
        if (context.newRecord.getValue({
                fieldId: 'type'
            })) {
            var vendorPayment = context.newRecord;
        } else {
            var vendorPayment = context.oldRecord;
        }

        //log.debug("vendor DAta", vendorPayment);
        //log.debug("subsidiary", vendorPayment.getValue({ fieldId: 'subsidiary' }));

        //Validacion pra cuando llegue el evento desde microsip
        if (!(vendorPayment.getValue({
                fieldId: 'subsidiary'
            }) && vendorPayment.getLineCount({
                sublistId: 'apply'
            }))) {
            log.debug("NO llegaron los campos subsidiary y apply");
            recordID = vendorPayment.id;
            try {
                vendorPayment = record.load({
                    type: record.Type.CUSTOMER_PAYMENT,
                    id: recordID,
                    isDynamic: true
                });
            } catch (error) {

            }
        }
        var numRows = vendorPayment.getLineCount({
                sublistId: 'apply'
            }),
            reConfig = customDataAPI.getConfig(vendorPayment.getValue({
                fieldId: 'subsidiary'
            })),
            billIdList = [];

        if (reConfig) {
        }
    }
}