/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_analysis.js
 * @description Eventos de usuario para el formulario Orden de levantamiento
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NAmdConfig /SuiteScripts/controlinventory/libraries/requireConfig.json
 */
define(['N/record', 'N/search', 'N/currentRecord', 'N/url', 'N/ui/dialog', 'N/log', 'swal'], function (record, search, currentRecord, url, dialog, log, Swal) {

  var urlGif = "https://5256282.app.netsuite.com/core/media/media.nl?id=1008026&c=5256282&h=NbdUYfwz7-SVBQ02zpdmeByWUN0gxQZmnWod5h_MmWmK4EPV";

  const entry_point = {
    pageInit: (context) => {},
    entry_point: (context) => {},
    updateSublistItem: (context) => {},
    backToOrder: (context) => {},
    saveRecord: (context) => {},
    fieldChanged: (context) => {},
    markall: (context) => {}
  }

  entry_point.pageInit = (context) => {
    /*
    const orderId = Number(context.currentRecord.getValue('custpage_folio'));
    const vendor_filter_field = context.currentRecord.getField({
      fieldId: 'custpage_vendor_filter'
    });
    //se insertan las opciones al campo de filtro de proveedor
    
    getVendorFromOrder(orderId).map((el) => vendor_filter_field.insertSelectOption({
      value: el.id,
      text: el.name
    }));
    
    vendor_filter_field.removeSelectOption({
      value: '',
    });
    vendor_filter_field.isDisabled = false; 
    */
    //se habilita el campo de filtro de modelo
    context.currentRecord.getField({
      fieldId: 'custpage_model_filter'
    }).isDisabled = false;

    context.currentRecord.getField({
      fieldId: 'custpage_vendor_filter'
    }).isDisabled = false;
  }
  entry_point.print_order = (context) => {

    const url_suitelet = url.resolveScript({
      scriptId: 'customscript_cha_sl_printanalysis',
      deploymentId: 'customdeploy_cha_sl_printanalysis',
    });

    window.open(url_suitelet + '&order=' + context);
  }
  entry_point.order_signatures = (context) => {

    Swal.fire({
      title: 'Cargando información',
      imageUrl: urlGif,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,

    });

    setTimeout(function () {
      let current_names = getNamesSignatures(context);
      let order = record.load({
        type: "customrecord_order_control_inventory",
        id: context,
        isDynamic: true
      });

      Swal.fire({
        title: 'Selecciona un jefe de piso, Asignado: ' + current_names['floor_manager'].name,
        input: 'select',
        inputOptions: getNamesByRoles('floor'),
        inputPlaceholder: 'Usuarios...',
        showCancelButton: true,
        inputValidator: function (value) {
          return new Promise(function (resolve) {
            if (value !== '') {
              resolve();
            } else {
              resolve('Necesitas seleccionar un usuario');
            }
          });
        }
      }).then(function (result) {

        if (result.value) {
          order.setValue({
            fieldId: 'custrecord_control_inventory_floor_manag',
            value: result.value
          });
        }

        Swal.fire({
          title: 'Selecciona un gerente de tienda, Asignado: ' + current_names['store_manager'].name,
          input: 'select',
          inputOptions: getNamesByRoles('store'),
          inputPlaceholder: 'Usuarios...',
          showCancelButton: true,
          inputValidator: function (value) {
            return new Promise(function (resolve) {
              if (value !== '') {
                resolve();
              } else {
                resolve('Necesitas seleccionar un usuario');
              }
            });
          }
        }).then(function (result) {

          if (result.isConfirmed) {
            order.setValue({
              fieldId: 'custrecord_control_inventory_store_manag',
              value: result.value
            });
          }

          Swal.fire({
            title: 'Selecciona un encargado de piso, Asignado: ' + current_names['in_charge'].name,
            input: 'select',
            inputOptions: getNamesByRoles('in_charge'),
            inputPlaceholder: 'Usuarios...',
            showCancelButton: true,
            inputValidator: function (value) {
              return new Promise(function (resolve) {
                if (value !== '') {
                  resolve();
                } else {
                  resolve('Necesitas seleccionar un usuario');
                }
              });
            }
          }).then(function (result) {

            if(result.isConfirmed){
              order.setValue({
                fieldId: 'custrecord_control_inventory_in_charge',
                value: result.value
              });
            }

            Swal.fire({
              title: 'Selecciona un auditor, Asignado: ' + current_names['auditor'].name,
              input: 'select',
              inputOptions: getNamesByRoles('audit'),
              inputPlaceholder: 'Usuarios...',
              showCancelButton: true,
              inputValidator: function (value) {
                return new Promise(function (resolve) {
                  if (value !== '') {
                    resolve();
                  } else {
                    resolve('Necesitas seleccionar un usuario');
                  }
                });
              }
            }).then(function (result) {
  
              if (result.isConfirmed) {
                order.setValue({
                  fieldId: 'custrecord_control_inventory_auditor',
                  value: result.value
                });
              }
              
  
              new Swal({
                title: "¡Firmas Actualizadas!",
                text: "Las firmas han sido cambiadas...",
                icon: "success",
                timer: 3000
              });
  
              order.save({
                ignoreMandatoryFields: true
              });
            });
          });
        });

      });
      window.open(_resolve);
    }, 500)

  }
  entry_point.updateSublistItem = (context) => {
    const _currentRecord = currentRecord.get();
    if (_currentRecord.getValue({
        fieldId: 'custpage_vendor_filter'
      }).filter(el => el === '').length && _currentRecord.getValue({
        fieldId: 'custpage_model_filter'
      }).filter(el => el === '').length) {
      dialog.alert({
        title: 'Error!',
        message: 'Selecciona un proveedor o un modelo para filtrar articulos'
      });
      return false;
    }

    //se cambian los valores de los filtros para contruir la sublista de articulos
    const url_suitelet = url.resolveScript({
      scriptId: 'customscript_cha_s_control_inventary',
      deploymentId: 'customdeploy_cha_s_control_inventary',
    });
    const data = {
      vendor: _currentRecord.getValue({fieldId: 'custpage_vendor_filter'}),
      model: _currentRecord.getValue({fieldId: 'custpage_model_filter'}),
      description: _currentRecord.getValue({fieldId: 'custpage_filter_description'}).toUpperCase()
    };
    const encodedData = btoa(JSON.stringify(data));
    console.log('encodeddata',encodedData);
    window.location.href = url.format({
      domain: url_suitelet,
      params: {
        action: 'createAnalysis',
        order: Number(_currentRecord.getValue({
          fieldId: 'custpage_folio'
        })),
        data: encodedData
      }
    });
  }
  entry_point.fieldChanged = (context) => {
    const _currentRecord = context.currentRecord;
    //si se realiza un cambio en los valores de observación y analisis en la sublita items, se actualiza su valor en el regitro
    if (context.sublistId === 'items') {
      let observacion = _currentRecord.getSublistValue({sublistId: 'items',fieldId: 'observation',line: context.line});
      console.log('new value observation', observacion);
      record.submitFields({
        type: 'customrecord_control_inventory_body',
        id: Number(_currentRecord.getSublistValue({
          sublistId: 'items',
          fieldId: 'itemid',
          line: context.line
        })),
        values: {
          custrecord_ci_body_observation: parseInt(observacion) /*_currentRecord.getSublistValue({
            sublistId: 'items',
            fieldId: 'observation',
            line: context.line
          })*/,
          custrecord_ci_body_analysis: _currentRecord.getSublistValue({
            sublistId: 'items',
            fieldId: 'analysis',
            line: context.line
          }),
          custrecord_ci_body_decrease: _currentRecord.getSublistValue({
            sublistId: 'items',
            fieldId: 'decrease',
            line: context.line
          }),
        }
      })
    }
    
    if (context.fieldId === 'custpage_model_filter_all') {
      let isChecked = _currentRecord.getValue({ fieldId: 'custpage_model_filter_all' });
      console.log('ischecked',isChecked);

      if (isChecked) {
        selectAllModels();  // Si el check se marca se marcan todas las opciones de modelo 
      } else {
        deselectAllModels();  // si el check se desmarca se desmarcan todas las opciones de modelo
      }
    } 

    
    if (context.fieldId === 'custpage_vendor_filter_all') {
      let isCheck = _currentRecord.getValue({ fieldId: 'custpage_vendor_filter_all' });
      console.log('isCheck',isCheck);
    
      if (isCheck) {
        selectAllVendors(); // Si el check se marca se marcan todas las opciones de modelo
      } else {
        deselectAllVendors(); // si el check se desmarca se desmarcan todas las opciones de modelo
      }
    }

  }
  entry_point.backToOrder = () => {
    //cuando se de clic al botón "volver a la orden", se envia de nuevo al registro de la orden de inventario con el id correspondiente
    const _currentRecord = currentRecord.get();
    const urlToRecord = url.resolveRecord({
      recordType: 'customrecord_order_control_inventory',
      recordId: _currentRecord.getValue('custpage_folio'),
    });
    window.location.href = urlToRecord;
  }
  entry_point.saveRecord = (context) => {
    //para poder cerrar el análisis todos los articulos dentro de la orden con diferencia deben tener observación
    const pendingToAnalizeItem = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'anyof', context.currentRecord.getValue('custpage_folio')],
        'AND',
        ['custrecord_ci_body_observation', 'is', '@NONE@'],
        'AND',
        ['custrecord_ci_body_difference', 'notequalto', 0],
        "AND", 
        ["custrecord_ci_body_displayname","isnotempty",""]
      ]
    });
    if (pendingToAnalizeItem.runPaged().count > 0) {
      dialog.alert({
        title: 'Error!',
        message: 'El análisis aún no puede finalizar porque hay articulos con diferencia que no aún no tienen observación'
      });
      return false;
    }
    return true;
  }
  entry_point.markall = () => {
    const _currentRecord = currentRecord.get();
    const lines = _currentRecord.getLineCount({
      sublistId: 'items'
    });
    //si se encuentra una linea entonces es porque hay al menos un articulo marcado para merma, entonces hay que
    //ejecutar la opción para desmarcar
    const markUnmark = _currentRecord.findSublistLineWithValue({
      sublistId: 'items',
      fieldId: 'decrease',
      value: 'T'
    }) > -1 ? false : true;
    console.log(markUnmark);
    for (let i = 0; i < lines; i++) {
      _currentRecord.selectLine({
        sublistId: 'items',
        line: i
      })
      _currentRecord.setCurrentSublistValue({
        sublistId: 'items',
        fieldId: 'decrease',
        value: markUnmark
      });
      _currentRecord.commitLine({
        sublistId: 'items'
      })
    }
  }
  return entry_point;
  
  /**
   * @param {Number} orderId
   * @returns {Array} 
   * @description Se obtienen todos los proveedores según los articulos en la orden de levantamiento
   */
  /*
  function getVendorFromOrder(orderId) {
    let vendor = [];
    const vendorSearch = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        'custrecord_ci_body_parent', 'anyof', orderId
      ],
      columns: [
        vendorColumn = search.createColumn({
          name: 'custrecord_ci_body_vendor',
          summary: search.Summary.GROUP
        })
      ]
    });
    const pageData = vendorSearch.runPaged({
      pageSize: 1000
    });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const customrecord_control_inventory_bodySearchPage = pageData.fetch({
        index: i
      });
      customrecord_control_inventory_bodySearchPage.data.forEach(function (result) {
        let number = parseInt(result.getText(vendorColumn));
        vendor.push({
          id: Number(result.getValue(vendorColumn)),
          name: result.getText(vendorColumn),
          number: isNaN(number) ? 0 : number
        });
      });
    }
    _number = vendor.map(el => el.number).sort(function (a, b) {
      return a - b
    })
    _vendor = _number.map(el => {
      let _index = vendor.map(el => el.number).indexOf(el);
      return vendor[_index];
    });
    return _vendor;
  } 
  */

  function getNamesSignatures(orderID) {
    var signatures_names_in_order = search.create({
      type: "customrecord_order_control_inventory",
      filters: [
        'id', 'equalto', orderID
      ],
      columns: [
        'custrecord_control_inventory_floor_manag',
        'custrecord_control_inventory_store_manag',
        'custrecord_control_inventory_auditor',
        'custrecord_control_inventory_in_charge'
      ]
    });

    names_options = {};

    signatures_names_in_order.run().each(function (name) {

      names_options["floor_manager"] = {
        internalID: name.getValue({
          name: "custrecord_control_inventory_floor_manag"
        }),
        name: name.getText({
          name: "custrecord_control_inventory_floor_manag"
        })
      }

      names_options["in_charge"] = {
        internalID: name.getValue({
          name: 'custrecord_control_inventory_in_charge'
        }),
        name: name.getText({
          name: 'custrecord_control_inventory_in_charge'
        })
      }

      names_options["store_manager"] = {
        internalID: name.getValue({
          name: "custrecord_control_inventory_store_manag"
        }),
        name: name.getText({
          name: "custrecord_control_inventory_store_manag"
        })
      }

      names_options["auditor"] = {
        internalID: name.getValue({
          name: "custrecord_control_inventory_auditor"
        }),
        name: name.getText({
          name: "custrecord_control_inventory_auditor"
        })
      }

      return true;
    });

    console.log(names_options);
    return names_options;
  }

  function getNamesByRoles(filter) {

    var filterRole = {
      floor: ["role", "anyof", "1138", "1088", "1089", "1075", "1098"],
      store: ["role", "anyof", "1092", "1137", "1084", "1093"],
      audit: ["role", "anyof", "1015"],
      in_charge:["role", "anyof", "1080"]
    }
    var name_roles = search.create({
      type: "employee",
      filters: [
        filterRole[filter]
      ],
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
  // Marca todos los valores del multiselect de MODELO en el analisis de la orden de levantamiento
  function selectAllModels() {
    let _currentRecord = currentRecord.get();
    let multiselectModels = _currentRecord.getField({ fieldId: 'custpage_model_filter' });
    let allOptions = multiselectModels.getSelectOptions();
    console.log('allOptionsAllModels',allOptions);
    let valuesToSelect = [];
    
    // Se obtienen todos los modelos disponibles
    allOptions.forEach(function(option) {
      valuesToSelect.push(option.value);  // Agregar cada valor al array
    });
    console.log('valuesToSelect All Models',valuesToSelect);
    // Se marcan todos los modelos disponibles 
    _currentRecord.setValue({
      fieldId: 'custpage_model_filter',
      value: valuesToSelect
    });
  }
  // Desmarca todos los valores del multiselect de MODELO en el analisis de la orden de levantamiento
  function deselectAllModels() {
    let _currentRecord = currentRecord.get();
    
    // Establecer un array vacío para desmarcar todas las opciones
    _currentRecord.setValue({
      fieldId: 'custpage_model_filter',
      value: [] 
    });
  }
  // Marca todos los valores del multiselect de PROVEEDOR en el analisis de la orden de levantamiento
  
  function selectAllVendors() {
    let _currentRecord = currentRecord.get();
    let multiselectVendors = _currentRecord.getField({ fieldId: 'custpage_vendor_filter' });
    let allOptions = multiselectVendors.getSelectOptions();
    console.log('allOptionsAllVendors',allOptions);
    console.log('allOptionsAllVendors',allOptions.length);
    let valuesToSelect = [];
    
    // Se obtienen todos los modelos disponibles
    allOptions.forEach(function(option) {
      if (option.value && option.value !== '') {  // Verificar que el valor no esté vacío o nulo
        valuesToSelect.push(option.value);  // Agregar cada valor al array
      }
    });
    console.log('valuesToSelect All Vendors',valuesToSelect);
    // Se marcan todos los modelos disponibles 
    _currentRecord.setValue({
      fieldId: 'custpage_vendor_filter',
      value: valuesToSelect
    });
  }


  function deselectAllVendors() {
    let _currentRecord = currentRecord.get();
    
    // Establecer un array vacío para desmarcar todas las opciones
    _currentRecord.setValue({
      fieldId: 'custpage_vendor_filter',
      value: []  
    });
  }

});