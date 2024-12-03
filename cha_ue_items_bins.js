/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_ue_items_bins.js
 * @description El userevent cuando se actualiza el valor del fisico, debe actualizar el registro customrecord_control_inventory_body
 * para actuaizar, el valor del fisico, diferencia % de confiabilidad y precios y costos 
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', './libraries/lib_items'], function (record, search, log, lib) {
    const entry_point = {
        afterSubmit: (context) => {}
    }
    entry_point.afterSubmit = (context) => {
        if (context.type === 'edit') {

            let orderID = Number(context.newRecord.getValue('custrecord_ci_body_parent'))
            let itemID = Number(context.newRecord.getValue('custrecord_ci_body_itemid'))
            let newStoreAmount = context.newRecord.getValue('custrecord_ci_body_in_store')

            let itemBIN = lib.get_item_on_bin({
                itemId: itemID,
                orderId: orderID
            })

            log.debug("ID", itemBIN.id)
            log.debug("BIN", itemBIN.bin)

            if (itemBIN.id) {
                record.submitFields({
                    type: 'customrecord_cha_ci_item_bin',
                    id: itemBIN.id,
                    values: {
                        custrecord_ci_itemsbins_amount: newStoreAmount
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
                    value: newStoreAmount
                });
                item_bin.save();

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