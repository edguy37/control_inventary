/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_mr_add_adjustment_reason.js
 * @description Mapreduce para agregar motivos de ajuste a los articulos
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */
define(['N/record', 'N/runtime','N/search'], function (record, runtime, search) {
    const entry_point = {
        getInputData: () => { },
        map: () => { },
        reduce: () => { },
        summarize: () => { }
    }

    entry_point.getInputData = () => {
        const script = runtime.getCurrentScript();
        const order =  Number(script.getParameter({ name: 'custscript_number_order' }));
        const observation =  JSON.parse(script.getParameter({ name: 'custscript_observation' }));
        log.audit('Filters - inputData', ' script ' + script)
        log.audit('Filters - inputData',' order ' + order )
        log.audit('Filters - inputData',' observation ' + observation )
        return search.create({
            type: 'customrecord_control_inventory_body',
            filters: [
                ['custrecord_ci_body_parent', 'anyof', order],
                'AND',
                ['custrecord_ci_body_observation', 'anyof', observation]
            ]
        });
    }

    entry_point.map = (context) => {
        const itemid = context.key;
        const script = runtime.getCurrentScript();
        const adjustmentReason = Number(script.getParameter({ name: 'custscript_reason' }));

        record.submitFields({
            type: 'customrecord_control_inventory_body',
            id: itemid,
            values: {
                custrecord_ci_body_adjusment_reason: adjustmentReason
            }
        });
    }
    entry_point.summarize = (context) => {
        const thereAreAnyError = (context) => {
            const inputSummary = context.inputSummary;
            const mapSummary = context.mapSummary;
            const reduceSummary = context.reduceSummary;
            //si no hay errores entonces se sale del la función y se retorna false incando que no hubo errores
            if (!inputSummary.error) return false;

            //se hay errores entonces se imprimen los errores en el log para poder visualizarlos
            if (inputSummary.error) log.debug("ERROR_INPPUT_STAGE", `Erro: ${inputSummary.error}`);
            handleErrorInStage('map', mapSummary);
            handleErrorInStage('reduce', reduceSummary);

            function handleErrorInStage(currentStage, summary) {
                summary.errors.iterator().each((key, value) => {
                    log.debug(`ERROR_${currentStage}`, `Error( ${currentStage} ) with key: ${key}.Detail: ${JSON.parse(value).message}`);
                    return true;
                });
            }
            return true;
        };
        //si no hay errores en el proceso entonces se actualiza la orden de levantamiento, cambiando el estado a lecturas cerradas
        if (!thereAreAnyError(context)) {
            const script = runtime.getCurrentScript();
            const order = Number(script.getParameter({ name: 'custscript_number_order' }));
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: order,
                values: {
                    custrecord_motivo_de_ajuste_taskid: ''
                }
            });
        }
        log.audit('Summary', [
            { title: 'Usage units consumed', details: context.usage },
            { title: 'Concurrency', details: context.concurrency },
            { title: 'Number of yields', details: context.yields }
        ]);
    }//end summarize

    return entry_point;
});