/**
 * @author Néstor Á.
 * @Name cha_mr_add_items_to_order.js
 * @description Se anexan los articulos a la orden de levantamiento.
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/task'], function (error, record, runtime, search, task) {

    // Obtiene una vez el script
    const script = runtime.getCurrentScript();

    function getInputData() {

        var unProcessedItems = [];

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

        let location_type = 0;
        let locationSearch = search.create({
            type: "location",
            filters: [["internalid", "is", locationID]],
            columns: ["locationtype"]
        });

        let results = locationSearch.run().getRange({ start: 0, end: 1 }); 

        if (results.length > 0) {
            location_type = Number(results[0].getValue("locationtype"));
        }
        log.audit('locationType', location_type);

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
            
            const orderID = Number(script.getParameter({
                name: 'custscript_order_id'
            }));

            var blockData = JSON.parse(context.value);

            log.debug("PROCESANDO BLOQUE", "INICIA_BLOQUE");
            log.debug("TAMAÑO DEL BLOQUE", blockData[0].length);


            for (let i = 0; i < blockData[0].length; i++) {
                var el = blockData[0][i];

                record.create({type: "customrecord_control_inventory_body", isDynamic: false})
                    .setValue({fieldId: 'custrecord_ci_body_parent', value: orderID})
                    .setValue({fieldId: 'custrecord_ci_body_vendor', value: el.vendor})
                    .setValue({fieldId: 'custrecord_ci_body_vendor_text_', value: el.vendor_text})
                    .setValue({fieldId: 'custrecord_ci_body_itemid', value: el.internalid})
                    .setValue({fieldId: 'custrecord_ci_body_numart_text_', value: el.itemid})
                    .setValue({fieldId: 'custrecord_ci_body_purchase_description', value: el.purchase_description})
                    .setValue({fieldId: 'custrecord_ci_body_displayname', value: el.displayname})
                    .setValue({fieldId: 'custrecord_ci_body_size', value: el.size})
                    .setValue({fieldId: 'custrecord_ci_body_color', value: el.color})
                    .setValue({fieldId: 'custrecord_ci_body_unitstype', value: el.unitstype})
                    .setValue({fieldId: 'custrecord_ci_body_availabe', value: el.available})
                    .setValue({fieldId: 'custrecord_ci_body_in_store', value: el.in_store})
                    .setValue({fieldId: 'custrecord_ci_body_difference', value: el.difference})
                    .setValue({fieldId: 'custrecord_ci_body_confiability', value: el.confiability})
                    .setValue({fieldId: 'custrecord_ci_body_analysis', value: el.analysis})
                    .setValue({fieldId: 'custrecord_ci_body_base_price', value: el.base_price})
                    .setValue({fieldId: 'custrecord_ci_body_average_cost', value: el.average_cost})
                    .setValue({fieldId: 'custrecord_ci_body_price_amount', value: el.price_amount})
                    .setValue({fieldId: 'custrecord_ci_body_cost_amount', value: el.cost_amount})
                    .setValue({fieldId: 'custrecord_ci_body_system_amount', value: el.system_amount})
                    .setValue({fieldId: 'custrecord_ci_body_system_amount_cost', value: el.system_amount_cost})
                    .setValue({fieldId: 'custrecord_ci_body_in_store_amount', value: el.in_store_amount})
                    .save({ignoreMandatoryFields: true});            
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

        const orderID = Number(script.getParameter({
            name: 'custscript_order_id'
        }));

        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: orderID,
            values: {
                'custrecord_control_inventory_status': 'Sin lecturas'
            }
        });

        var customrecord_control_inventory_bodySearchObj = search.create({
            type: "customrecord_control_inventory_body",
            filters: [
                ["custrecord_ci_body_parent", "anyof", orderID],
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
        log.debug('ARTICULOS CON NUMART TEXT Y VENDOR TEXT VACIOS', searchResultCount);

        //creación de tarea para crear la actualizar los datos
        if (searchResultCount > 0) {
            const updNumart = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });
            updNumart.scriptId = 'customscript_cha_mr_upd_orden_levantamie';
            updNumart.params = {
                custscript_orderupd: orderID
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