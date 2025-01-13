/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name controlinventory.js
 * @description Suitelet para construir el formulario para el levatamiento de ordenes de inventario
 * @NApiVersion 2.1
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/encode', '../fields', '../sublist', '../lib_items'], function (serverWidget, search, record, encode, formField, formSublist, items) {
    const entry_point = {
        create_empty: (context) => { },
        upload_files: (context) => { },
        analysis: (context) => { },
        adjustment: (context) => { }
    }
    entry_point.create_empty = (context) => {
        const form = serverWidget.createForm({ title: 'Orden de levantamiento' });
        //se obtienen los grupos y campos que se agregarán al formulario
        const fields = [
            //campos filtros de búsqueda para los articulos
            formField.search_filter({
                custpage_last_order_created: {
                    value: context.order,
                },
            }),
        ];
        //se agregan los campos al formulario
        addFormFields(form, fields);
        form.addSubmitButton({ label: 'Crear orden de levantamiento' });
        //se carga el client script como modulo del suitelet
        form.clientScriptModulePath = './lib_cs_createempty.js';
        return form;
    }
    entry_point.upload_files = (context) => {
        const form = serverWidget.createForm({ title: 'Orden de levantamiento' });
        const order = getOrderMainInfo(context.order);
        //se obtienen los grupos y campos que se agregarán al formulario
        const fields = [
            //campos filtros de búsqueda para los articulos
            formField.search_filter({
                custpage_subsidiary: {
                    value: order.subsidiary,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_location: {
                    value: order.location,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_department: {
                    value: order.department,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_class: {
                    value: order.class,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_vendor: {
                    value: order.vendor,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_memo: {
                    value: order.memo,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
            }),
            //campos de la información de la orden de levantamiento
            formField.record_information({
                custpage_folio: {
                    value: context.order,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_status: {
                    value: order.status,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_date: {
                    value: order.date,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_folder: {
                    value: order.folder,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
            }),
            //campos de filtros de carga de lecturas
            formField.upload_file(),
        ];
        //se agregan los campos al formulario
        addFormFields(form, fields);
        form.addSubmitButton({ label: 'Cerrar lecturas' });
        //se carga el client script como modulo del suitelet
        form.clientScriptModulePath = './lib_cs_uploadfiles.js';
        return form;
    }
    entry_point.analysis = (context) => {
        const form = serverWidget.createForm({ title: 'Orden de levantamiento' });
        const order = getOrderMainInfo(context.order);
        //se obtienen los grupos y campos que se agregarán al formulario
        const fields = [
            //campos filtros de búsqueda para los articulos
            formField.search_filter({
                custpage_subsidiary: {
                    value: order.subsidiary,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_location: {
                    value: order.location,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_department: {
                    value: order.department,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_class: {
                    value: order.class,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_vendor: {
                    value: order.vendor,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_memo: {
                    value: order.memo,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
            }),
            //campos de la información de la orden de levantamiento
            formField.record_information({
                custpage_folio: {
                    value: context.order,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_status: {
                    value: order.status,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_date: {
                    value: order.date,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_folder: {
                    value: order.folder,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
            }),
            //campos para usar como filtros
            formField.analysis(),
        ];
        //se agregan los campos al formulario
        addFormFields(form, fields);
        //se obtiene el campo de filtro de modelo y se cargan las opciones para filtrar
        const model_filter = form.getField({ id: 'custpage_model_filter' });
        get_models_in_order(context.order).map(el => model_filter.addSelectOption({ value: el, text: el }));

        //=======================================================================================================
        //se obtiene el campo de filtro de proveedores y se cargan las opciones para filtrar
        const vendor_filter = form.getField({ id: 'custpage_vendor_filter'});
        getVendorFromOrder(context.order).map(el => vendor_filter.addSelectOption({ value: el.id, text: el.name }));
        //=======================================================================================================

        //se agrega la sublista y los campos a la sublista
        const itemSublist = formSublist.item();
        let sublist = form.addSublist({ id: itemSublist.id, type: itemSublist.type, label: itemSublist.label });
        itemSublist.fields.map(el => {
            sublist.addField({ id: el.id, type: el.type, label: el.label, source: el.source });
            let _field = form.getSublist({ id: 'items' }).getField({ id: el.id });
            _field.updateDisplayType({ displayType: el.displayType });
        });
        //si data tiene valor entonces supondremos que es un reenvio del formulario para realizar la búsqueda de artilos y crear la sublista con datos
        if (context.data) {
            let itemFilters;
            try {
                itemFilters = JSON.parse(encode.convert({ string: context.data, inputEncoding: encode.Encoding.BASE_64, outputEncoding: encode.Encoding.UTF_8 }));
            } catch (error) {
                throw 'Error en la información enviada!';
            }
            const itemsInOrder = items.get_items_by_analysis_filters({ order: context.order, vendor: itemFilters.vendor, model: itemFilters.model, description: itemFilters.description });
            itemsInOrder.map((el, index) => {
                sublist.setSublistValue({ id: 'itemid', value: el.itemid, line: index });
                sublist.setSublistValue({ id: 'internalid', value: el.internalid, line: index });
                sublist.setSublistValue({ id: 'codigo', value: el.codigo, line: index }); //PABC 03-11-22 Agregado de un nuevo campo
                sublist.setSublistValue({ id: 'vendor', value: el.vendor, line: index });
                sublist.setSublistValue({ id: 'purchase_description', value: el.purchase_description, line: index });
                sublist.setSublistValue({ id: 'displayname', value: el.displayname, line: index });
                sublist.setSublistValue({ id: 'size', value: el.size, line: index });
                sublist.setSublistValue({ id: 'color', value: el.color, line: index });
                sublist.setSublistValue({ id: 'unitstype', value: el.unitstype, line: index });
                sublist.setSublistValue({ id: 'available', value: el.available, line: index });
                sublist.setSublistValue({ id: 'in_store', value: el.in_store || 0, line: index });
                sublist.setSublistValue({ id: 'difference', value: el.difference, line: index });
                sublist.setSublistValue({ id: 'confiability', value: el.confiability, line: index });
                sublist.setSublistValue({ id: 'observation', value: el.observation, line: index });
                sublist.setSublistValue({ id: 'adjustment_reason', value: el.adjustment_reason, line: index });
                sublist.setSublistValue({ id: 'analysis', value: el.analysis, line: index });
                sublist.setSublistValue({ id: 'decrease', value: el.decrease, line: index });
                sublist.setSublistValue({ id: 'base_price', value: el.base_price, line: index });
                sublist.setSublistValue({ id: 'average_cost', value: el.average_cost, line: index });
                sublist.setSublistValue({ id: 'price_amount', value: el.price_amount, line: index });
                sublist.setSublistValue({ id: 'cost_amount', value: el.cost_amount, line: index });
                sublist.setSublistValue({ id: 'system_amount', value: el.system_amount, line: index });
                sublist.setSublistValue({ id: 'system_amount_cost', value: el.system_amount_cost, line: index });
                sublist.setSublistValue({ id: 'in_store_amount', value: el.in_store_amount, line: index });
                sublist.setSublistValue({ id: 'id', value: el.id, line: index });
            });
        }
        //se carga el client script como modulo del suitelet
        form.clientScriptModulePath = './lib_cs_analysis.js';
        form.addSubmitButton({ label: 'Finalizar análisis' });
        form.addButton({ id: 'custpage_to_print', label: 'Imprimir Analisis', functionName: 'print_order(' + context.order + ')' });
        form.addButton({ id: 'custpage_to_signature', label: 'Configurar Firmas', functionName: 'order_signatures(' + context.order + ')' });
        form.addButton({ id: 'custpage_backToOrder', label: 'Volver a la orden', functionName: 'backToOrder' });
        sublist.addButton({id: 'custpage_markall', label: 'Marcar/Desmarcar merma', functionName: 'markall'});
        sublist.addButton({ id: 'custpage_getitems', label: 'Actualizar lista de artículos', functionName: 'updateSublistItem' });
        return form;
    }
    entry_point.adjustment = (context) => {
        const form = serverWidget.createForm({ title: 'Orden de levantamiento' });
        const order = getOrderMainInfo(context.order);
        //se obtienen los grupos y campos que se agregarán al formulario
        const fields = [
            //campos filtros de búsqueda para los articulos
            formField.search_filter({
                custpage_subsidiary: {
                    value: order.subsidiary,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_location: {
                    value: order.location,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_department: {
                    value: order.department,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_class: {
                    value: order.class,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_vendor: {
                    value: order.vendor,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_memo: {
                    value: order.memo,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                }
            }),
            //campos de la información de la orden de levantamiento
            formField.record_information({
                custpage_folio: {
                    value: context.order,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_status: {
                    value: order.status,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_date: {
                    value: order.date,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },
                custpage_folder: {
                    value: order.folder,
                    display: serverWidget.FieldDisplayType.INLINE,
                    mandatory: true
                },//CUM 04Nov2021
                custpage_memo_2: {
                    value: order.memo,
                    display: serverWidget.FieldDisplayType.NORMAL,
                    mandatory: false
                }
            }),

        ];
        //se agrega la sublista y los campos a la sublista
        const itemSublist = formSublist.item({
            analysis: { display: serverWidget.FieldDisplayType.NORMAL },
            observation: { display: serverWidget.FieldDisplayType.INLINE },
            adjustment_reason: { display: serverWidget.FieldDisplayType.NORMAL },
            decrease: { display: serverWidget.FieldDisplayType.DISABLED }
        });
        let sublist = form.addSublist({ id: itemSublist.id, type: itemSublist.type, label: itemSublist.label });
        itemSublist.fields.map(el => {
            sublist.addField({ id: el.id, type: el.type, label: el.label, source: el.source });
            let _field = form.getSublist({ id: 'items' }).getField({ id: el.id });
            _field.updateDisplayType({ displayType: el.displayType });
        });
        //si data tiene valor entonces supondremos que es un reenvio del formulario para realizar la búsqueda de artilos y crear la sublista con datos
        if (context.data) {
            let itemFilters;
            try {
                itemFilters = JSON.parse(encode.convert({ string: context.data, inputEncoding: encode.Encoding.BASE_64, outputEncoding: encode.Encoding.UTF_8 }));
            } catch (error) {
                throw 'Error en la información enviada!';
            }
            fields.push(
                formField.adjustment({
                    custpage_observation_filter: {
                        value: itemFilters.observation
                    }
                })
            );
            const itemsInOrder = items.get_items_by_adjustment_filters({ order: context.order, observation: itemFilters.observation });
            itemsInOrder.map((el, index) => {
                sublist.setSublistValue({ id: 'itemid', value: el.itemid, line: index });
                sublist.setSublistValue({ id: 'internalid', value: el.internalid, line: index });
                sublist.setSublistValue({ id: 'vendor', value: el.vendor, line: index });
                sublist.setSublistValue({ id: 'purchase_description', value: el.purchase_description, line: index });
                sublist.setSublistValue({ id: 'displayname', value: el.displayname, line: index });
                sublist.setSublistValue({ id: 'size', value: el.size, line: index });
                sublist.setSublistValue({ id: 'color', value: el.color, line: index });
                sublist.setSublistValue({ id: 'unitstype', value: el.unitstype, line: index });
                sublist.setSublistValue({ id: 'available', value: el.available, line: index });
                sublist.setSublistValue({ id: 'in_store', value: el.in_store, line: index });
                sublist.setSublistValue({ id: 'difference', value: el.difference, line: index });
                sublist.setSublistValue({ id: 'confiability', value: el.confiability, line: index });
                sublist.setSublistValue({ id: 'observation', value: el.observation, line: index });
                sublist.setSublistValue({ id: 'adjustment_reason', value: el.adjustment_reason, line: index });
                sublist.setSublistValue({ id: 'analysis', value: el.analysis, line: index });
                sublist.setSublistValue({ id: 'decrease', value: el.decrease, line: index });
                sublist.setSublistValue({ id: 'base_price', value: el.base_price, line: index });
                sublist.setSublistValue({ id: 'average_cost', value: el.average_cost, line: index });
                sublist.setSublistValue({ id: 'price_amount', value: el.price_amount, line: index });
                sublist.setSublistValue({ id: 'cost_amount', value: el.cost_amount, line: index });
                sublist.setSublistValue({ id: 'system_amount', value: el.system_amount, line: index });
                sublist.setSublistValue({ id: 'system_amount_cost', value: el.system_amount_cost, line: index });
                sublist.setSublistValue({ id: 'in_store_amount', value: el.in_store_amount, line: index });
                sublist.setSublistValue({ id: 'id', value: el.id, line: index });
            });
        } else {
            fields.push(formField.adjustment());
        }
        //se agregan los campos al formulario
        addFormFields(form, fields);
        //se carga el client script como modulo del suitelet
        form.clientScriptModulePath = './lib_cs_adjustment.js';
        form.addSubmitButton({ label: 'Finalizar ajuste' });
        form.addButton({ id: 'custpage_backToOrder', label: 'Volver a la orden', functionName: 'backToOrder' });
        sublist.addButton({ id: 'custpage_upadte_reason', label: 'Actualizar motivo de ajuste', functionName: 'updateReasonInSublist' });
        return form;
    }
    return entry_point;

    /**
     * @param {Object} form
     * @returns {Void}
     * @description Se agregan los campos al formulario
     */
    function addFormFields(form, fields) {
        fields.map(container => {
            //se crea el fieldgroup de como irán ordenados los campos en el formulario
            if (container.id) form.addFieldGroup({ id: container.id, label: container.label });
            container.fields.map(el => {
                //se crea cada campo y se actualizan sus propiedades
                let field = form.addField({ id: el.id, type: el.type, label: el.label, source: el.source, container: container.id });
                field.isMandatory = el.isMandatory;
                field.defaultValue = el.defaultValue;
                field.updateDisplayType({ displayType: el.displayType });
                if(el.hasOwnProperty('layoutType')) field.updateLayoutType({ layoutType: el.layoutType});
                if (el.hasOwnProperty('displaySize')) field.updateDisplaySize(el.displaySize)
            });
        });
    }
    /**
     * @param {Number} orderId
     * @returns {Object}
     * @description se obtiene la información de cabecera del registro de la orden de levantamiento
     */
    function getOrderMainInfo(orderId) {
        const orderMainInfo = search.lookupFields({
            type: 'customrecord_order_control_inventory',
            id: orderId,
            columns: [
                'internalid',
                'custrecord_control_inventory_date',
                'custrecord_control_inventory_subsidiary',
                'custrecord_control_inventory_location',
                'custrecord_control_inventory_department',
                'custrecord_control_inventory_class',
                'custrecord_control_inventory_vendor',
                'custrecord_control_inventory_status',
                'custrecord_control_inventory_memo'
            ]
        });
        return {
            subsidiary: orderMainInfo.custrecord_control_inventory_subsidiary[0].value,
            location: orderMainInfo.custrecord_control_inventory_location[0].value,
            department: (orderMainInfo.custrecord_control_inventory_department[0] || {}).value,
            class: orderMainInfo.custrecord_control_inventory_class.length ? orderMainInfo.custrecord_control_inventory_class[0].value : '',
            vendor: orderMainInfo.custrecord_control_inventory_vendor.length ? orderMainInfo.custrecord_control_inventory_vendor[0].value : '',
            status: orderMainInfo.custrecord_control_inventory_status,
            folder: get_folder(orderId),
            date: orderMainInfo.custrecord_control_inventory_date,
            memo: orderMainInfo.custrecord_control_inventory_memo,
        }
    }
    /**
     * @param {Number} folio
     * @returns {Number}
     * @description Se hace la búsqueda del folio correpondiente a la orden de levantamiento para inciar/continuar con la carga de los archivos de lectura
     */
    function get_folder(folio) {
        let folder = 0;

        search.create({
            type: 'folder',
            filters: [
                //['parent', 'is', 2321],
                //['parent', 'is', 196736], // id SB3
                ['parent', 'is', 490949],
                'AND',
                ['name', 'is', `levantamiento ci-${folio}`]
            ]
        }).run().each(el => {
            folder = el.id
        });

        return folder || create_folder(folio, 490949);
    }
    /**
     * @param {Number} folio
     * @param {Number} parent
     * @return {Number}
     * @description Crea un folder para guardar las lecturas de inventario relacionadas al folio de la orden de levantamiento
     */
    function create_folder(folio, parent) {
        const folder = record.create({ type: record.Type.FOLDER, isDynamic: true });
        folder.setValue({ fieldId: 'name', value: `levantamiento ci-${folio}` });
        folder.setValue({ fieldId: 'parent', value: parent });

        return folder.save({ enableSourcing: true, ignoreMandatoryFields: true });
    }
    function get_models_in_order(folio) {
        const model = [];
        const model_search = search.create({
            type: 'customrecord_control_inventory_body',
            filters: [
                ['custrecord_ci_body_parent', 'is', folio]
            ],
            columns: [
                modelColumn = search.createColumn({ name: 'custrecord_ci_body_displayname', summary: search.Summary.GROUP })
            ]
        });
        const pageData = model_search.runPaged({ pageSize: 1000 });
        for (let i = 0; i < pageData.pageRanges.length; i++) {
            const page = pageData.fetch({ index: i });
            page.data.forEach((result) => {
                model.push(result.getValue(modelColumn));
            });
        }
        return model;
    }
    /*
    function getVendorFromOrder(orderId) {
        let vendor = [];
        const vendorSearch = search.create({
          type: 'customrecord_control_inventory_body',
          filters: [
            'custrecord_ci_body_parent', 'anyof', orderId
          ],
          columns: [
            vendorColumn = search.createColumn({ name: 'custrecord_ci_body_vendor_text_', summary: search.Summary.GROUP
            })
          ]
        });
        const pageData = vendorSearch.runPaged({ pageSize: 1000 });
        for (let i = 0; i < pageData.pageRanges.length; i++) {
          const customrecord_control_inventory_bodySearchPage = pageData.fetch({ index: i });
          customrecord_control_inventory_bodySearchPage.data.forEach(function (result) {
            vendor.push(result.getValue(vendorColumn));
          });
        }
        return vendor;
    }*/
   
    /**
   * @param {Number} orderId
   * @returns {Array} 
   * @description Se obtienen todos los proveedores según los articulos en la orden de levantamiento
   */
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
});