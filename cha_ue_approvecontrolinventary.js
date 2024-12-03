/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_ue_approvecontrolinventary.js
 * @description crea los botones en el registro de control de inventarios
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/redirect', 'N/task', 'N/search', 'N/runtime'], function (redirect, task, search, runtime) {
   const entry_point = {
      beforeLoad: null,
   };

   const rolesPermission = {
      openReadOrder: [3, 1110, 1015, 1016, 1152],
      openAnalysisOrder: [3, 1110, 1015, 1016, 1152],
      adminsOnly: [3, 1016, 1152],
   }

   entry_point.beforeLoad = function (context) {

      let roleID = runtime.getCurrentUser().role
      log.debug("ROLE_ID", roleID)

      switch (context.type) {
         case 'create': { //CUM 04Nov2021 redirigir a suitelet para crear orden de levantamiento
            redirect.toSuitelet({
               scriptId: 'customscript_cha_s_control_inventary',
               deploymentId: 'customdeploy_cha_s_control_inventary'
            })
         }
         //el record no se podrá abrir en modo edición, ya es redireccionado para abrir solo en modo vista
         case 'edit': {
            redirect.toRecord({
               type: 'customrecord_order_control_inventory',
               id: context.newRecord.id,
            });
            break;
         }
         case 'view': {
            context.form.removeButton({
               id: 'edit',
            });
            context.form.clientScriptModulePath = './libraries/lib_cs_close_control_inventory.js'; //se carga el client script como modulo del suitelet
            //si hay una tarea pendiente generando el archivo concentrado en record entonces se muestra la notificación

            const order = search.lookupFields({
               type: 'customrecord_order_control_inventory',
               id: context.newRecord.id,
               columns: [
                  'custrecord_archivo_concentrado_taskid',
                  'custrecord_cerrar_lecturas_taskid',
                  'custrecord_control_inventory_file',
                  'custrecord_archivo_aprobacion_taskid',
                  'custrecord_add_items_taskid',
                  'custrecord_add_detail_rollback'
               ]
            });
            
            if (order.custrecord_add_items_taskid) {
               const injected_field = context.form.addField({
                  id: 'custpage_carga_articulos_message',
                  type: 'INLINEHTML',
                  label: '_carga_articulos_message'
               });

               const addItemsTask = task.checkStatus(order.custrecord_add_items_taskid);

               if (['PENDING', 'PROCESSING'].indexOf(addItemsTask.status) > -1) {

                  taskNotificacion({
                        title: 'Generando carga de inventario',
                        message: `Se estan generando los articulos al inventario: <b>${addItemsTask.getPercentageCompleted()}%</b>`,
                        type: 'message.Type.INFORMATION'
                     },
                     injected_field
                  );

               }
            }

            if (order.custrecord_add_detail_rollback) {
               const injected_field = context.form.addField({
                  id: 'custpage_rollback_articulos_message',
                  type: 'INLINEHTML',
                  label: '_rollback_articulos_message'
               });

               const rollbackItemsTask = task.checkStatus(order.custrecord_add_detail_rollback);

               if (['PENDING', 'PROCESSING'].indexOf(rollbackItemsTask.status) > -1) {

                  taskNotificacion({
                        title: 'Haciendo rollback a la carga de inventario',
                        message: `Se estahaciendo rollback a los articulos de la orden de levantamiento: <b>${rollbackItemsTask.getPercentageCompleted()}%</b>`,
                        type: 'message.Type.INFORMATION'
                     },
                     injected_field
                  );

               }
            }

            if (order.custrecord_archivo_concentrado_taskid) {
               const injected_field = context.form.addField({
                  id: 'custpage_globalfile_message',
                  type: 'INLINEHTML',
                  label: '_archivo_concentrado_message'
               });
               const createGlobalFileTask = task.checkStatus(order.custrecord_archivo_concentrado_taskid);
               if (['PENDING', 'PROCESSING'].indexOf(createGlobalFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'Generando archivo concentrador',
                        message: `La tarea de generación del archivo esta en <b>${createGlobalFileTask.getPercentageCompleted()}%</b>`,
                        type: 'message.Type.INFORMATION'
                     },
                     injected_field
                  );
               }
               if (['COMPLETE', 'FAILED'].indexOf(createGlobalFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'No se ha podido generar el archivo concentrador',
                        message: `Ocurrio un error mientras se intentaba generar el archivo concentrador.<br/><b>Es probable que uno más archivos de lectura esten corruptos</b>.<br/>Verifica que todos las lecturas tengan el formato correcto e intenta más tarde.`,
                        type: 'message.Type.ERROR'
                     },
                     injected_field
                  );
               }
            }
            //si hay una tarea pendiente generando el cierre de las lecturas entonces se muestra la notificación correspondiente
            if (order.custrecord_cerrar_lecturas_taskid) {
               const injected_field = context.form.addField({
                  id: 'custpage_cierrelecturas_message',
                  type: 'INLINEHTML',
                  label: '_cierrelecturas_message'
               });
               const closingFileTask = task.checkStatus(order.custrecord_cerrar_lecturas_taskid);
               if (['PENDING', 'PROCESSING'].indexOf(closingFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'Cerrando lecturas',
                        message: `La tarea de cierre de lecturas está en <b>${closingFileTask.getPercentageCompleted()}%</b>`,
                        type: 'message.Type.INFORMATION'
                     },
                     injected_field
                  );
               }
               if (['COMPLETE', 'FAILED'].indexOf(closingFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'Cerrando lecturas',
                        message: `Ocurrio un error mientras se intentaba generar el cierre de las lecturas.<br/><b>Es probable que uno más archivos de lectura esten corruptos</b>.<br/>Verifica que todos las lecturas tengan el formato correcto e intenta más tarde.`,
                        type: 'message.Type.ERROR'
                     },
                     injected_field
                  );
               }
            }
            //se hay una tarea pendiente generando los ajustes de inventario entonces se muestra la notificación correspondiente
            if (order.custrecord_archivo_aprobacion_taskid) {
               const injected_field = context.form.addField({
                  id: 'custpage_inventoryadjustment_message',
                  type: 'INLINEHTML',
                  label: '_cierrelecturas_message'
               });
               const closingFileTask = task.checkStatus(order.custrecord_archivo_aprobacion_taskid);
               if (['PENDING', 'PROCESSING'].indexOf(closingFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'Generando ajustes de inventario',
                        message: `Se estan generando los ajustes de inventario: <b>${closingFileTask.getPercentageCompleted()}%</b>`,
                        type: 'message.Type.INFORMATION'
                     },
                     injected_field
                  );
               }
               if (['COMPLETE', 'FAILED'].indexOf(closingFileTask.status) > -1) {
                  taskNotificacion({
                        title: 'Generando ajustes de inventario',
                        message: `Ocurrio un error mientras se intentaba generar los ajustes de inventario correspondientes.<br/><b>Es probable que haya un error en la estructura del detalle Mueble-Cantidad</b>.<br/>Verifica que toda la información sea correcta.`,
                        type: 'message.Type.ERROR'
                     },
                     injected_field
                  );
               }
            }

            switch (context.newRecord.getValue('custrecord_control_inventory_status')) {
               case 'Sin lecturas': {
                  context.form.addButton({
                     id: 'custpage_delete',
                     label: 'ELIMINAR',
                     functionName: 'deleteOrder(' + context.newRecord.id + ')'
                  });
                  context.form.addButton({
                     id: 'custpage_to_upload',
                     label: 'Cargar/Cerrar Lecturas',
                     functionName: 'uploadFiles(' + context.newRecord.id + ')'
                  });
                  break;
               }
               case 'Cargando lecturas': {
                  context.form.addButton({
                     id: 'custpage_to_upload',
                     label: 'Cargar/Cerrar Lecturas',
                     functionName: 'uploadFiles(' + context.newRecord.id + ')'
                  });
                  break;
               }
               case 'Lecturas cerradas': {

                  context.form.addButton({
                     id: 'custpage_to_upload',
                     label: 'Análisis',
                     functionName: 'createAnalysis(' + context.newRecord.id + ')'
                  });

                  if (rolesPermission.openReadOrder.includes(roleID)) {
                     context.form.addButton({
                        id: 'custpage_to_open_order',
                        label: 'Reabrir Lecturas',
                        functionName: 'makeReadOpen(' + context.newRecord.id + ')'
                     });
                  }

                  break;
               }
               case 'Análisis finalizado': {

                  if (rolesPermission.adminsOnly.includes(roleID)) {
                     context.form.addButton({
                        id: 'custpage_to_analisis_order',
                        label: 'Reabrir Lecturas',
                        functionName: 'makeAnalysisOpen(' + context.newRecord.id + ')'
                     });
                  }

                  context.form.addButton({
                     id: 'custpage_to_upload',
                     label: 'Análisis',
                     functionName: 'createAnalysis(' + context.newRecord.id + ')'
                  });

                  context.form.addButton({
                     id: 'custpage_to_upload',
                     label: 'Motivos de ajuste',
                     functionName: 'createAdjustmentReason(' + context.newRecord.id + ')'
                  });
                  break;
               }
               case 'Pendiente aprobación': {
                  context.form.addButton({
                     id: 'custpage_approve',
                     label: 'Aprobar',
                     functionName: 'approve(' + context.newRecord.id + ')'
                  });
                  context.form.addButton({
                     id: 'custpage_reject',
                     label: 'Rechazar',
                     functionName: 'reject(' + context.newRecord.id + ')'
                  });
                  break;
               }
               case 'Aprobada': {

                  context.form.addButton({
                     id: 'custpage_acta',
                     label: 'Acta',
                     functionName: 'makeActa(' + context.newRecord.id + ')'
                  });

                  if (rolesPermission.adminsOnly.includes(roleID)) {
                     context.form.addButton({
                        id: 'custpage_make_analysis',
                        label: 'Re-asignar Empleado',
                        functionName: 'makeSignatureInCharge(' + context.newRecord.id + ')'
                     });
                  }

                  if (rolesPermission.adminsOnly.includes(roleID)) {
                     context.form.addButton({
                        id: 'custpage_make_analysis',
                        label: 'Invalidar Aprobación',
                        functionName: 'makePendingApproval(' + context.newRecord.id + ')'
                     });
                     break;
                  }
               }
            }
            break;
         }
      }

      if (context.newRecord.getValue('custrecord_control_inventory_status') !== "Cargando Articulos" &&
         'custrecord_control_inventory_status' !== "Rollback Lecturas") {

         context.form.addButton({
            id: 'custpage_global_file',
            label: 'Concentrado de lecturas',
            functionName: 'createGlobalFile(' + context.newRecord.id + ')'
         });
         context.form.addButton({
            id: 'custpage_show_concentrates',
            label: 'PDF Concentrados',
            functionName: 'showConcentrates(' + context.newRecord.id + ')'
         });
         context.form.addButton({
            id: 'custpage_to_print',
            label: '⌨',
            functionName: 'print_order(' + context.newRecord.id + ')'
         });
      }

   } //end beforeLoad

   return entry_point;
   /**
    * @param {Object} notification
    * @param {Object} injected_field
    * @returns {Void}
    * @description se recibe el id de la tarea que se esta ejecutando para mostrar el mensaje correspondiente
    */
   function taskNotificacion(notification, field) {
      field.defaultValue = `
         <script>
            require(['N/ui/message', 'N/currentRecord'], function(message, currentRecord){
               message.create({
                  title: '${notification.title}',
                  message: '${notification.message}',
                  type: ${notification.type}
               }).show();
            });
         </script>`;
   }
});
