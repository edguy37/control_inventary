/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_rl_createadjustment.js
 * @description Se crean los ajustes de inventario de la orden de levantamiento
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record', 'N/search', 'N/task'], function (record, search, task) {
    const entry_point = {
        post: null,
    };

    entry_point.post = function (context) {
        const createAjustmentTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
        createAjustmentTask.scriptId = 'customscript_cha_mr_createadjustment';
        createAjustmentTask.params = { custscript_order_inventory: context.order };

        try {
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: context.order,
                values: {
                    custrecord_archivo_aprobacion_taskid: createAjustmentTask.submit(),
                    custrecord_control_inventory_status: 'Generando ajustes de inventario'
                }
            });
            return {
                code: 'success',
                messaage: 'Se ha iniciado el proceso de ajustes de inventario'
            }
        } catch (error) {
            log.error('error', error);
            return {
                code: 'error',
                message: error.message
            }
        }
    }//end post

    return entry_point;
});