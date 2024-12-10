/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_s_control_inventary.js
 * @description Suitelet para construir el formulario para el levatamiento de ordenes de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/redirect', 'N/record', 'N/task', './libraries/iniciar_reporte/controlinventory', './libraries/lib_items', 'N/log'], function (redirect, record, task, iniciarReporte, item, log) {

    const entry_point = {
        onRequest: (context) => {}
    }

    entry_point.onRequest = (context) => {
        const {
            parameters,
            method
        } = context.request;

        switch (method) {
            case 'GET': {
                switch (parameters.action) {
                    case 'previousOrder': {
                        form = iniciarReporte.create_empty({
                            order: parameters.order
                        });
                        break; //end case created
                    }
                    case 'uploadFiles': {
                        form = iniciarReporte.upload_files({
                            order: parameters.order
                        });
                        break;
                    } //end uploadFiles
                    case 'createAnalysis': {
                        form = iniciarReporte.analysis({
                            order: parameters.order,
                            data: parameters.data || ''
                        });
                        break;
                    } //end createAnalysis
                    case 'adjustmentReason': {
                        form = iniciarReporte.adjustment({
                            order: parameters.order,
                            data: parameters.data || ''
                        });
                        break;
                    } //end createAnalysis
                    default: {
                        form = iniciarReporte.create_empty({
                            lastOrderCreated: 0
                        });
                        break; //end default 
                    }
                }
                //se escribe el formulario en el suitelet, según la versión que se necesite
                context.response.writePage(form);
                break; //end case GET
            }
            case 'POST': {
                log.debug('context.request.parameters',context.request.parameters); 
                log.debug('context.request.parameters.action', context.request.parameters.action); 
                log.debug('context.request.parameters.data', context.request.parameters.data);
                log.debug('context.request.parameters.order', context.request.parameters.order);
                
                switch (parameters.submitter) {
                    case 'Crear orden de levantamiento': {

                        try {
                            const order = createOrder({
                                subsidiary: parameters.custpage_subsidiary,
                                location: parameters.custpage_location,
                                department: parameters.custpage_department,
                                class: parameters.custpage_class,
                                vendor: parameters.custpage_vendor,
                                memo: parameters.custpage_memo,
                                status: 'Cargando Articulos',
                            });

                            redirect.toSuitelet({
                                scriptId: 'customscript_cha_s_control_inventary',
                                deploymentId: 'customdeploy_cha_s_control_inventary',
                                parameters: {
                                    'action': 'previousOrder',
                                    'order': order
                                }
                            });
                        } catch (e) {
                            log.debug("EXCEPTION ON CREATE", e)
                        }
                        break;
                    }
                    case 'Cerrar lecturas': {
                        //se inicia la tarea, se actualiza el campo 
                        const closingFiles = task.create({
                            taskType: task.TaskType.MAP_REDUCE
                        });
                        closingFiles.scriptId = 'customscript_cha_mr_closefiles';
                        closingFiles.params = {
                            custscript_order: parameters.custpage_folio
                        };
                        record.submitFields({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                            values: {
                                custrecord_cerrar_lecturas_taskid: closingFiles.submit(),
                                custrecord_control_inventory_status: 'Cerrando lecturas'
                            }
                        });
                        //se redirecciona al registro personalizado de orden de levantamiento
                        redirect.toRecord({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                        });
                        break;
                    }
                    case 'Finalizar análisis': {
                        record.submitFields({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                            values: {
                                custrecord_control_inventory_status: 'Análisis finalizado'
                            }
                        });
                        //se redirecciona al registro personalizado de orden de levantamiento
                        redirect.toRecord({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                        });
                        break;
                    }
                    case 'Finalizar ajuste': {
                        record.submitFields({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                            values: {
                                custrecord_control_inventory_status: 'Pendiente aprobación'
                            }
                        });
                        //se redirecciona al registro personalizado de orden de levantamiento
                        redirect.toRecord({
                            type: 'customrecord_order_control_inventory',
                            id: parameters.custpage_folio,
                        });
                        break;
                    }
                }

                switch (parameters.action) {
                    
                    case 'createAnalysisPOST': {
                        form = iniciarReporte.analysis({
                            order: parameters.order,
                            data: parameters.data || ''
                        });
                        //se escribe el formulario en el suitelet, según la versión que se necesite
                        context.response.writePage(form);
                        break;
                    } 
                }
                break;
            }
        }
    }

    return entry_point;
    /**
     * @param {Object} orderData 
     * @returns {Number}
     * @description Se crea el registro de orden de levantamiento, si existe algun error o no hay articulos según los filtros puestos
     * se retornará -1 de lo contrario se devuelve el internalid del registro creado 
     */
    function createOrder(orderData) {

        const itemInOrder = item.get_count_items_by_filters(orderData);

        if (itemInOrder == 0) return -1;

        const order = record.create({
            type: 'customrecord_order_control_inventory',
            isDynamic: true
        });

        [{
                fieldId: 'custrecord_control_inventory_date',
                value: new Date()
            },
            {
                fieldId: 'custrecord_control_inventory_subsidiary',
                value: orderData.subsidiary
            },
            {
                fieldId: 'custrecord_control_inventory_location',
                value: orderData.location
            },
            {
                fieldId: 'custrecord_control_inventory_department',
                value: orderData.department
            },
            {
                fieldId: 'custrecord_control_inventory_class',
                value: orderData.class
            },
            {
                fieldId: 'custrecord_control_inventory_vendor',
                value: orderData.vendor
            },
            {
                fieldId: 'custrecord_control_inventory_memo',
                value: orderData.memo
            },
            {
                fieldId: 'custrecord_control_inventory_status',
                value: orderData.status
            }
        ].map(el => {
            order.setValue(el)
        });

        try {

            let orderID = order.save();
            log.debug('orderID', orderID);

            const loadItems = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });

            log.error('Que tengo2',typeof(orderData.vendor));
            log.error('Que tengo?', orderData.vendor);
            var resultado = orderData.vendor.replace(/[^\d.-.]/gi, ',');
            //let resultado = result.split(',');
            log.audit('resultado',resultado);
            
            loadItems.scriptId = 'customscript_cha_mr_add_items_to_order';
            loadItems.params = {
                custscript_order_id: orderID,
                custscript_subsidiary_id: orderData.subsidiary,
                custscript_location_id: orderData.location,
                custscript_department_id: orderData.department,
                custscript_vendor_id: resultado,
                custscript_class_id: orderData.class,
                custscript_class_memo: orderData.memo
            };

            var taskID = loadItems.submit();
            log.debug('custrecord_add_items_taskid', taskID);
            log.debug('custrecord_control_inventory_folio', 'OLI' + (orderID).toString().padStart(7, 0));

            record.submitFields({
                type: "customrecord_order_control_inventory",
                id: orderID,
                values: {
                    custrecord_add_items_taskid: taskID,
                    custrecord_control_inventory_folio:  'OLI' + (orderID).toString().padStart(7, 0)
                }
            });

            return orderID;

        } catch (error) {
            log.error('Error to create order', error);
            return -1;
        }
    }

})