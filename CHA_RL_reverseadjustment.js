/**
 * @author Daniela Camara <daniela.camara@chapur.com>
 * @Name CHA|RL|reverseadjustment.js
 * @description Se hace la reversa de los ajustes de inventario de la orden de levantamiento
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record', 'N/search', 'N/task'], function (record, search, task) {
    const entry_point = {
        post: null,  // Definimos la función post como nula al inicio
    };

    entry_point.post = function (context) {
        // Se crea una tarea Map/Reduce con el tipo adecuado
        const reverseAjustmentTask = task.create({ taskType: task.TaskType.MAP_REDUCE });

        // Se asigna el ID del script que se ejecutará al crear la tarea Map/Reduce
        reverseAjustmentTask.scriptId = 'customscriptcha_mr_reverseadjustment';  // Reemplazado el scriptId
      log.debug('reverseAjustmentTask', reverseAjustmentTask);
      

        // Asignamos los parámetros necesarios para el script Map/Reduce, en este caso el ID de la orden
        reverseAjustmentTask.params = { custscript_order_inventory_: context.order };
       log.debug('reverseAjustmentTask.params', reverseAjustmentTask.params);

        try {
            // Actualizamos el registro de control de inventario con el ID de la tarea y el estado correspondiente
            record.submitFields({
                type: 'customrecord_order_control_inventory',  // Tipo de registro a actualizar
                id: context.order,  // ID de la orden que se va a actualizar
                values: {
                    // Asignamos el ID de la tarea Map/Reduce creada al campo 'custrecord_reverseadjustment_taskid'
                    custrecord_reverseadjustment_taskid: reverseAjustmentTask.submit(),
                    // Actualizamos el estado de la orden
                   custrecord_control_inventory_status: 'Pendiente aprobación'
                }
            });

            // Si el proceso se ejecuta correctamente, devolvemos un mensaje de éxito
            return {
                code: 'success',  // Código de éxito
                message: 'Se ha iniciado el proceso de reversa de ajustes de inventario'  // Mensaje informativo de éxito
            }
        } catch (error) {
            // Si ocurre un error, se captura y se registra el error
            log.error('error', error);  // Se registra el error en los logs de NetSuite

            // Devolvemos un mensaje de error con la información del problema
            return {
                code: 'error',  // Código de error
                message: error.message  // Mensaje de error detallado
            }
        }
    } // Fin de la función 'post'

    // Retornamos el objeto 'entry_point' para que el Restlet pueda acceder a la función 'post'
    return entry_point;
});