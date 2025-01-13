/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_close_control_inventory.js
 * @description Cierra una orden de levantamiento como aprobada o rechazada 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NAmdConfig /SuiteScripts/controlinventory/libraries/requireConfig.json
 */
define(['N/url', 'N/currentRecord', 'N/ui/message', 'N/search', 'N/record', 'N/https', 'N/ui/dialog', 'N/url', 'swal'], function (url, currentRecord, message, search, record, https, dialog, url, Swal) {


        var urlGif = "https://5256282.app.netsuite.com/core/media/media.nl?id=1008026&c=5256282&h=NbdUYfwz7-SVBQ02zpdmeByWUN0gxQZmnWod5h_MmWmK4EPV";

        var urlGiftDelete = "https://5256282.app.netsuite.com/core/media/media.nl?id=1007925&c=5256282&h=9Ji9UZ7-83kIkbk5hjPdX9oQnTgjMNM-CQCsaW7ECJW7iHWR";

        const entry_point = {
            pageInit: function (context) {},
            approve: function (context) {},
            reject: function () {},
            createGlobalFile: function (context) {},
            toAnalizeAgain: function (context) {},
            makeReabrirAnalisis: function (context) {},
            makeReadOpen: function(order){},
            print_order: null
        }

        entry_point.deleteOrder = function (context) {

            Swal.fire({
                title: 'Eliminando Registros',
                imageUrl: urlGiftDelete,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,

            });

            try {
                callDeleteSL(context);
            } catch (e) {
                Swal.fire({
                    icon: 'error',
                    title: '¡Ocurrio un error en el sistema!',
                    text: e,
                })
            }
        }
        entry_point.print_order = function (context) {
            const url_suitelet = url.resolveScript({
                scriptId: 'customscript_sl_printadjustment',
                deploymentId: 'customdeploy_sl_printadjustment_1',
            });
            window.open(url_suitelet + '&order=' + context);
        }        
        entry_point.uploadFiles = function (order) {
            const url_suitelet = url.resolveScript({
                scriptId: 'customscript_cha_s_control_inventary',
                deploymentId: 'customdeploy_cha_s_control_inventary',
            });
            window.open(url_suitelet + '&action=uploadFiles' + '&order=' + order, '_self');
        }
        entry_point.createAnalysis = function (order) {
            const url_suitelet = url.resolveScript({
                scriptId: 'customscript_cha_s_control_inventary',
                deploymentId: 'customdeploy_cha_s_control_inventary',
            });
            window.open(url_suitelet + '&action=createAnalysis' + '&order=' + order, '_self');
        }
        entry_point.createAdjustmentReason = function (order) {
            const url_suitelet = url.resolveScript({
                scriptId: 'customscript_cha_s_control_inventary',
                deploymentId: 'customdeploy_cha_s_control_inventary',
            });
            window.open(url_suitelet + '&action=adjustmentReason' + '&order=' + order, '_self');
        }
        entry_point.createGlobalFile = function (context) {
            const status_order = search.lookupFields({
                type: 'customrecord_order_control_inventory',
                id: context,
                columns: ['custrecord_control_inventory_status']
            });
            //si el estado de la orden es sin lecturas el archivo concentrado no se podrá creaer
            if (status_order.custrecord_control_inventory_status === 'Sin lecturas') {
                dialog.create({
                    title: 'Error',
                    message: 'No se puede generar el concentrado si no existen lecturas cargadas'
                });
                return false;
            }
            const response = https.post({
                url: url.resolveScript({
                    scriptId: 'customscript_cha_rl_ci_global_file',
                    deploymentId: 'customdeploy1'
                }),
                headers: {
                    'content-type': ' application/json'
                },
                body: {
                    order: context,
                }
            });
            const response_body = JSON.parse(response.body);
            if (response_body.code === 'error') {
                dialog.create({
                    title: 'Error!',
                    message: response_body.message
                });
            } else {
                window.location.href = url.resolveRecord({
                    recordType: 'customrecord_order_control_inventory',
                    recordId: context,
                });;
            }

        }
        entry_point.approve = function (order) {
            const response = https.post({
                url: url.resolveScript({
                    scriptId: 'customscript_rl_createadjustment',
                    deploymentId: 'customdeploy_rl_createadjustment_1'
                }),
                headers: {
                    'content-type': ' application/json'
                },
                body: {
                    order: order,
                }
            });
            const response_body = JSON.parse(response.body);
            if (response_body.code === 'error') {
                dialog.create({
                    title: 'Error!',
                    message: response_body.message
                });
            } else {
                window.location.href = url.resolveRecord({
                    recordType: 'customrecord_order_control_inventory',
                    recordId: order,
                });;
            }
        }
        entry_point.toAnalizeAgain = function (order) {
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: order,
                values: {
                    custrecord_control_inventory_status: 'Lecturas cerradas'
                }
            });
            window.location.href = url.resolveRecord({
                recordType: 'customrecord_order_control_inventory',
                recordId: order,
            });;
        }
        entry_point.reject = function (order) {
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: order,
                values: {
                    custrecord_control_inventory_status: 'Rechazada'
                }
            });
            window.location.href = url.resolveRecord({
                recordType: 'customrecord_order_control_inventory',
                recordId: order,
            });;

        }
        entry_point.showConcentrates = function (order) {

            var files_options = {};

            var files_names = search.create({
                type: "customrecord_control_inventory_files",
                filters: [
                    'custrecord_control_inventory_order', 'anyof', order
                ],
                columns: [
                    'internalid',
                    'name'
                ]
            });

            files_names.run().each(function (file) {

                console.log(file.getValue({
                    name: "internalid"
                }));

                files_options[file.getValue({
                    name: "internalid"
                })] = file.getValue({
                    name: "name"
                });

                return true;
            });

            Swal.fire({
                title: 'Selecciona un archivo.',
                input: 'select',
                inputOptions: files_options,
                inputPlaceholder: 'Archivos...',
                showCancelButton: true,
                inputValidator: function (value) {
                    return new Promise(function (resolve, reject) {
                        if (value !== '') {
                            resolve();
                        } else {
                            resolve('Necesitas seleccionar un archivo');
                        }
                    });
                }
            }).then(function (result) {
                if (result.isConfirmed) {

                    const _resolve = url.resolveScript({
                        scriptId: 'customscript_cha_sl_convertcsvtopdf_cdi',
                        deploymentId: 'customdeploy_cha_sl_convertcsvtopdf_cdi',
                        params: {
                            lectura_id: result.value
                        }
                    });

                    window.open(_resolve);
                }
            });


        }
        entry_point.makeReadOpen = function (order) {

        
            Swal.fire({
                icon: 'success',
                title: '¡Ocurrio un error en el sistema!',
                text: order,
            })

            /*let order = record.load({
                type: "customrecord_order_control_inventory",
                id: context,
                isDynamic: true
            });

            order.setValue({
                fieldId: 'custrecord_control_inventory_status',
                value: result.value
              });

              order.save(); */


        }
        // Se agrega DACE - 27/12/2024
        entry_point.makeReabrirAnalisis = function (order) {
          const response = https.post({
            url: url.resolveScript({
              scriptId: 'customscriptcha_rl_reverseadjustment',
              deploymentId: 'customdeploy_rl_reverseadjustment_1'
            }),
            headers: {
              'content-type': ' application/json'
            },
            body: {
              order: order,
            }
          });
          const response_body = JSON.parse(response.body);
          if (response_body.code === 'error') {
            dialog.create({
              title: 'Error!',
              message: response_body.message
            });
          } else {
            window.location.href = url.resolveRecord({
              recordType: 'customrecord_order_control_inventory',
              recordId: order,
            });;
          }
        }
  // Finaliza cambio agregado DACE - 27/12/2024

        function callDeleteSL(orderID) {

            const _resolve = url.resolveScript({
                scriptId: 'customscript_cha_sl_delete_inventory',//'customscript2325',
                deploymentId: 'customdeploy1',
                params: {
                    orderID: orderID
                }
            });

            https.get.promise({
                url: _resolve
            }).then(function (response) {

                var data = JSON.parse(response.body);

                if (!data.all_delete) {
                    callDeleteSL(orderID);
                } else {
                    window.location.replace("custrecordentrylist.nl?rectype=1490");
                }

            });

        }

        return entry_point;
    });