/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_mr_createadjustment.js
 * @description Se crean las transacciones de ajuste de inventario
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/search', 'N/record', 'N/runtime', './libraries/lib_items'], function (search, record, runtime, items) {
  const entry_point = {
    getInputData: (context) => {},
    map: (context) => {},
    reduce: (context) => {},
    summarize: (context) => {}
  }

  let COSTO_VENTAS_TIENDA = 561

  entry_point.getInputData = (context) => {
    const script = runtime.getCurrentScript();
    const orderId = Number(script.getParameter({
      name: 'custscript_order_inventory'
    }));
    log.debug('INPUTDATA', `PROCESANDO LA  ORDEN: ${Number(script.getParameter({ name: 'custscript_order_inventory' }))}`);

    // articulos de la orden que tienen motivo de ajuste, y se descartan las observaciones,
    // Transferencia errónea, Dif. aclarada sin ajuste, Venta sobrepedido
    return search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'anyof', orderId],
        'AND',
        ['custrecord_ci_body_adjusment_reason', 'anyof', [1, 2, 3, 4, 5]], // se incluyen todos
        'AND',
        ['custrecord_ci_body_observation', 'anyof', [1, 2, 3, 5, 6, 8]] //se excluye 4	Dif. aclarada sin ajuste, 7	Transferencia errónea, 9. Venta sobrepedido
      ],
      columns: [
        'custrecord_ci_body_adjusment_reason', // motivo de ajuste
        'custrecord_ci_body_itemid', // id interno del articulo
        'custrecord_ci_body_difference', // Diferencia
        'custrecord_ci_body_decrease', // merma check (true, false)
        'custrecord_ci_body_base_price', // precio
        'custrecord_ci_body_average_cost', // costo promedio
        'custrecord_ci_body_price_amount', // importe precio
        'custrecord_ci_body_observation', // observacion
        'custrecord_ci_body_cost_amount', // importe costo
        'custrecord_ci_body_system_amount', // valor sistema
        'custrecord_ci_body_system_amount_cost', // valor sistema costo
        'custrecord_ci_body_in_store_amount', // valor fisico
        'custrecord_ci_body_in_store' // fisico
      ]
    });
  }
  entry_point.map = (context) => {
    const result = JSON.parse(context.value);
    const item_in_order = result.values;
    log.debug('item_in_order MAP', item_in_order);
    context.write({
      key: item_in_order.custrecord_ci_body_adjusment_reason.text,
      value: {
        adjusment_reason: item_in_order.custrecord_ci_body_adjusment_reason.text,
        itemid: item_in_order.custrecord_ci_body_itemid.value,
        observation: item_in_order.custrecord_ci_body_observation.text,
        difference: item_in_order.custrecord_ci_body_difference,
        in_store: item_in_order.custrecord_ci_body_in_store,
        decrease: item_in_order.custrecord_ci_body_decrease,
        base_price: item_in_order.custrecord_ci_body_base_price,
        average_cost: item_in_order.custrecord_ci_body_average_cost,
        price_amount: item_in_order.custrecord_ci_body_price_amount,
        cost_amount: item_in_order.custrecord_ci_body_cost_amount,
        system_amount: item_in_order.custrecord_ci_body_system_amount,
        system_amount_cost: item_in_order.custrecord_ci_body_system_amount_cost,
        in_store_amount: item_in_order.custrecord_ci_body_in_store_amount,
      },
    });
  } //end map
  
  entry_point.reduce = (context) => {

    try {

      const script = runtime.getCurrentScript();
      const orderId = Number(script.getParameter({
        name: 'custscript_order_inventory'
      }));
      const order = getOrderData(orderId); //datos de cabecera de orden de levantamiento
      const adjustment_reason = context.key; //tipo de motivo ajuste
      const itemsInOrder = context.values; //articulos por motivo de ajuste
      log.debug('itemsInOrder REDUCE', itemsInOrder);

      let adjustCostAmount = 0; //importe costo por articulo para calcular la cantidad a ajustar para merma por motivo de ajuste
      //const bins_by_location = get_bins_by_location(order.location);//se obtiene la lista completa de bins en la ubicación
      let itemErrorAdjustmentArray = [];

      //Para agregar todos los ajustes y no solo el ultimo
      let generatedAdjustments = []; // Lista para almacenar los idAjustes generados

      //se obtienen la relación bin - cantidad del articulo por ubicación segun  NetSuite
      const netsuiteInventoryDetail = get_inventory_detail(itemsInOrder.map(el => {
        const item = JSON.parse(el);
        return item.itemid;
      }), order.location);
      const inventorybalance = get_inventory_detail_balance(itemsInOrder.map(el => {
        const item = JSON.parse(el); //CUM 03Nov2021 Se obtiene disponible real
        return item.itemid;
      }), order.location);
      //se obtiene la realación bin - cantidad del articulo según las cargas de lecturas que se realizarón
      const inStoreInventoryDetail = get_in_store_inventory_detail(orderId, itemsInOrder.map(el => {
        const item = JSON.parse(el);
        return item.itemid;
      }));
      //se crean el ajuste de inventario por motivo de ajuste
      const inventoryAdjustment = record.create({
        type: 'inventoryadjustment',
        isDynamic: true,
      });
      inventoryAdjustment.setValue({
        fieldId: 'subsidiary',
        value: order.subsidiary
      });
      inventoryAdjustment.setValue({
        fieldId: 'department',
        value: order.department
      });
      inventoryAdjustment.setValue({
        fieldId: 'class',
        value: order.class
      });
      inventoryAdjustment.setValue({
        fieldId: 'account',
        value: COSTO_VENTAS_TIENDA
      }); //COSTO DE VENTAS TIENDA DEPARTAMENTAL : COSTO DE VENTAS TIENDAS DE ARTICULOS
      inventoryAdjustment.setText({
        fieldId: 'custbody_bex_motivo_ajuste',
        text: adjustment_reason
      });
      if (order.memo) inventoryAdjustment.setText({
        fieldId: 'memo',
        text: order.memo
      });
      inventoryAdjustment.setValue({
        fieldId: 'custbody_cha_order_id',
        value: orderId
      });
      
       //CUM 03Nov2021 se agrega memo por error al guardar solo si tiene información.
      //se recorren los articulos por motivo de ajuste para poder crear las líneas en el inventory adjustment
      //log.audit('CU 1 - itemsInOrder', itemsInOrder);
      log.debug('netsuiteInventoryDetail REDUCE', netsuiteInventoryDetail);
      log.debug('inventorybalance REDUCE',inventorybalance);
      log.debug('inStoreInventoryDetail REDUCE',inStoreInventoryDetail);

      itemsInOrder.map(el => {
        const item = JSON.parse(el);
        log.debug('item', item);

        log.debug({
          title: 'itemsInOrder.map', 
          details: 'itemid: ' + item.itemid + ', Fisico: ' + item.in_store + ', Diferencia: ' + item.difference
        });

        netsuiteInventoryDetail[item.itemid].map(el => {
          
          //se obtiene el indice en el arreglo inStoreInventoryDetail donde esta la información del bin que se está recorriedo  
          let binToAdjustIndex = (inStoreInventoryDetail.hasOwnProperty(item.itemid)) ? inStoreInventoryDetail[item.itemid].map(value => value.binnumber).indexOf(el.binnumber) : -1;
          
          // inStoreInventoryDetail[item.itemid][binToAdjustIndex].itemcount => cantidad que hay en lectura
          // el.itemcount => cantidad que hay en netsuite
          if (binToAdjustIndex > -1) {
            log.debug({
              title: 'netsuiteInventoryDetail.map INICIO', 
              details: 'binnumber: ' + el.binnumber + ', cant lectura: ' + inStoreInventoryDetail[item.itemid][binToAdjustIndex].itemcount + ', cant netsuite: ' + el.itemcount
            });
          }

          //la cantidad a ajustar debe ser (la cantidad que hay en la lectura - la cantidad que hay en netsuite), 
          //la única consideración es, si binToAdjustIndex es -1 significa que el articulo no aparace en ninguna lectura 
          //por tanto podemos asumir que no hay cantidad física de ese articulo y hay que quitar toda la existencia de netsuite 

          //log.debug("inStoreInventory: " + item.itemid, inStoreInventoryDetail)
          let toAdjustQuantity = ((binToAdjustIndex > -1) ? inStoreInventoryDetail[item.itemid][binToAdjustIndex].itemcount - el.itemcount : 0 - el.itemcount);

          //CUM 03Nov2021 Obtener la cantidad siponible par los casos en que se requiere remover la existencia y evitar errores
          let indexBalanceBin = (inventorybalance.hasOwnProperty(item.itemid)) ? inventorybalance[item.itemid].map(value => value.binnumber).indexOf(el.binnumber) : -1;
          let quantityInvBalance = (indexBalanceBin !== -1) ? inventorybalance[item.itemid][indexBalanceBin].itemcount : 0;

          let makeAdjustment = quantityInvBalance + toAdjustQuantity < 0 ? false : true;
          if (!makeAdjustment) itemErrorAdjustmentArray.push(item.itemid);
          log.debug({
            title: 'netsuiteInventoryDetail.map DESPUES', 
            details: 'binToAdjustIndex: ' + binToAdjustIndex + ', toAdjustQuantity: ' + toAdjustQuantity + ', indexBalanceBin: ' + indexBalanceBin + ', quantityInvBalance :' + quantityInvBalance + ', makeAdjustment: ' + makeAdjustment
          });

          //si no hay diferencia entre la cantidad en los bins, entonces no es necesario ajustar ese articulo en el bin
          //if (toAdjustQuantity !== 0 && makeAdjustment == true) {
          if (toAdjustQuantity !== 0) {
            inventoryAdjustment.selectNewLine({
              sublistId: 'inventory'
            });
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'item',
              value: item.itemid
            }); //articulo
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'adjustqtyby',
              value: toAdjustQuantity
            }); //cantidad a ajustar por bin
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'location',
              value: order.location
            }); //ubicación
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'unitcost',
              value: item.average_cost
            }); //costo promedio
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'custcol_cha_item_location',
              value: order.location
            }); //ubicación
            inventoryAdjustment.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'memo',
              value: item.adjusment_reason
            }); //memo por linea para indicar el motivo de ajuste
            let inventoryDetail = inventoryAdjustment.getCurrentSublistSubrecord({
              sublistId: 'inventory',
              fieldId: 'inventorydetail'
            });
            inventoryDetail.setValue({
              fieldId: 'item',
              value: item.itemid
            });
            inventoryDetail.setValue({
              fieldId: 'location',
              value: order.location
            });
            inventoryDetail.setValue({
              fieldId: 'quantity',
              value: toAdjustQuantity
            });
            inventoryDetail.selectNewLine({
              sublistId: 'inventoryassignment'
            });
            inventoryDetail.setCurrentSublistValue({
              sublistId: 'inventoryassignment',
              fieldId: 'binnumber',
              value: el.binnumber
            });
            inventoryDetail.setCurrentSublistValue({
              sublistId: 'inventoryassignment',
              fieldId: 'quantity',
              value: toAdjustQuantity
            });
            inventoryDetail.commitLine({
              sublistId: 'inventoryassignment'
            });

            //se compromete la linea del articulo
            inventoryAdjustment.commitLine({
              sublistId: 'inventory'
            });

          // Comprobamos si el ajuste ya está registrado
            const adjustmentId = inventoryAdjustment.save();
            generatedAdjustments.push(adjustmentId);

          }

        });

        // si el articulo esta marcado para aplicar merma, y cumple con la observación y motivo ajustes especificados
        //entonces hay que hacer el recalculo de la merma
        if (item.decrease === 'T') {
          if (['Compensación', 'Contraajuste', 'Venta de más', 'Faltante sin aclaración', 'Sobrante'].indexOf(item.observation) > -1) {
            if (['Diferencia de inventario depto con merma', 'Diferencia de inventario depto con merma c/cobro'].indexOf(item.adjusment_reason) > -1) {
              adjustCostAmount += Number(item.cost_amount);
            }
          }
        }
      });
      
      // Si se generaron ajustes, actualizamos el campo custrecord_cha_ajustesasociados de la orden
      if (generatedAdjustments.length > 0) {
        const adjustmentIds = generatedAdjustments.join(", "); // Unimos los idAjustes con comas
        record.submitFields({
          id: orderId,
          type: 'customrecord_order_control_inventory', // Asegúrate de que el tipo sea 'salesorder' o el tipo correcto
          values: {
            'custrecord_cha_ajustesasociados': adjustmentIds
            }
        });
      }


      //si el ajuste de invetario se puede guardar de manera correcta entonces se hace el recalculo de la merma
      if (generatedAdjustments.length > 0) {
        
        const decrease = get_deacresed({
          location: order.location,
          department: order.department,
          class: order.class
        });

        if (!decrease.internalid) return

        //si no hay un registro de merma que coincida con los filtros ya no es necesario actualizar merma
        //se actualiza el valor de la merma
        log.audit('INTENTO ACTUA', decrease.internalid);


        log.audit('DATOS MERMA', decrease.merma);
        log.audit('DATOS EJERCIDO', decrease.executed + adjustCostAmount);
        log.audit('DATOS COBRADO', decrease.cobrado);

        record.submitFields({
          id: decrease.internalid,
          type: 'customrecord_control_inventary_decrease',
          values: {
            'custrecord_decrease_ci_ejercido': (parseFloat(decrease.executed + adjustCostAmount)).toFixed(2),
            'custrecord_decrease_ci_porejercier': (parseFloat(decrease.merma - (decrease.executed + adjustCostAmount)) + decrease.cobrado).toFixed(2),
          }
        });

        log.audit('CALCULO EJERCIDO', (parseFloat(decrease.executed + adjustCostAmount)).toFixed(2));
        log.audit('CALCULO EJERCIDO FIX', (Number(decrease.executed) + Number(adjustCostAmount)).toFixed(2));

        log.audit('CALCULO POR EJERCER', (parseFloat(decrease.merma - (decrease.executed + adjustCostAmount)) + decrease.cobrado).toFixed(2));
        log.audit('CALCULO POR EJERCER FIX', ((Number(decrease.merma) - (Number(decrease.executed) + Number(adjustCostAmount))) + Number(decrease.cobrado)).toFixed(2));
      }
      log.audit('Item existencia disponible insuficiente para ajustar', itemErrorAdjustmentArray);

    } catch (e) {
      log.error("ERROR EN REDUCE", e)
    }

  }


  entry_point.summarize = (context) => {
    const script = runtime.getCurrentScript();
    const orderId = Number(script.getParameter({
      name: 'custscript_order_inventory'
    }));

    let order = record.load({
      type: "customrecord_order_control_inventory",
      id: orderId,
      isDynamic: true
    });

    order.setValue({
      fieldId: 'custrecord_control_inventory_end_date',
      value: new Date()
    });

    order.save();

    const thereAreAnyError = (context) => {
      const inputSummary = context.inputSummary;
      const mapSummary = context.mapSummary;
      const reduceSummary = context.reduceSummary;
      let errorReduce = false;
      context.reduceSummary.errors.iterator().each(function (key, error) {
        errorReduce = true;
        //log.error('Reduce Error for key: ' + key, error);
        return true;
      });
      //si no hay errores entonces se sale del la función y se retorna false incando que no hubo errores
      if (!inputSummary.error && !errorReduce) return false;

      //se hay errores entonces se imprimen los errores en el log para poder visualizarlos
      if (inputSummary.error) log.debug("ERROR_INPPUT_STAGE", `Erro: ${inputSummary.error}`);
      handleErrorInStage('map', mapSummary);
      handleErrorInStage('reduce', reduceSummary);

      function handleErrorInStage(currentStage, summary) {
        summary.errors.iterator().each((key, value) => {
          log.debug(`ERROR_${currentStage}`, `Error( ${currentStage} ) with key: ${key}.Detail: ${JSON.parse(value).message}`);
          return true;
        });
      }
      return true;
    };
    //si no hay errores en el proceso entonces se actualiza la orden de levantamiento, marcando la orden como aprobada
    if (!thereAreAnyError(context)) {
      record.submitFields({
        id: orderId,
        type: 'customrecord_order_control_inventory',
        values: {
          custrecord_control_inventory_status: 'Aprobada',
          custrecord_archivo_aprobacion_taskid: ''
        }
      });
    } //*/
    else { //Si hubo errores regresar estado anterior
      record.submitFields({
        id: orderId,
        type: 'customrecord_order_control_inventory',
        values: {
          custrecord_control_inventory_status: 'Pendiente aprobación',
        }
      });
    }
    log.audit('Summary', [{
        title: 'Usage units consumed',
        details: context.usage
      },
      {
        title: 'Concurrency',
        details: context.concurrency
      },
      {
        title: 'Number of yields',
        details: context.yields
      }
    ]);
  } //end summarize

  return entry_point;
  /**
   * @param {Number} orderId 
   * @returns 
   * @description se obtenen los datos de cabecera de la orden
   */
  function getOrderData(orderId) {
    const searchOrder = search.lookupFields({
      type: 'customrecord_order_control_inventory',
      id: orderId,
      columns: [
        'custrecord_control_inventory_subsidiary',
        'custrecord_control_inventory_location',
        'custrecord_control_inventory_department',
        'custrecord_control_inventory_class',
        'custrecord_control_inventory_memo'
      ]
    });
    return {
      subsidiary: Number(searchOrder.custrecord_control_inventory_subsidiary[0].value),
      location: Number(searchOrder.custrecord_control_inventory_location[0].value),
      department: Number(searchOrder.custrecord_control_inventory_department[0].value),
      class: searchOrder.custrecord_control_inventory_class.length ? Number(searchOrder.custrecord_control_inventory_class[0].value) : '',
      memo: searchOrder.custrecord_control_inventory_memo //CUM 03Nov2021 Correción error al generar ajuste
    }
  }
  /**
   * @param {Number} locationId
   * @returns {Array}
   * @description se obtiene la lista completa de bins en la ubicación
   */
  function get_bins_by_location(locationId) {
    const bins = [];
    const searchBin = search.create({
      type: 'bin',
      filters: [
        ['location', 'anyof', locationId],
        'AND',
        ['inactive', 'is', 'F']
      ],
      columns: [
        internalidColumn = search.createColumn({
          name: 'internalid',
        }),
        locationColumn = search.createColumn({
          name: 'location',
        })
      ]
    });
    const paged = searchBin.runPaged({
      'pa​g​e​S​i​z​e': 1000
    });
    for (let i = 0; i < paged.pageRanges.length; i++) {
      let currentPage = paged.fetch(i);
      currentPage.data.map(_result => {
        bins.push({
          binnumber: Number(_result.getValue(internalidColumn)),
          itemcount: 0
        });
      });
    }
    return bins;
  }
  /**
   * @param {Number} itemId 
   * @param {Number} locationId 
   * @returns Se obtiene el detalle de inventario del articulo en la ubicación para saber cuantos articulos hay por bin actualmente
   */
  function get_inventory_detail(itemId, locationId) {
    let inventory_detail = {};
    const inventoryDetailSearch = search.create({
      type: 'item',
      filters: [
        ['internalid', 'anyof', itemId],
        'AND',
        ['inventorydetail.location', 'anyof', locationId],
        'AND',
        ['inventorydetail.isinventoryaffecting', 'is', 'T']
      ],
      columns: [
        internalidColumn = search.createColumn({
          name: 'internalid',
          summary: 'GROUP',
          sort: search.Sort.ASC
        }),
        binNumberColumn = search.createColumn({
          name: 'binnumber',
          join: 'inventoryDetail',
          summary: 'GROUP'
        }),
        itemCountColumn = search.createColumn({
          name: 'itemcount',
          join: 'inventoryDetail',
          summary: 'SUM'
        })
      ]
    })
    const pageData = inventoryDetailSearch.runPaged({
      pageSize: 1000
    });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const searchPage = pageData.fetch({
        index: i
      });
      searchPage.data.forEach(function (result) {
        let internalid = result.getValue(internalidColumn);
        let binnumber = result.getValue(binNumberColumn);

        // se agrega validacion para evitar que ingresen binnumber "-none-" al realizar la busqueda
        if(binnumber !== '') {
          if (!inventory_detail.hasOwnProperty(internalid)) {
            inventory_detail[internalid] = [{
              binnumber: Number(result.getValue(binNumberColumn)),
              itemcount: Number(result.getValue(itemCountColumn))
            }]
          } else {
            inventory_detail[internalid].push({
              binnumber: Number(result.getValue(binNumberColumn)),
              itemcount: Number(result.getValue(itemCountColumn))
            });
          }
        }
      });
    }

    return inventory_detail;
  }
  /**
   * @param {Number} itemId 
   * @param {Number} locationId 
   * @returns Se obtiene el detalle de inventario del articulo en la ubicación para saber cuantos articulos hay por bin actualmente y el disponible para ajuste de inventario
   */
  function get_inventory_detail_balance(itemId, locationId) {
    let inventory_detail = {};
    let filtros = [
      ["item", "anyof", itemId],
      "AND",
      ["binnumber", "noneof", "@NONE@"],
      "AND",
      ["formulanumeric: TRUNC({available},5)", "greaterthan", "0"],
      "AND",
      ["location.isinactive", "is", "F"],
      "AND",
      ["location", "anyof", locationId]
    ];

    const inventoryDetailSearch = search.create({
      type: search.Type.INVENTORY_BALANCE,
      filters: filtros,
      columns: [ //"location", "binnumber","available"
        internalidColumn = search.createColumn({
          name: 'item',
          summary: 'GROUP',
          sort: search.Sort.ASC
        }),
        binNumberColumn = search.createColumn({
          name: 'binnumber',
          summary: 'GROUP'
        }),
        itemCountColumn = search.createColumn({
          name: 'available',
          summary: 'SUM'
        })
      ]
    })
    const pageData = inventoryDetailSearch.runPaged({
      pageSize: 1000
    });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const searchPage = pageData.fetch({
        index: i
      });
      searchPage.data.forEach(function (result) {
        let internalid = result.getValue(internalidColumn)
        if (!inventory_detail.hasOwnProperty(internalid)) {
          inventory_detail[internalid] = [{
            binnumber: Number(result.getValue(binNumberColumn)),
            itemcount: Number(result.getValue(itemCountColumn))
          }]
        } else {
          inventory_detail[internalid].push({
            binnumber: Number(result.getValue(binNumberColumn)),
            itemcount: Number(result.getValue(itemCountColumn))
          });
        }
      });
    }
    log.debug('inventory balance', inventory_detail);
    return inventory_detail;
  }
  /**
   * @param {Number} orderId 
   * @param {Number} itemId 
   * @returns {Array}
   * @description se obtiene el bin y la cantidad leida en el bin del articulo
   */
  function get_in_store_inventory_detail(orderId, itemId) {
    let inventory_detail = {};
    search.create({
      type: 'customrecord_cha_ci_item_bin',
      filters: [
        ['custrecord_ci_itemsbins_folio', 'anyof', orderId],
        'AND',
        ['custrecord_ci_itemsbins_item', 'anyof', itemId]
      ],
      columns: [
        internalidItemColumn = search.createColumn({
          name: "custrecord_ci_itemsbins_item",
          summary: "GROUP"
        }),
        binNumberColumn = search.createColumn({
            name: "custrecord_ci_itemsbins_bin",
            summary: "GROUP"
        }),
        itemCountColumn = search.createColumn({
          name: "custrecord_ci_itemsbins_amount",
          summary: "SUM"
        })
      ]
    }).run().each((_result) => {
        let internalidItem = _result.getValue(internalidItemColumn);

      if (!inventory_detail.hasOwnProperty(internalidItem)) {
        inventory_detail[internalidItem] = [{
          binnumber: Number(_result.getValue(binNumberColumn)),
          itemcount: Number(_result.getValue(itemCountColumn))
        }]
      } else {
        inventory_detail[internalidItem].push({
          binnumber: Number(_result.getValue(binNumberColumn)),
          itemcount: Number(_result.getValue(itemCountColumn))
        });
      }
      return true;
    });

    return inventory_detail;
  }
  /**
   * @param {Object} decrease 
   * @returns {Object}
   * @description se obtiene el registro de merma correspondiente
   */
  function get_deacresed(decrease) {

    let data_deacresed = {
      internalid: 0,
      executed: 0,
      merma: 0,
      cobrado: 0
    };
    const filters = [
      ['custrecord_decrease_ci_location', 'anyof', decrease.location],
      'AND',
      ['custrecord_decrease_ci_department', 'anyof', decrease.department],
    ];
    //el filtro de la clase no es necesario requerido por lo que solamente si viene especificado se agrega como filtro
    if (decrease.class)[...filters, 'AND', ['custrecord_decrease_ci_class', 'anyof', decrease.class]]
    search.create({
      type: 'customrecord_control_inventary_decrease',
      filters: filters,
      columns: [
        'custrecord_decrease_ci_ejercido',
        'custrecord_decrease_ci_amount',
        'custrecord_decrease_ci_cobrado',
      ]
    }).run().each((result) => {
      data_deacresed['internalid'] = result.id;
      data_deacresed['merma'] = Number(result.getValue('custrecord_decrease_ci_amount'));
      data_deacresed['executed'] = Number(result.getValue('custrecord_decrease_ci_ejercido'));
      data_deacresed['cobrado'] = Number(result.getValue('custrecord_decrease_ci_cobrado'));
    });
    log.audit("GET_DEACRESED", data_deacresed);
    return data_deacresed;
  }
});