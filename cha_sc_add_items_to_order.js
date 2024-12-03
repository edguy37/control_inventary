/**
 * @author Rodrigo Canul <rodrigo.canul@chapur.com>
 * @Name cha_sc_add_items_to_order.js
 * @description Script que agrega los articulos a la orden de levantamiento.
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/runtime'], function (record, log, runtime) {

    function execute(context) {

            const script = runtime.getCurrentScript();            
            const orderID =  Number(script.getParameter({ name: 'custscript_order_id_sc' }));
            const itemsToProcess = JSON.parse(script.getParameter({ name: 'custscript_items_to_process_1' }));
            //log.debug('itemsToProcess', itemsToProcess);


            log.debug("Procesando registros de inventario", `Orden Levantamiento #: ${orderID}, # Articulos: ${itemsToProcess.length}`);
            let contador = 0;
            let idCreados = [];
            itemsToProcess.forEach(function (item) {
                contador++;
                try {
                    //log.audit('Registro a Crear', item);
                    let itemOrder = record.create({type: "customrecord_control_inventory_body", isDynamic: true});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_parent', value: orderID});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_vendor', value: item.vendor});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_vendor_text_', value: item.vendor_text});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_itemid', value: item.internalid});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_numart_text_', value: item.itemid});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_purchase_description', value: item.purchase_description});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_displayname', value: item.displayname});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_size', value: item.size});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_color', value: item.color});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_unitstype', value: item.unitstype});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_availabe', value: item.available});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_in_store', value: item.in_store});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_difference', value: item.difference});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_confiability', value: item.confiability});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_analysis', value: item.analysis});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_base_price', value: item.base_price});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_average_cost', value: item.average_cost});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_price_amount', value: item.price_amount});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_cost_amount', value: item.cost_amount});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_system_amount', value: item.system_amount});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_system_amount_cost', value: item.system_amount_cost});
                        itemOrder.setValue({fieldId: 'custrecord_ci_body_in_store_amount', value: item.in_store_amount});
                    let recordid = itemOrder.save({ignoreMandatoryFields: true});
                    idCreados.push(recordid);
                    
                    log.audit({
                        title: 'Registro Creado',
                        details: 'ID: ' + recordid + ', Detalle Articulo: ' + JSON.stringify(item)
                    });                    
                } catch (e) {
                    log.error('Error al crear registro',e);
                }
            });
            log.debug({
                title: 'Array IDs Creados',
                details: idCreados.join(', ')
            });            
            log.debug("Registros Procesados en ForEach",contador);

    }

    return {
        execute: execute
    };

});
