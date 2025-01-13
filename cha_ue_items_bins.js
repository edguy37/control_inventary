/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_ue_items_bins.js
 * @description El userevent cuando se actualiza el valor del fisico, debe actualizar el registro customrecord_control_inventory_body
 * para actuaizar, el valor del fisico, diferencia % de confiabilidad y precios y costos 
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', './libraries/lib_items', 'N/runtime'], function (record, search, log, lib, runtime) {
    const entry_point = {
        afterSubmit: (context) => {}
    }
    entry_point.afterSubmit = (context) => {
        log.debug('context.type', context.type);
        log.debug('runtime.executionContext', runtime.executionContext);
        
        if (context.type === 'edit' && runtime.executionContext === runtime.ContextType.USER_INTERFACE) {

            let orderID = Number(context.newRecord.getValue('custrecord_ci_body_parent'));
            let itemID = Number(context.newRecord.getValue('custrecord_ci_body_itemid'));
            let newQuantityInStore = context.newRecord.getValue('custrecord_ci_body_in_store'); // Valor new de Campo "Fisico" del Detalle de Orden de levantamiento
            let oldQuantityInStore = context.oldRecord.getValue('custrecord_ci_body_in_store'); // Valor old de Campo "Fisico" del Detalle de Orden de levantamiento

            let itemBIN = lib.get_item_on_binUE({
                itemId: itemID,
                orderId: orderID
            })

            // 1. Obtener la diferencia = new - old 
            let difference = newQuantityInStore - oldQuantityInStore; // Diferencia es el valor new - valor old del campo fisico

            // 2. Obtener la nueva cantidad para el registro de articulos-bins control inventario para que cuadre la cantidad de FISICO 
            // Nueva cantidad = "Cantidad" actual de articulos-bins inventario + diferencia 
            let newQuantityInStoreWithDifference = itemBIN.quantity + difference; 
            
            log.debug('newQuantityInStoreWithDifference', newQuantityInStoreWithDifference);
            log.debug('newQuantityInStore nuevo FISICO', newQuantityInStore);
            log.debug('oldQuantityInStore anterior FISICO', oldQuantityInStore);
            log.debug('Diferencia = NUEVO - ANTERIOR', difference);
            log.debug('itemBIN', itemBIN);

            if (difference !== 0) {
                if (itemBIN.id) {
                    record.submitFields({
                        type: 'customrecord_cha_ci_item_bin',
                        id: itemBIN.id,
                        values: {
                            custrecord_ci_itemsbins_amount: newQuantityInStoreWithDifference
                        }
                    })
                } else {
    
                    const item_bin = record.create({
                        type: 'customrecord_cha_ci_item_bin'
                    });
                    item_bin.setValue({
                        fieldId: 'custrecord_ci_itemsbins_folio',
                        value: orderID
                    });
                    item_bin.setValue({
                        fieldId: 'custrecord_ci_itemsbins_item',
                        value: itemID
                    });
                    item_bin.setValue({
                        fieldId: 'custrecord_ci_itemsbins_bin',
                        value: get_bin_of_order(orderID)
                    });
                    item_bin.setValue({
                        fieldId: 'custrecord_ci_itemsbins_amount',
                        value: newQuantityInStoreWithDifference
                    });
                    item_bin.save();
    
                }
            }
        }
    }

    function get_bin_of_order(orderId) {
        let bin;
        search.create({
            type: 'customrecord_cha_ci_item_bin',
            filters: [
                ['custrecord_ci_itemsbins_folio', 'anyof', orderId]
            ],
            columns: [
                'custrecord_ci_itemsbins_bin'
            ]
        }).run().each(result => {
            bin = result.getValue('custrecord_ci_itemsbins_bin')
        });
        return bin;
    }


    return entry_point;

});