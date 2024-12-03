/**
 * @author Nestor A.
 * @Name cha_sl_reset_inventory_order.js
 * @description Borra los articulos y la orden de levantamiento de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/task'], function (log, record, search, runtime, task) {
    const entry_point = {
        onRequest: null,
    };

    entry_point.onRequest = function (context) {
        const {
            parameters
        } = context.request;


        const resetItems = task.create({
            taskType: task.TaskType.MAP_REDUCE
        });

        resetItems.scriptId = 'customscript_cha_mr_reset_inventory';
        resetItems.params = {
            custscript_order_id_levantamiento: parameters.orderID
        };

        var taskID = resetItems.submit();

        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: parameters.orderID,
            values: {
                custrecord_archivo_aprobacion_taskid: '',
                custrecord_archivo_concentrado_taskid: '',
                custrecord_cerrar_lecturas_taskid: '',
                custrecord_control_inventory_status: 'Rollback Lecturas',
                custrecord_add_detail_rollback: taskID,
            }
        });

        context.response.write({
            output: JSON.stringify({
                done: true
            })
        });
    }


    return entry_point;

});