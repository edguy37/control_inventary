/**
 * @author Néstor Á.
 * @Name cha_mr_add_items_to_order.js
 * @description Se anexan los articulos a la orden de levantamiento.
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/task'], function (error, record, runtime, search, task) {

    function getInputData() {

        var unProcessedItems = [];

        const script = runtime.getCurrentScript();

        const orderID = Number(script.getParameter({
            name: 'custscript_order_id_levantamiento'
        }));

        log.debug('RESET ORDEN DE LEVANTAMIENTO', `${orderID}`);

        let filters = [
            ['custrecord_ci_body_parent', 'anyof', orderID]
        ];

        var s = search.create({
            type: 'customrecord_control_inventory_body',
            filters: filters,
            columns: [
                'internalid',
                'custrecord_ci_body_availabe'
            ]
        });

        const pagedData = s.runPaged({
            pageSize: 450
        });

        var totalItems = 0;
        for (var i = 0; i < pagedData.pageRanges.length; i++) {

            var currentPage = pagedData.fetch(i);
            var items = [];

            currentPage.data.forEach(function (_result) {
                items.push({
                    internalid: Number(_result.id),
                    available: _result.getValue('custrecord_ci_body_availabe')
                });
                totalItems += 1;
            });

            unProcessedItems.push([items]);
        }

        log.debug("TOTAL PAGINADO", pagedData.pageRanges.length);
        log.debug("TOTAL ITEMS", totalItems);
        log.debug("TOTAL BLOQUES", unProcessedItems.length);

        return unProcessedItems;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        try {

            var script = runtime.getCurrentScript();
            log.debug({
                "title": "Governance Monitoring",
                "details": "Remaining Usage = " + script.getRemainingUsage()
            });

            var blockData = JSON.parse(context.value);

            log.debug("PROCESANDO BLOQUE", "INICIA_BLOQUE");
            log.debug("TAMAÑO DEL BLOQUE", blockData[0].length);

            for (let i = 0; i < blockData[0].length; i++) {
                var el = blockData[0][i];

                record.submitFields({
                    type: 'customrecord_control_inventory_body',
                    id: el.internalid,
                    values: {
                        custrecord_ci_body_in_store: 0,
                        custrecord_ci_body_difference: (el.available * -1),
                    }
                });

            }

            log.debug("PROCESANDO BLOQUE", "TERMINA BLOQUE");

        } catch (e) {
            log.error("ERROR", e)
        }
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
        log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
        log.debug('Summary Yields', 'Total Yields: ' + summary.yields);

        log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
        log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
        log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));

        const script = runtime.getCurrentScript();

        const orderID = Number(script.getParameter({
            name: 'custscript_order_id_levantamiento'
        }));

        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: orderID,
            values: {
                custrecord_control_inventory_status: 'Sin lecturas',
            }
        });

        summary.mapSummary.errors.iterator().each(function (key, value) {
            log.error(key, 'ERROR String: ' + value);
            return true;
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };

});