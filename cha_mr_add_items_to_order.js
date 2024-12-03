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
            name: 'custscript_order_id'
        }));
        const subsidiaryID = Number(script.getParameter({
            name: 'custscript_subsidiary_id'
        }));
        const locationID = Number(script.getParameter({
            name: 'custscript_location_id'
        }));
        const departmentID = Number(script.getParameter({
            name: 'custscript_department_id'
        }));
        const vendorData = script.getParameter({
            name: 'custscript_vendor_id'
        });

        const classID = Number(script.getParameter({
            name: 'custscript_class_id'
        }));

        log.debug('PROCESANDO ORDEN DE LEVANTAMIENTO', `${orderID}`);

        log.audit('departmentID', departmentID);
        let arrag = [];
        log.audit('vendorData',vendorData);
        log.audit('vendorData2', typeof(vendorData));
        if(vendorData !== null && vendorData !== " " && vendorData !== undefined){
            var work = vendorData.split(',');
            for(var x = 0; x < work.length; x++){
                let f = parseInt(work[x]);
                arrag.push(f);
            }
            log.audit('arrag',arrag);
        }
        let filters = [
            ['subsidiary', 'anyof', subsidiaryID],
            'AND',
            ['inventorylocation', 'anyof', locationID],
            // 'AND',
            // ['department', 'anyof', departmentID],
            'AND',
            ['matrix', 'is', 'F'],
            'AND',
            ['isinactive', 'is', false]
        ];

        let ubicacion = record.load({
            type: "location",
            id: locationID,
            isDynamic: false
        });

        let location_type = Number(ubicacion.getValue({
            fieldId: 'locationtype'
        })); //Acomodo-1 Tienda-4

        if (departmentID != 0)
            filters.push('AND', ['department', 'anyof', departmentID], );

        if (location_type === 1 || location_type === 4) {
            filters.push('AND', ['locationquantityavailable', 'greaterthan', '0']);
        } else {
            filters.push('AND', ['locationquantityonhand', 'greaterthan', '0']);
        }

        if (vendorData && vendorData[0]) {
            filters.push('AND', ['vendor', 'anyof', arrag]);
        }
        if (classID) filters.push('AND', ['class', 'anyof', classID]);

        log.audit('filters', filters)

        var s = search.create({
            type: 'item',
            filters: filters,
            columns: [
                'itemid',
                'vendor',
                'salesdescription',
                'displayname',
                'custitem27', //talla chapur
                'custitem26', //color chapur
                'averagecost', //search.createColumn({ name: "formulacurrency", formula: "NVL({averagecost}, 0)", }),
                search.createColumn({
                    name: "formulacurrency",
                    formula: "NVL({baseprice}, 0)",
                }),
                'unitstype',
                'locationquantityavailable',
                'locationquantitycommitted',
                'locationquantityonhand',
            ]
        });

        const pagedData = s.runPaged({
            pageSize: 150
        });

        var totalItems = 0;
        for (var i = 0; i < pagedData.pageRanges.length; i++) {

            var currentPage = pagedData.fetch(i);
            var items = [];

            currentPage.data.forEach(function (_result) {
                let available = 0;

                if (location_type === 1 || location_type === 4) {
                    available = Number(_result.getValue('locationquantityavailable')) + Number(_result.getValue('locationquantitycommitted'));
                } else {
                    filters.push('AND', ['locationquantityonhand', 'notequalto', '0']);
                    available = Number(_result.getValue('locationquantityonhand'));
                }

                items.push({
                    selection: 'F',
                    internalid: Number(_result.id),
                    itemid: _result.getValue('itemid').replace(/.* :/g, ''),
                    purchase_description: _result.getValue('salesdescription') || ' ',
                    displayname: _result.getValue('displayname').replace(/ : .+/, ''),
                    size: _result.getText('custitem27') === '' ? ' ' : _result.getText('custitem27'),
                    color: _result.getText('custitem26'),
                    unitstype: _result.getText('unitstype'),
                    vendor: Number(_result.getValue('vendor')),
                    vendor_text: _result.getText('vendor'),
                    average_cost: Number(_result.getValue('averagecost')),
                    base_price: Number(_result.getValue({
                        name: "formulacurrency",
                        formula: "NVL({baseprice}, 0)",
                    })),
                    available: available, //get_inventory_balance(result.id, context.location),
                    observation: 0,
                    in_store: 0,
                    difference: -1 * available,
                    confiability: 0,
                    analysis: ' ',
                    decrease: 'No',
                    price_amount: Number(parseFloat((-1 * available) * Number(_result.getValue({
                        name: "formulacurrency",
                        formula: "NVL({baseprice}, 0)",
                    }))).toFixed(2)), //importe precio
                    cost_amount: Number(parseFloat((-1 * available) * Number(_result.getValue('averagecost'))).toFixed(2)), //importe costo
                    system_amount: Number(parseFloat(available * Number(_result.getValue({
                        name: "formulacurrency",
                        formula: "NVL({baseprice}, 0)",
                    }))).toFixed(2)), //valor sistema
                    system_amount_cost: Number(parseFloat(available * Number(_result.getValue('averagecost'))).toFixed(2)), //valor sistema costo
                    in_store_amount: Number(parseFloat(0 * Number(_result.getValue({
                        name: "formulacurrency",
                        formula: "NVL({baseprice}, 0)",
                    }))).toFixed(2)), //valor fisico
                    id: 0
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

            const script = runtime.getCurrentScript();

            const orderID = Number(script.getParameter({
                name: 'custscript_order_id'
            }));

            var blockData = JSON.parse(context.value);

            log.debug("PROCESANDO BLOQUE", "INICIA_BLOQUE");
            log.debug("TAMAÑO DEL BLOQUE", blockData[0].length);
            var itemsToProcess = [];

            for (let i = 0; i < blockData[0].length; i++) {
                var el = blockData[0][i];

                itemsToProcess.push({
                    vendor: el.vendor,
                    vendor_text: el.vendor_text,
                    itemid: el.itemid,
                    internalid: el.internalid,
                    purchase_description: el.purchase_description,
                    displayname: el.displayname,
                    size: el.size,
                    color: el.color,
                    unitstype: el.unitstype,
                    available: el.available,
                    in_store: el.in_store,
                    difference: el.difference,
                    confiability: el.confiability,
                    analysis: el.analysis,
                    base_price: el.base_price,
                    average_cost: el.average_cost,
                    price_amount: el.price_amount,
                    cost_amount: el.cost_amount,
                    system_amount: el.system_amount,
                    system_amount_cost: el.system_amount_cost,
                    in_store_amount: el.in_store_amount
                });
            }
            log.debug('ORDER ID ANTES CREAR TAREA', orderID);
            log.debug('ITEMTOPROCESS ANTES CREAR TAREA', JSON.stringify(itemsToProcess));

            // Una vez agrupados los 150 items se mandan al script programado para registrarlos en la orden
            const scheduledTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_cha_sc_add_items_to_order', // ID del script programado
                params: {
                    custscript_order_id_sc: orderID,  // Parametro adicional para identificar el pedido
                    custscript_items_to_process_1: JSON.stringify(itemsToProcess)  // Pasamos los datos como string
                }
            });

            scheduledTask.submit();  // Ejecutamos la tarea programada

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
            name: 'custscript_order_id'
        }));

        let order = record.load({
            type: "customrecord_order_control_inventory",
            id: orderID,
            isDynamic: true
        });

        order.setValue({
            fieldId: 'custrecord_control_inventory_status',
            value: 'Sin lecturas'
        });

        order.save();

        var customrecord_control_inventory_bodySearchObj = search.create({
            type: "customrecord_control_inventory_body",
            filters: [
                ["custrecord_ci_body_parent", "anyof", order.id],
                "AND",
                [
                    ["custrecord_ci_body_numart_text_", "isempty", ""],
                    "OR",
                    ["custrecord_ci_body_vendor_text_", "isempty", ""]
                ],
                "AND",
                ["custrecord_ci_body_difference", "notequalto", 0]
            ],
            columns: []
        });

        var searchResultCount = customrecord_control_inventory_bodySearchObj.runPaged().count;

        //creación de tarea para crear la actualizar los datos
        if (searchResultCount > 0) {
            const updNumart = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });
            updNumart.scriptId = 'customscript_cha_mr_upd_orden_levantamie';
            updNumart.params = {
                custscript_orderupd: order.id
            };
            updNumart.submit();
        }

        //Grab Map errors
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