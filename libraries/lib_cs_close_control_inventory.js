/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_close_control_inventory.js
 * @description Cierra una orden de levantamiento como aprobada o rechazada 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NAmdConfig /SuiteScripts/controlinventory/libraries/requireConfig.json
 */
define(['N/url', 'N/currentRecord', 'N/ui/message', 'N/search', 'N/record', 'N/https', 'N/ui/dialog', 'N/url', '/SuiteScripts/libraries/Swal.min.js'], function (url, currentRecord, message, search, record, https, dialog, url, Swal) {


    var urlGif = "https://5256282.app.netsuite.com/core/media/media.nl?id=1008026&c=5256282&h=NbdUYfwz7-SVBQ02zpdmeByWUN0gxQZmnWod5h_MmWmK4EPV";

    var urlGiftDelete = "https://5256282.app.netsuite.com/core/media/media.nl?id=1007925&c=5256282&h=9Ji9UZ7-83kIkbk5hjPdX9oQnTgjMNM-CQCsaW7ECJW7iHWR";
    let namesEmployers

    const entry_point = {
        pageInit: function (context) {},
        approve: function (context) {},
        reject: function () {},
        createGlobalFile: function (context) {},
        toAnalizeAgain: function (context) {},
        makeReadOpen: function (order) {},
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
    entry_point.toAnalizeAgain = function (orderID) {

        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: orderID,
            values: {
                custrecord_control_inventory_status: 'Lecturas cerradas'
            }
        })

        window.location.href = url.resolveRecord({
            recordType: 'customrecord_order_control_inventory',
            recordId: orderID,
        })
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
            title: '¿Desea cambiar el estado a "Sin lecturas"?',
            showCancelButton: true,
            confirmButtonText: 'Cambiar',
        }).then((result) => {

            if (result.isConfirmed) {

                Swal.fire({
                    title: 'Preparando Rollback...',
                    imageUrl: urlGif,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,

                });

                const _resolve = url.resolveScript({
                    scriptId: 'customscript_cha_sl_reset_inventory',
                    deploymentId: 'customdeploy1',
                    params: {
                        orderID: order
                    }
                });

                https.get.promise({
                    url: _resolve
                }).then(function (response) {

                    var data = JSON.parse(response.body);

                    if (data.done) {
                        window.location.href = url.resolveRecord({
                            recordType: 'customrecord_order_control_inventory',
                            recordId: order,
                        })
                    } else {
                        Swal.fire(
                            '¡Ocurrio un error!',
                            'error'
                          )
                    }
                })
            }
        })
    }
    entry_point.makeAnalysisOpen = function (order) {
        console.log('FUNCION REABRIR LECTURAS');

        Swal.fire({
            title: '¿Desea cambiar el estado a "Lecturas Cerradas"?',
            showCancelButton: true,
            confirmButtonText: 'Cambiar',
        }).then((result) => {

            if (result.isConfirmed) {
                record.submitFields({
                    type: 'customrecord_order_control_inventory',
                    id: order,
                    values: {
                        'custrecord_control_inventory_status': 'Lecturas cerradas'
                    }
                });

                window.location.replace(`custrecordentrylist.nl?rectype=1490&id=${order}`);
            }
        })
    }
    entry_point.makePendingApproval = function (order) {

        Swal.fire({
            title: '¿Desea cambiar el estado a "Análisis finalizado"?',
            showCancelButton: true,
            confirmButtonText: 'Cambiar',
        }).then((result) => {

            if (result.isConfirmed) {
                order = record.load({
                    type: "customrecord_order_control_inventory",
                    id: order,
                    isDynamic: true
                })

                order.setValue({
                    fieldId: 'custrecord_control_inventory_status',
                    value: 'Análisis finalizado'
                })
                order.save()

                window.location.replace(`custrecordentrylist.nl?rectype=1490&id=${order}`);
            }
        })
    }
    entry_point.makeSignatureInCharge = function (order) {
        let timerInterval
        Swal.fire({
            title: '¡Consultando Datos!',
            html: 'Cargando datos de empleados... <b></b>.',
            timer: 2000,
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading()
                const b = Swal.getHtmlContainer().querySelector('b')
                timerInterval = setInterval(() => {
                    b.textContent = Swal.getTimerLeft()
                }, 100)
            },
            willClose: () => {
                namesEmployers = getNamesEmployers()
                clearInterval(timerInterval)
            }
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
                openSearchEmployer(order)
            }
        })
    }
    entry_point.makeActa = function (order) {
        console.log('order', order);

        let order_record = record.load({
            type: "customrecord_order_control_inventory",
            id: order,
            isDynamic: true
        });

        console.log(order_record.toJSON())

        let id_in_charge = order_record.getValue({
            fieldId: 'custrecord_control_inventory_in_charge'
        })

        console.log(id_in_charge)

        if (Number(id_in_charge) > 0) {
            openSuieletActa(order)
        } else {
            entry_point.makeSignatureInCharge(order)
        }
    }

    function openSuieletActa(order) {
        const url_suitelet = url.resolveScript({
            scriptId: 'customscript_cha_sl_printacta',
            deploymentId: 'customdeploy_cha_sl_printacta',
        });

        window.open(url_suitelet + '&order=' + order);
    }

    function openSearchEmployer(order) {
        Swal.fire({
            title: 'Buscar Empleado',
            input: 'text',
            showCancelButton: true,
            confirmButtonText: 'Buscar...',
            inputValidator: (value) => {
                if (!value) {
                    return '¡Escribe algo!'
                }
            }
        }).then((result) => {

            if (result.isConfirmed) {

                var newArray = Object.values(namesEmployers)

                var current = newArray.filter(name => name.toLowerCase().includes(result.value.toLowerCase()))

                let reducedSearch = {}

                current.forEach(function (name) {
                    let currentKey = Object.keys(namesEmployers).find(key => namesEmployers[key] === name)
                    reducedSearch[currentKey] = namesEmployers[currentKey]
                })

                Swal.fire({
                    title: 'Selecciona un empleado, Asignado: ',
                    input: 'select',
                    inputOptions: reducedSearch,
                    inputPlaceholder: 'Empleados...',
                    showCancelButton: true,
                    showDenyButton: true,
                    denyButtonText: 'Buscar',
                    inputValidator: function (value) {
                        return new Promise(function (resolve) {
                            if (value !== '') {
                                resolve();
                            } else {
                                resolve('Necesitas seleccionar un empleado');
                            }
                        });
                    }
                }).then(function (result) {

                    if (result.isConfirmed) {

                        let order_record = record.load({
                            type: "customrecord_order_control_inventory",
                            id: order,
                            isDynamic: true
                        });

                        order_record.setValue({
                            fieldId: 'custrecord_control_inventory_in_charge',
                            value: result.value
                        });

                        new Swal({
                            title: "¡Firmas Actualizadas!",
                            text: "Las firmas han sido cambiadas...",
                            icon: "success",
                            timer: 3000
                        });

                        order_record.save({
                            ignoreMandatoryFields: true
                        });

                        openSuieletActa(order)

                    } else if (result.isDenied) {
                        openSearchEmployer()
                    }
                });
            }
        })
    }

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
                Swal.fire({
                    title: `Eliminando Registros, Pendientes: ${data.missing}`,
                    imageUrl: urlGiftDelete,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,

                });
                callDeleteSL(orderID);
            } else {
                window.location.replace("custrecordentrylist.nl?rectype=1490");
            }

        });

    }

    function getNamesEmployers() {

        var name_roles = search.create({
            type: "employee",
            columns: [
                'entityid',
                'internalid'
            ]
        });

        names_options = {};

        name_roles.run().each(function (employee) {

            let theKey = employee.getValue({
                name: "internalid"
            });

            names_options[theKey] = employee.getValue({
                name: "entityid"
            });
            return true;
        });

        return names_options;
    }

    return entry_point;
});