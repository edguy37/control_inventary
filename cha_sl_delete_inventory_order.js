/**
 * @author Nestor A.
 * @Name cha_sl_delete_inventory_order.js
 * @description Borra los articulos y la orden de levantamiento de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/log', 'N/record', 'N/search', 'N/runtime'], function (log, record, search, runtime) {
    const entry_point = {
        onRequest: null,
    };

    entry_point.onRequest = function (context) {
        const {
            parameters
        } = context.request;

        var script = runtime.getCurrentScript();

        let response = {
            all_delete: false,
            missing : 0
        };

        let items = search.create({
            type: "customrecord_control_inventory_body",
            filters: [
                "custrecord_ci_body_parent", "anyof", parameters.orderID
            ],
            columns: [
                'internalid',
            ]
        });

        response.missing = items.runPaged().count;

        let resultSet = items.run();

        log.debug("GOVERNANTS RESTANTES", script.getRemainingUsage())

        let currentItemRange = resultSet.getRange({
            start: 0,
            end: 220
        });

        let i = 0;

        while (i < currentItemRange.length) {

            record.delete({
                type: 'customrecord_control_inventory_body',
                id: currentItemRange[i].id
            });

            log.debug("GOVERNANTS RESTANTES AFTER DELETE", script.getRemainingUsage())
            i++;
        }

        if (response.missing <= 220) {
            record.delete({
                type: 'customrecord_order_control_inventory',
                id: parameters.orderID
            });
            response.all_delete = true;
        }

        context.response.write({
            output: JSON.stringify(response)
        });
    }


    return entry_point;

});