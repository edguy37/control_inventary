/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_rl_to_create_goblal_file.js
 * @description Restlet va a recibir la información para iniciar la tarea para crear el archivo concentrado
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/task', 'N/record'], function (task, record) {
    const entry_point = {
        post: (context) => { }
    }
    entry_point.post = (context) => {
        const createGlobalFileTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
        createGlobalFileTask.scriptId = 'customscript_cha_mr_all_files_in_csv';
        createGlobalFileTask.deploymentId = 'customdeploy1';
        createGlobalFileTask.params = { custscript_order_number: context.order };

        try {
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: context.order,
                values: {
                    custrecord_archivo_concentrado_taskid: createGlobalFileTask.submit(),
                    custrecord_control_inventory_file: ''
                }
            });
            return {
                code: 'success',
                messaage: 'Se ha iniciado el proceso de generación de archivo concentrado'
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
