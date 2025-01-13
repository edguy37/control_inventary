/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_search_items.js
 * @description busquedas de los articulos ya sean de los archivos de lecturas cargados o por filtros del suitelet
 * @NApiVersion 2.1
 */
define(['N/search', 'N/file', 'N/log', 'N/record', 'N/query', ], function (search, file, log, record, query) {
  const entry_point = {
    get_items_by_file: null,
    get_items_by_order_detail: null,
    get_items_by_order: null,
    get_item_by_itemid: null,
    get_items_by_filters: null,
    get_items_by_analysis_filters: null
  }

  entry_point.get_items_by_file = (context) => {
    let items_by_file = [];
    const lecture = file.load({
      id: context.file
    });
    const iterator = lecture.lines.iterator();
    const get_items_by_ean = (ean_codes) => {

      let item = [];
      const orderFields = search.lookupFields({
        type: 'customrecord_order_control_inventory',
        id: context.order,
        columns: [
          'custrecord_control_inventory_department',
          'custrecord_control_inventory_class',
          'custrecord_control_inventory_vendor'
        ]
      });
      const order = {
        vendor: orderFields.custrecord_control_inventory_vendor.length ? orderFields.custrecord_control_inventory_vendor[0].value : '',
        class: orderFields.custrecord_control_inventory_class.length ? orderFields.custrecord_control_inventory_class[0].value : '',
        department: (orderFields.custrecord_control_inventory_department[0] || {}).value,
      }
      
      let filters = [];
      //si la orden de levantamiento es por departamento, se verifica que los codigos UPC/articulos pertenezcan al departamento
      if (order.department) {
        filters = [
          ['department', 'anyof', order.department]
        ] ;
        if (order.vendor) filters = [...filters, 'AND', ['vendor', 'anyof', order.vendor]];
        if (order.class) filters = [...filters, 'AND', ['class', 'anyof', order.class]];
        // subarray que contiene los filtros por cada codigo UPC
        let eancodesFilters = [];

        log.debug('LIB_ITEMS # ITEMS ANTES SER EXCLUIDOS',ean_codes.length);
        //Se consulta todos los upc que correspondan al departamento y se excluyen los que no
        let upcCodes = upcCodesSearch(order.department, ean_codes);
        log.debug('LIB_ITEMS # ITEMS DESPUES SER EXCLUIDOS',upcCodes.length);
        if(upcCodes.length > 0){
          upcCodes.forEach(function(element, index){
            if(eancodesFilters.length > 0) {
              eancodesFilters = [...eancodesFilters, 'OR'];
            }
            eancodesFilters = [...eancodesFilters, ['upccode', 'is', element.upccode], 'OR', ['custitem_bex_codigo_ean', 'is', element.upccode]];

          });
        } 
        log.debug('LIB_ITEMS eancodesFilters',eancodesFilters)
        // Se agrega el subarray que contiene los filtros por cada codigo UPC
        if (eancodesFilters.length > 0) {
          filters = [...filters, 'AND', ...eancodesFilters];
        }
      } else {
        //si la orden de levantamiento no es por departamento se consideran todos los codigos UPC
        if (order.vendor) filters = ['vendor', 'anyof', order.vendor];
        if (order.class) filters = [...filters, 'AND', ['class', 'anyof', order.class]];
        ean_codes.forEach(function (element, index) {
          filters = [...filters, ['upccode', 'is', element], 'OR', ['custitem_bex_codigo_ean', 'is', element]]
          if (index < ean_codes.length - 1) filters = [...filters, 'OR']
        })
      }

      log.debug('LIB_ITEMS FINAL FILTERS', filters);

      search.create({
        type: 'item',
        filters: filters,
        columns: [
          'internalid',
          'upccode',
          'custitem_bex_codigo_ean',
          'itemid',
          'vendor',
          'department',
          'class',
          'salesdescription',
          'displayname',
          'custitem27', //talla chapur
          'custitem26', //color chapur
          'averagecost',
          search.createColumn({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          }),
          'unitstype',
        ]
      }).run().each(el => {
        //excluir articulos que no coincidan con los filtro del encabezado de la orden
        item.push({
          internalid: Number(el.id),
          ean: Number(el.getValue('upccode')),
          ean2: el.getValue('custitem_bex_codigo_ean'),
          itemid: el.getValue('itemid'),
          department: el.getValue('department'),
          class: el.getValue('class'),
          vendor: el.getText('vendor'),
          salesdescription: el.getValue('salesdescription'),
          displayname: el.getValue('displayname'),
          size: el.getText('custitem27'),
          color: el.getText('custitem26'),
          average_cost: el.getValue('averagecost'),
          base_price: el.getValue({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          }),
          unitstype: el.getValue('unitstype')
        });
        return true;
      });
      return item;
    }

    iterator.each(line => {
      let _line_value = line.value.split(',');

      if (_line_value.length === 2) {
        if (items_by_file.map(item => `${item.ean},${item.bin}`).indexOf(line.value) > -1) {
          items_by_file[items_by_file.map(item => `${item.ean},${item.bin}`).indexOf(line.value)].count += 1;
        } else {
          items_by_file.push({
            ean: _line_value[0].trim(),
            count: 1,
            bin: Number(_line_value[1]),
            internalid: 0,
          });
        }
      }
      return true;
    });

    const items_by_ean = get_items_by_ean(items_by_file.map(el => el.ean.toString()));

    let ean = items_by_ean.map(el => el.ean);
    let ean2 = items_by_ean.map(el => el.ean2);

    const items = items_by_file.reduce((result, el) => {

      let ean_index = ean.indexOf(Number(el.ean));
      let ean2_index = ean2.indexOf(el.ean.toString());

      if (ean_index > -1 || ean2_index > -1) {
        result.push({
          file: lecture.name,
          ean: el.ean,
          ean: ean_index > -1 ? items_by_ean[ean_index] : items_by_ean[ean2_index],
          count: el.count,
          bin: el.bin,
          internalid: ean_index > -1 ? items_by_ean[ean_index].internalid : items_by_ean[ean2_index].internalid,
          itemid: ean_index > -1 ? items_by_ean[ean_index].itemid : items_by_ean[ean2_index].itemid,
          vendor: ean_index > -1 ? items_by_ean[ean_index].vendor : items_by_ean[ean2_index].vendor,
          salesdescription: ean_index > -1 ? items_by_ean[ean_index].salesdescription : items_by_ean[ean2_index].salesdescription,
          displayname: ean_index > -1 ? items_by_ean[ean_index].displayname : items_by_ean[ean2_index].displayname,
          size: ean_index > -1 ? items_by_ean[ean_index].size : items_by_ean[ean2_index].size,
          color: ean_index > -1 ? items_by_ean[ean_index].color : items_by_ean[ean2_index].color,
          average_cost: ean_index > -1 ? items_by_ean[ean_index].average_cost : items_by_ean[ean2_index].average_cost,
          base_price: ean_index > -1 ? items_by_ean[ean_index].base_price : items_by_ean[ean2_index].base_price,
          unitstype: ean_index > -1 ? items_by_ean[ean_index].unitstype : items_by_ean[ean2_index].unitstype
        });
      }
      return result;
    }, []);

    log.debug('LIB_ITEMS TOTAL ITEMS', items.length);
    return items;
  }
  entry_point.get_items_by_order_detail = (context) => {
    let item = {};
    search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_itemid', 'anyof', context.itemid],
        'AND',
        ['custrecord_ci_body_parent', 'anyof', context.orderid]
      ],
      columns: [
        'custrecord_ci_body_in_store',
        'custrecord_ci_body_average_cost',
        'custrecord_ci_body_base_price',
        'custrecord_ci_body_difference',
        'custrecord_ci_body_availabe',
        'custrecord_ci_body_itemid'
      ],
    }).run().each(_result => {
      item = {
        lineid: Number(_result.id),
        in_store: Number(_result.getValue('custrecord_ci_body_in_store')),
        average_cost: Number(_result.getValue('custrecord_ci_body_average_cost')),
        base_price: Number(_result.getValue('custrecord_ci_body_base_price')),
        difference: Number(_result.getValue('custrecord_ci_body_difference')),
        in_system: Number(_result.getValue('custrecord_ci_body_availabe')),
        itemname: _result.getText('custrecord_ci_body_itemid')
      }
    });
    return item;
  }
  entry_point.get_items_by_order = (context) => {
    const {
      order
    } = context;
    let items = [];
    const search_item = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'is', order.id]
      ],
      columns: [
        'custrecord_ci_body_vendor',
        'custrecord_ci_body_itemid',
        'custrecord_ci_body_purchase_description',
        'custrecord_ci_body_displayname',
        'custrecord_ci_body_size',
        'custrecord_ci_body_color',
        'custrecord_ci_body_unitstype',
        'custrecord_ci_body_availabe',
        'custrecord_ci_body_in_store',
        'custrecord_ci_body_difference',
        'custrecord_ci_body_confiability',
        'custrecord_ci_body_observation',
        'custrecord_ci_body_adjusment_reason',
        'custrecord_ci_body_analysis',
        'custrecord_ci_body_decrease',
        'custrecord_ci_body_base_price',
        'custrecord_ci_body_average_cost',
        'custrecord_ci_body_price_amount',
        'custrecord_ci_body_cost_amount',
        'custrecord_ci_body_system_amount',
        'custrecord_ci_body_system_amount_cost',
        'custrecord_ci_body_in_store_amount',
      ]
    });
    const pagedData = search_item.runPaged({
      'pa​g​e​S​i​z​e': 1000
    });
    // iterate the pages
    for (let i = 0; i < pagedData.pageRanges.length; i++) {
      // fetch the current page data
      const currentPage = pagedData.fetch(i);
      currentPage.data.forEach(function (_result) {
        items.push({
          selection: 'T',
          internalid: Number(_result.getValue('custrecord_ci_body_itemid')),
          itemid: _result.getText('custrecord_ci_body_itemid'),
          purchase_description: _result.getValue('custrecord_ci_body_purchase_description') || ' ',
          displayname: _result.getValue('custrecord_ci_body_displayname'),
          size: _result.getValue('custrecord_ci_body_size') || ' ',
          color: _result.getValue('custrecord_ci_body_color'),
          unitstype: _result.getValue('custrecord_ci_body_unitstype'),
          vendor: Number(_result.getValue('custrecord_ci_body_vendor')),
          average_cost: Number(_result.getValue('custrecord_ci_body_average_cost')),
          base_price: Number(_result.getValue('custrecord_ci_body_base_price')),
          availabe: Number(_result.getValue('custrecord_ci_body_availabe')),
          observation: Number(_result.getValue('custrecord_ci_body_observation')),
          adjusment_reason: Number(_result.getValue('custrecord_ci_body_adjusment_reason')),
          in_store: Number(_result.getValue('custrecord_ci_body_in_store')),
          difference: Number(_result.getValue('custrecord_ci_body_difference')),
          confiability: Number(_result.getValue('custrecord_ci_body_confiability')),
          analysis: _result.getValue('custrecord_ci_body_analysis') || ' ',
          decrease: _result.getValue('custrecord_ci_body_decrease') ? 'SI' : 'NO',
          price_amount: Number(_result.getValue('custrecord_ci_body_price_amount')),
          cost_amount: Number(_result.getValue('custrecord_ci_body_cost_amount')),
          system_amount: Number(_result.getValue('custrecord_ci_body_system_amount')),
          system_amount_cost: Number(_result.getValue('custrecord_ci_body_system_amount_cost')),
          in_store_amount: Number(_result.getValue('custrecord_ci_body_in_store_amount')),
          id: order.id
        });
      });
    }

    return items;
  }
  //CONSULTA PARA AGREGAR ARTICULO AL A ORDEN
  entry_point.get_item_by_itemid = (context) => {
    let item = null;

    var location = search.lookupFields({
      type: 'customrecord_order_control_inventory',
      id: Number(context.orderid),
      columns: ['custrecord_control_inventory_location']
    });

    var location_type = search.lookupFields({
      type: 'location',
      id: location.custrecord_control_inventory_location[0].value,
      columns: ['locationtype']
    });

    var location_type = Number(location_type.locationtype)

    search.create({
      type: 'item',
      filters: [
        ['internalid', 'anyof', context.itemid],
        "AND",
        ["inventorylocation", "anyof", location.custrecord_control_inventory_location[0].value],
        "AND",
        ['isinactive', 'is', false] // se excluye articulos dados de baja
      ],
      columns: [
        'itemid',
        'vendor',
        'salesdescription',
        'displayname',
        'custitem27', //talla chapur
        'custitem26', //color chapur
        'averagecost', //search.createColumn({ name: "formulacurrency", formula: "NVL({averagecost}, 0)", }),
        search.createColumn({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }),
        'unitstype',
        'locationquantityavailable',
        'locationquantitycommitted',
        'locationquantityonhand',
      ]
    }).run().each((_result) => {

      let availabe = 0;

      if (location_type === 1 || location_type === 4) {
        availabe = Number(_result.getValue('locationquantityavailable')) + Number(_result.getValue('locationquantitycommitted'));
      } else {
        availabe = Number(_result.getValue('locationquantityonhand'));
      }

      item = {
        selection: 'T',
        internalid: Number(_result.id),
        itemid: _result.getValue('itemid').replace(/.* :/g, ''),
        purchase_description: _result.getValue('salesdescription') || ' ',
        displayname: _result.getValue('displayname').replace(/ : .+/, ''),
        size: _result.getText('custitem27') === '' ? ' ' : _result.getText('custitem27'),
        color: _result.getText('custitem26'),
        unitstype: _result.getText('unitstype'),
        vendor: _result.getValue('vendor'),
        vendor_text: _result.getText('vendor'),
        average_cost: Number(_result.getValue('averagecost')),
        base_price: Number(_result.getValue({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        })),
        availabe: availabe, //get_inventory_balance(result.id, context.location),
        observation: 0,
        in_store: 0,
        difference: -1 * availabe,
        confiability: 0,
        analysis: ' ',
        decrease: 'No',
        price_amount: Number(parseFloat((-1 * availabe) * Number(_result.getValue({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }))).toFixed(2)), //importe precio
        cost_amount: Number(parseFloat((-1 * availabe) * Number(_result.getValue('averagecost'))).toFixed(2)), //importe costo
        system_amount: Number(parseFloat(availabe * Number(_result.getValue({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }))).toFixed(2)), //valor sistema
        system_amount_cost: Number(parseFloat(availabe * Number(_result.getValue('averagecost'))).toFixed(2)), //valor sistema costo
        in_store_amount: Number(parseFloat(0 * Number(_result.getValue({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }))).toFixed(2)), //valor fisico
        id: 0,
      };
    });
    return item;
  }
  //CONSULTA AL CREAR
  entry_point.get_items_by_filters = (context) => {
    let items = [];
    let filters = [
      ['subsidiary', 'anyof', context.subsidiary],
      'AND',
      ['inventorylocation', 'anyof', context.location],
      'AND',
      ['department', 'anyof', context.department],
      'AND',
      ['matrix', 'is', 'F'],
      'AND',
      ['isinactive', 'is', false]
    ];

    var ubicacion = record.load({
      type: "location",
      id: context.location,
      isDynamic: false
    });

    var location_type = Number(ubicacion.getValue({
      fieldId: 'locationtype'
    })); //Acomodo-1 Tienda-4    

    if (location_type === 1 || location_type === 4) {
      filters.push('AND', ['locationquantityavailable', 'notequalto', '0']);
    } else {
      filters.push('AND', ['locationquantityonhand', 'notequalto', '0']);
    }

    if (context.vendor && context.vendor[0]) filters.push('AND', ['vendor', 'anyof', context.vendor]);
    if (context.class) filters.push('AND', ['class', 'anyof', context.class]);
    if (context.internalid) filters.push('AND', ['internalid', 'anyof', context.internalid])

    const s = search.create({
      type: 'item',
      filters: filters,
      columns: [
        'itemid',
        'vendor',
        'salesdescription',
        'displayname',
        'custitem27', //talla chapur
        'custitem26', //color chapur
        'averagecost', //search.createColumn({ name: "formulacurrency", formula: "NVL({averagecost}, 0)", }),
        search.createColumn({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }),
        'unitstype',
        'locationquantityavailable',
        'locationquantitycommitted',
        'locationquantityonhand',
      ]
    });
    const pagedData = s.runPaged({
      'pa​g​e​S​i​z​e': 1000
    });
    log.debug('resultados', pagedData.count);
    // iterate the pages
    for (var i = 0; i < pagedData.pageRanges.length; i++) {
      // fetch the current page data
      var currentPage = pagedData.fetch(i);
      currentPage.data.forEach(function (_result) {
        let available = 0;

        if (location_type === 1 || location_type === 4) {
          available = Number(_result.getValue('locationquantityavailable')) + Number(_result.getValue('locationquantitycommitted'));
        } else {
          available = Number(_result.getValue('locationquantityonhand'));
        }

        items.push({
          selection: 'F',
          internalid: Number(_result.id),
          itemid: _result.getValue('itemid').replace(/.* :/g, ''),
          purchase_description: _result.getValue('salesdescription') || ' ',
          displayname: _result.getValue('displayname').replace(/ : .+/, ''),
          size: _result.getText('custitem27') === '' ? ' ' : _result.getText('custitem27'),
          color: _result.getText('custitem26'),
          unitstype: _result.getText('unitstype'),
          vendor: _result.getValue('vendor'),
          vendor_text: _result.getText('vendor'),
          average_cost: Number(_result.getValue('averagecost')),
          base_price: Number(_result.getValue({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          })),
          available: available, //get_inventory_balance(result.id, context.location),
          observation: 0,
          in_store: 0,
          difference: -1 * available,
          confiability: 0,
          analysis: ' ',
          decrease: 'No',
          price_amount: Number(parseFloat((-1 * available) * Number(_result.getValue({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          }))).toFixed(2)), //importe precio
          cost_amount: Number(parseFloat((-1 * available) * Number(_result.getValue('averagecost'))).toFixed(2)), //importe costo
          system_amount: Number(parseFloat(available * Number(_result.getValue({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          }))).toFixed(2)), //valor sistema
          system_amount_cost: Number(parseFloat(available * Number(_result.getValue('averagecost'))).toFixed(2)), //valor sistema costo
          in_store_amount: Number(parseFloat(0 * Number(_result.getValue({
            name: "formulacurrency",
            formula: "NVL({baseprice}, 0)",
          }))).toFixed(2)), //valor fisico
          id: 0,
        });
      });
    }
    return items;
  }
  entry_point.get_items_by_analysis_filters = (context) => {
    log.debug('', context);
    let items = [];
    let filters = [
      ['custrecord_ci_body_parent', 'anyof', context.order],
      'AND',
      ['custrecord_ci_body_difference', 'notequalto', 0]
    ];
    if (context.description) {
      filters = [...filters, 'AND', ['custrecord_ci_body_purchase_description', 'contains', context.description]];
    }
    //acciones para filtro de proveedor
    if (context.vendor.filter(el => el !== '').length > 0) {
      filters = [...filters, 'AND', ['custrecord_ci_body_vendor', 'anyof', context.vendor.filter(el => el !== '')]]
    }
    //acciones para el filtro de modelo
    if (context.model.filter(el => el !== '').length > 0) {
      filters = [...filters, 'AND', context.model.reduce((result, el, index) => {
        if (context.model.length - 1 == index) {
          result.push(['custrecord_ci_body_displayname', 'is', el])
        } else {
          result.push(['custrecord_ci_body_displayname', 'is', el], 'OR')
        }
        return result;
      }, [])]
    }
    log.debug('', filters);
    const itemSearch = search.create({
      type: 'customrecord_control_inventory_body',
      filters: filters,
      columns: [
        itemidColumn = search.createColumn({
          name: 'custrecord_ci_body_itemid'
        }),
        codigoColumn = search.createColumn({
          name: "custrecord_ci_body_numart_text_"
        }),
        vendorColumn = search.createColumn({
          name: 'custrecord_ci_body_vendor'
        }),
        purchaseDescriptonColumn = search.createColumn({
          name: 'custrecord_ci_body_purchase_description'
        }),
        displaynameColumn = search.createColumn({
          name: 'custrecord_ci_body_displayname'
        }),
        sizeColumn = search.createColumn({
          name: 'custrecord_ci_body_size'
        }),
        colorColumn = search.createColumn({
          name: 'custrecord_ci_body_color'
        }),
        unitstypeColumn = search.createColumn({
          name: 'custrecord_ci_body_unitstype'
        }),
        averageCostColumn = search.createColumn({
          name: 'custrecord_ci_body_average_cost'
        }),
        basePriceColumn = search.createColumn({
          name: 'custrecord_ci_body_base_price'
        }),
        availabeColumn = search.createColumn({
          name: 'custrecord_ci_body_availabe'
        }),
        observationColumn = search.createColumn({
          name: 'custrecord_ci_body_observation'
        }),
        adjustmentReasonColumn = search.createColumn({
          name: 'custrecord_ci_body_adjusment_reason'
        }),
        inStoreColumn = search.createColumn({
          name: 'custrecord_ci_body_in_store'
        }),
        differenceColumn = search.createColumn({
          name: 'custrecord_ci_body_difference'
        }),
        confiabilityColumn = search.createColumn({
          name: 'custrecord_ci_body_confiability'
        }),
        analysisColumn = search.createColumn({
          name: 'custrecord_ci_body_analysis'
        }),
        decreaseColumn = search.createColumn({
          name: 'custrecord_ci_body_decrease'
        }),
        priceAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_price_amount'
        }),
        costAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_cost_amount'
        }),
        systemAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_system_amount_cost'
        }),
        systemAmountCostColumn = search.createColumn({
          name: 'custrecord_ci_body_system_amount_cost'
        }),
        inStoreAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_in_store_amount'
        }),
        
      ]
    });

    const pageData = itemSearch.runPaged({
      pageSize: 1000
    });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const customrecord_control_inventory_bodySearchPage = pageData.fetch({
        index: i
      });
      customrecord_control_inventory_bodySearchPage.data.forEach(function (result) {
        items.push({
          itemid: result.id,
          internalid: Number(result.getValue(itemidColumn)),
          codigo: result.getValue(codigoColumn),//PABC 03-11-22 Agregado de un nuevo campo
          vendor: Number(result.getValue(vendorColumn)),
          purchase_description: result.getValue(purchaseDescriptonColumn) || ' ',
          displayname: result.getValue(displaynameColumn).replace(/ : .+/, ''),
          size: result.getValue(sizeColumn) || ' ',
          color: result.getValue(colorColumn) || ' ',
          unitstype: result.getValue(unitstypeColumn) || ' ',
          average_cost: Number(result.getValue(averageCostColumn)),
          base_price: Number(result.getValue(basePriceColumn)),
          available: result.getValue(availabeColumn), //get_inventory_balance(result.id, context.location),
          observation: Number(result.getValue(observationColumn)),
          adjustment_reason: Number(result.getValue(adjustmentReasonColumn)),
          in_store: result.getValue(inStoreColumn),
          difference: result.getValue(differenceColumn),
          confiability: result.getValue(confiabilityColumn),
          analysis: result.getValue(analysisColumn) || ' ',
          decrease: !result.getValue(decreaseColumn) ? 'F' : 'T',
          price_amount: Number(result.getValue(priceAmountColumn)), //importe precio
          cost_amount: Number(result.getValue(costAmountColumn)), //importe costo
          system_amount: Number(result.getValue(systemAmountColumn)), //valor sistema
          system_amount_cost: Number(result.getValue(systemAmountCostColumn)), //valor sistema costo
          in_store_amount: Number(result.getValue(inStoreAmountColumn)), //valor fisico
          id: "0",
        });
      });
    }
    return items;
  }
  entry_point.get_items_by_adjustment_filters = (context) => {
    let items = [];
    const itemSearch = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'anyof', context.order],
        'AND',
        ['custrecord_ci_body_observation', 'anyof', context.observation],
        'AND',
        ['custrecord_ci_body_difference', 'notequalto', 0]
      ],
      columns: [
        itemidColumn = search.createColumn({
          name: 'custrecord_ci_body_itemid'
        }),
        vendorColumn = search.createColumn({
          name: 'custrecord_ci_body_vendor'
        }),
        purchaseDescriptonColumn = search.createColumn({
          name: 'custrecord_ci_body_purchase_description'
        }),
        displaynameColumn = search.createColumn({
          name: 'custrecord_ci_body_displayname'
        }),
        sizeColumn = search.createColumn({
          name: 'custrecord_ci_body_size'
        }),
        colorColumn = search.createColumn({
          name: 'custrecord_ci_body_color'
        }),
        unitstypeColumn = search.createColumn({
          name: 'custrecord_ci_body_unitstype'
        }),
        averageCostColumn = search.createColumn({
          name: 'custrecord_ci_body_average_cost'
        }),
        basePriceColumn = search.createColumn({
          name: 'custrecord_ci_body_base_price'
        }),
        availabeColumn = search.createColumn({
          name: 'custrecord_ci_body_availabe'
        }),
        observationColumn = search.createColumn({
          name: 'custrecord_ci_body_observation'
        }),
        adjustmentReasonColumn = search.createColumn({
          name: 'custrecord_ci_body_adjusment_reason'
        }),
        inStoreColumn = search.createColumn({
          name: 'custrecord_ci_body_in_store'
        }),
        differenceColumn = search.createColumn({
          name: 'custrecord_ci_body_difference'
        }),
        confiabilityColumn = search.createColumn({
          name: 'custrecord_ci_body_confiability'
        }),
        analysisColumn = search.createColumn({
          name: 'custrecord_ci_body_analysis'
        }),
        decreaseColumn = search.createColumn({
          name: 'custrecord_ci_body_decrease'
        }),
        priceAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_price_amount'
        }),
        costAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_cost_amount'
        }),
        systemAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_system_amount_cost'
        }),
        systemAmountCostColumn = search.createColumn({
          name: 'custrecord_ci_body_system_amount_cost'
        }),
        inStoreAmountColumn = search.createColumn({
          name: 'custrecord_ci_body_in_store_amount'
        }),
      ]
    });
    const pageData = itemSearch.runPaged({
      pageSize: 1000
    });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const customrecord_control_inventory_bodySearchPage = pageData.fetch({
        index: i
      });
      customrecord_control_inventory_bodySearchPage.data.forEach(function (result) {
        items.push({
          itemid: result.id,
          internalid: Number(result.getValue(itemidColumn)),
          vendor: Number(result.getValue(vendorColumn)),
          purchase_description: result.getValue(purchaseDescriptonColumn) || ' ',
          displayname: result.getValue(displaynameColumn).replace(/ : .+/, ''),
          size: result.getValue(sizeColumn) || ' ',
          color: result.getValue(colorColumn) || ' ',
          unitstype: result.getValue(unitstypeColumn) || ' ',
          average_cost: Number(result.getValue(averageCostColumn)),
          base_price: Number(result.getValue(basePriceColumn)),
          available: result.getValue(availabeColumn), //get_inventory_balance(result.id, context.location),
          observation: Number(result.getValue(observationColumn)),
          adjustment_reason: Number(result.getValue(adjustmentReasonColumn)),
          in_store: result.getValue(inStoreColumn),
          difference: result.getValue(differenceColumn),
          confiability: result.getValue(confiabilityColumn),
          analysis: result.getValue(analysisColumn) || ' ',
          decrease: !result.getValue(decreaseColumn) ? 'F' : 'T',
          price_amount: Number(result.getValue(priceAmountColumn)), //importe precio
          cost_amount: Number(result.getValue(costAmountColumn)), //importe costo
          system_amount: Number(result.getValue(systemAmountColumn)), //valor sistema
          system_amount_cost: Number(result.getValue(systemAmountCostColumn)), //valor sistema costo
          in_store_amount: Number(result.getValue(inStoreAmountColumn)), //valor fisico
          id: "0",
        });
      });
    }
    return items;
  }
  //CONSULTA AL CREAR SOLO TOTALES
  entry_point.get_count_items_by_filters = (context) => {

    let filters = [
      ['subsidiary', 'anyof', context.subsidiary],
      'AND',
      ['inventorylocation', 'anyof', context.location],
      'AND',
      ['matrix', 'is', 'F'],
      'AND',
      ['isinactive', 'is', false]
    ];

    if (context.department)
      filters.push('AND',['department', 'anyof', context.department]);

    var ubicacion = record.load({
      type: "location",
      id: context.location,
      isDynamic: false
    });

    var location_type = Number(ubicacion.getValue({
      fieldId: 'locationtype'
    })); //Acomodo-1 Tienda-4

    if (location_type === 1 || location_type === 4) {
      filters.push('AND', ['locationquantityavailable', 'notequalto', '0']);
    } else {
      filters.push('AND', ['locationquantityonhand', 'notequalto', '0']);
    }

    if (context.vendor && context.vendor[0]) filters.push('AND', ['vendor', 'anyof', context.vendor]);
    if (context.class) filters.push('AND', ['class', 'anyof', context.class]);
    if (context.internalid) filters.push('AND', ['internalid', 'anyof', context.internalid])

    const s = search.create({
      type: 'item',
      filters: filters,
      columns: [
        'itemid',
        'vendor',
        'salesdescription',
        'displayname',
        'custitem27', //talla chapur
        'custitem26', //color chapur
        'averagecost', //search.createColumn({ name: "formulacurrency", formula: "NVL({averagecost}, 0)", }),
        search.createColumn({
          name: "formulacurrency",
          formula: "NVL({baseprice}, 0)",
        }),
        'unitstype',
        'locationquantityavailable',
        'locationquantitycommitted',
        'locationquantityonhand',
      ]
    });


    log.debug('resultados sin paginar', s.runPaged().count);
    return s.runPaged().count;
  }

  entry_point.get_item_on_bin = (context) => {
    let item = {}
    search.create({
      type: 'customrecord_cha_ci_item_bin',
      filters: [
        ['custrecord_ci_itemsbins_item', 'anyof', context.itemId],
        'AND',
        ['custrecord_ci_itemsbins_folio', 'anyof', context.orderId],
        'AND',
        ["custrecord_ci_itemsbins_nombre","is", context.namefile]
      ],
      columns: [
        'custrecord_ci_itemsbins_bin'
      ]
    }).run().each(result => {
      item.id = Number(result.id)
      item.bin = result.getValue('custrecord_ci_itemsbins_bin')
    });
    return item;
  }
  entry_point.get_item_on_binUE = (context) => {
    let item = {}
    search.create({
      type: 'customrecord_cha_ci_item_bin',
      filters: [
        ['custrecord_ci_itemsbins_item', 'anyof', context.itemId],
        'AND',
        ['custrecord_ci_itemsbins_folio', 'anyof', context.orderId]
      ],
      columns: [
        {name: 'custrecord_ci_itemsbins_bin'},
        {name: 'id', sort: search.Sort.ASC}, // Ordenar por id en orden ascendente para traer el primero (antiguo)
        {name: 'custrecord_ci_itemsbins_amount'}
      ]
    }).run().each(result => {
      item.id = Number(result.id)
      item.bin = result.getValue('custrecord_ci_itemsbins_bin')
      item.quantity = Number(result.getValue('custrecord_ci_itemsbins_amount'))
    });
    return item;
  }

  function upcCodesSearch(dpto, upccodes){
    let sql;
    let upccodesList;

    try {
      upccodesList = upccodes.map(upc => `'${upc}'`).join(', ');
      sql = 
      `
      SELECT upccode 
        FROM item 
        WHERE department = `+ dpto + ` 
          AND upccode IN (`+upccodesList+`)
      `;
      let rows = query.runSuiteQL({ query: sql }).asMappedResults();
      return rows;
    } catch (e) {
      log.error({
        title: 'Error SQL getSalesTallas',
        details: 'dpto : ' + sizesList + ' error: ' + error 
      });
    }
  }


  return entry_point;
});