/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_rl_add_adjustment_reason.js
 * @description El restlet va a recibir los archivos TXT de las lecturas para buscar los articulos devolver las exitencias fisicas deacuerdo al conteo del archivo
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record', 'N/task', 'N/search'], function (record, task, search) {
    const entry_point = {
        post: (context) => { }
    }
    entry_point.post = (context) => {
        const takidField = search.lookupFields({type:'customrecord_order_control_inventory', id: context.order, columns: ['custrecord_motivo_de_ajuste_taskid']});
        if(takidField.custrecord_motivo_de_ajuste_taskid){
            return {
                code: 'error',
                message: 'Actualmente ya se está ejecutando una tarea de asignaición de ajuste en la orden '+ context.order+' es necesario esperar a que finalice para comenzar otra'
            }
        }
        const addAjustmentReason = task.create({ taskType: task.TaskType.MAP_REDUCE });
        addAjustmentReason.scriptId = 'customscript_cha_mr_add_adjustment_reaso';
        addAjustmentReason.deploymentId = 'customdeploy1';
        addAjustmentReason.params = { 
            custscript_number_order: context.order, 
            custscript_reason: context.reason,
            custscript_observation: JSON.stringify(context.observation)
        };
      var idtask = addAjustmentReason.submit();
        try {
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: context.order,
                values: {
                    custrecord_motivo_de_ajuste_taskid: idtask//addAjustmentReason.submit(),
                }
            });
            return {
                code: 'success',
                messaage: 'Se ha iniciado el proceso agregar los motivos de ajuste'
            }
        } catch (error) {
            log.error('error', error);
            return {
                code: 'error',
                message: error.message
            }
        }
    }
    return entry_point;
});