/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_createempty.js
 * @description Eventos de usuario para el formulario Orden de levantamiento
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */

define(['N/ui/message', 'N/url', 'N/record'], function (message, url, record) {
    const entry_point = {
        pageInit: (context) => { }
    }
    entry_point.pageInit = (context) => {
        //si se ha creado un registro anteriormente y fue exitoso entonces se muestra al usuario la información en forma de mensaje
        if (Number(context.currentRecord.getValue('custpage_last_order_created')) > 0) {
            const lastOrderCreated = Number(context.currentRecord.getValue('custpage_last_order_created'));
            //url al record creado anteriormente
            const recordUrl = url.resolveRecord({ recordType: 'customrecord_order_control_inventory', recordId: lastOrderCreated, });
            message.create({
                title: 'Solicitud de creación de orden de levantamiento',
                message: `Se ha creado la orden de levantamiento con folio <b>#${lastOrderCreated}</b><br/>
                Click en el enlace para abrir el registro de la orden: <a href="${recordUrl}">Orden de levantamiento #${lastOrderCreated} </a>`,
                type: message.Type.CONFIRMATION
            }).show({ duration: 30000 });
        }
        //si no se ha creado con éxito la orden de levantamiento previa entonces se muestro el mensaje de error 
        if(Number(context.currentRecord.getValue('custpage_last_order_created')) === -1){
            message.create({
                title: 'Solicitud de creación de orden de levantamiento',
                message: `No se ha podido crear la orden de levantamiento, no se pueden crear ordenes sin articulos`,
                type: message.Type.ERROR
            }).show({ duration: 30000 });
        }
    }

    entry_point.fieldChanged = (context) => {
        log.audit('context.fieldId',context.fieldId)
        if (context.fieldId === 'custpage_location') {
            
            const location = record.load({
                type: 'location',
                id: context.currentRecord.getValue('custpage_location'),
            });       
            
           /*const type = location.getValue({ fieldId: 'custrecord_cha_location_type' });
            
            const departmentF = context.currentRecord.getField('custpage_department');
            
            departmentF.isMandatory = [1, 4].includes(Number(type));*/
            
            // PABC 28-11-2022 cambio
            const type = location.getValue({ fieldId: 'makeinventoryavailable' });
            const departmentF = context.currentRecord.getField('custpage_department');

            if(type == false){
                departmentF.isMandatory = false;
            }
        }
    }

    return entry_point;
});