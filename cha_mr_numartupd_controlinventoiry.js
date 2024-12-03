/**
 * @author Cristel Ucan
 * @Name cha_mr_numartupd_controlinventoiry.js
 * @description actualiza lso numert y vendor de los registros de control de inventario que no fueron capturados al crear la orden de levantamiento
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    "N/search",
    "N/record",
    "N/runtime",
    "N/https",
    "N/format"
], function (search, record, runtime, https, format) {

    function getInputData() {
        var unProcessedItems = [];
        var idOrder = []
        const script = runtime.getCurrentScript();
        log.debug('INPUTDATA', `PROCESANDO LA  ORDEN: ${Number(script.getParameter({ name: 'custscript_orderupd' }))}`);
        idOrder = Number(script.getParameter({
            name: 'custscript_orderupd'
        }));

        var customrecord_control_inventory_bodySearchObj = search.create({
            type: "customrecord_control_inventory_body",
            filters: [
                ["custrecord_ci_body_parent", "anyof", idOrder],
                "AND",
                [
                    ["custrecord_ci_body_numart_text_", "isempty", ""],
                    "OR",
                    ["custrecord_ci_body_vendor_text_", "isempty", ""]
                ]
            ],
            columns: [
                //search.createColumn({name: "custrecord_ci_body_numart_text_", label: "_numart_text"}),
                //search.createColumn({name: "custrecord_ci_body_vendor_text_", label: "_vendor_text"}),
                search.createColumn({
                    name: "custrecord_ci_body_vendor",
                    label: "Proveedor"
                }),
                search.createColumn({
                    name: "internalid",
                    label: "ID interno"
                }),
                search.createColumn({
                    name: "custrecord_ci_body_itemid",
                    label: "Number"
                }),
                search.createColumn({
                    name: "itemid",
                    join: "CUSTRECORD_CI_BODY_ITEMID",
                    label: "Nombre"
                })
            ]
        });

        const pagedData = customrecord_control_inventory_bodySearchObj.runPaged({
            'pa​g​e​S​i​z​e': 1000
        });

        for (var i = 0; i < pagedData.pageRanges.length; i++) {
            var currentPage = pagedData.fetch(i);
            currentPage.data.forEach(function (_result) {
                unProcessedItems.push({
                    numart: _result.getValue({
                        name: "itemid",
                        join: "CUSTRECORD_CI_BODY_ITEMID"
                    }).replace(/.* :/g, ''),
                    vendor_text: _result.getText({
                        name: "custrecord_ci_body_vendor"
                    }),
                    id: _result.getText({
                        name: "internalid"
                    })
                });
                return true;
            })
        }

        return unProcessedItems;
    }

    function map(context) {
        var searchResult = JSON.parse(context.value);
        log.debug('searchResult', searchResult);

        var numart = searchResult.numart;
        var vendor_text = searchResult.vendor_text;
        var idrecord = searchResult.id;

        if (idrecord) {
            var idUpdate = record.submitFields({
                type: 'customrecord_control_inventory_body',
                id: idrecord,
                values: {
                    'custrecord_ci_body_numart_text_': numart,
                    'custrecord_ci_body_vendor_text_': vendor_text
                }

            })
        }
    }

    function summarize(summary) {
        function handleErrorInStage(currentStage, summary) {
            summary.errors.iterator().each(function (key, value) {
                log.debug(
                    "ERROR_" + currentStage,
                    "Error(" +
                    currentStage +
                    ") with key: " +
                    key +
                    ". Detail: " +
                    JSON.parse(value).message
                );
                return true;
            });
        }

        function handleErrorIfAny(summary) {
            var inputSummary = summary.inputSummary,
                mapSummary = summary.mapSummary,
                reduceSummary = summary.reduceSummary;

            if (inputSummary.error) {
                log.debug("ERROR_INPPUT_STAGE", "Erro: " + inputSummary.error);
            }

            handleErrorInStage("map", mapSummary);
            handleErrorInStage("reduce", reduceSummary);
        }

        log.debug(
            "SUMMARIZE",
            "Available metric: " + runtime.getCurrentScript().getRemainingUsage()
        );
        var completeResult = [];
        summary.output.iterator().each(function (key, value) {
            value = JSON.parse(value);
            completeResult = completeResult.concat(value);
            return true;
        });
        log.debug("RESULT", "RESULT: " + completeResult);
        handleErrorIfAny(summary);
        log.debug(
            "AFTER_SUMMARIZE",
            "Available metric: " + runtime.getCurrentScript().getRemainingUsage()
        );
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});