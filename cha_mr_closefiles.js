/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_mr_closefiles.js
 * @description Mapreduce para el cierre de lecturas de ordenes de levantamiento
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/record', 'N/search', 'N/runtime', './libraries/lib_items'], function (record, search, runtime, items) {
    const entry_point = {
        getInputData: null,
        map: null,
        reduce: null,
        summarize: null
    }
    entry_point.getInputData = (context) => {
        const script = runtime.getCurrentScript();
        log.debug('INPUTDATA', `PROCESANDO LA  ORDEN: ${Number(script.getParameter({ name: 'custscript_order' }))}`);
        return search.create({
            type: 'customrecord_control_inventory_files',
            filters: [
                ['custrecord_control_inventory_order', 'anyof', Number(script.getParameter({
                    name: 'custscript_order'
                }))]
            ],
            columns: [
                'custrecord_control_inventory_files_raw',
                'name',
                'custrecord_control_inventory_order'
            ]
        })
    } //en getInputData
    entry_point.map = (context) => {
        const script = runtime.getCurrentScript();
        const order = Number(script.getParameter({
            name: 'custscript_order'
        }));
        const file = JSON.parse(context.value);
        log.audit('file',file);
        const file_id = Number(file.values.custrecord_control_inventory_files_raw.value);
        items_in_file = items.get_items_by_file({
            file: file_id,
            order: order
        });

        items_in_file.map(el => {
            context.write({
                key: JSON.stringify({
                    internalid: el.internalid,
                    order: Number(file.values.custrecord_control_inventory_order.value),
                    bin: el.bin,
                    name: file.values.custrecord_control_inventory_files_raw.text
                }),
                value: el.count
            });
        })
    } //end map
    entry_point.reduce = (context) => {
        try {
            const item = JSON.parse(context.key);
            log.audit('item', item);
            item.count = context.values.reduce((result, el) => result + Number(el), 0);

            let item_line_in_order = items.get_items_by_order_detail({
                itemid: item.internalid,
                orderid: item.order
            });
            //si el articulo esta en la lectura pero no esta en la orden de levantamiento, se agrega

            if (!item_line_in_order.hasOwnProperty('lineid')) {
                add_item_to_order(item.order, items.get_item_by_itemid({
                    itemid: item.internalid,
                    orderid: item.order
                }));
                item_line_in_order = items.get_items_by_order_detail({
                    itemid: item.internalid,
                    orderid: item.order
                });
            }

            if (item_line_in_order.hasOwnProperty('lineid')) {

                create_item_bins_record({
                    order: item.order,
                    itemid: item.internalid,
                    bin: item.bin,
                    count: item.count,
                    name: item.name

                });
                let in_store = item.count + item_line_in_order.in_store;
                let in_system = item_line_in_order.in_system;
                let difference = in_store - in_system;

                const to_update_order = {
                    lineid: item_line_in_order.lineid,
                    order: item.order,
                    in_store: in_store,
                    in_system: in_system,
                    itemid: item.internalid, //internalid del articulo
                    itemname: item_line_in_order.itemname, //numart del articulo
                    difference: difference, //diferencia del fisco - sistema 
                    base_price: item_line_in_order.base_price, //precio base
                    average_cost: item_line_in_order.average_cost, //costo promedio
                    confiability: get_confiability(in_store, in_system), //porcentaje de confiabilidad
                    price_amount: Number(parseFloat(difference * item_line_in_order.base_price).toFixed(2)), //importe precio
                    cost_amount: Number(parseFloat(difference * item_line_in_order.average_cost).toFixed(2)), //importe costo
                    system_amount: Number(parseFloat(in_system * item_line_in_order.base_price).toFixed(2)), //valor sistema
                    system_amount_cost: Number(parseFloat(in_system * item_line_in_order.average_cost).toFixed(2)), //valor sistema costo
                    in_store_amount: Number(parseFloat(in_store * item_line_in_order.base_price).toFixed(2)) //valor fisico
                }
                record.submitFields({
                    type: 'customrecord_control_inventory_body',
                    id: to_update_order.lineid,
                    values: {
                        custrecord_ci_body_in_store: to_update_order.in_store,
                        custrecord_ci_body_difference: to_update_order.difference,
                        custrecord_ci_body_confiability: to_update_order.confiability,
                        custrecord_ci_body_price_amount: to_update_order.price_amount,
                        custrecord_ci_body_cost_amount: to_update_order.cost_amount,
                        custrecord_ci_body_system_amount: to_update_order.system_amount,
                        custrecord_ci_body_system_amount_cost: to_update_order.system_amount_cost,
                        custrecord_ci_body_in_store_amount: to_update_order.in_store_amount
                    },
                });
            }

        } catch (e) {
            log.error("ERROR IN REDUCE", e)
        }


    } //end reduce
    entry_point.summarize = (context) => {
        const thereAreAnyError = (context) => {
            const inputSummary = context.inputSummary;
            const mapSummary = context.mapSummary;
            const reduceSummary = context.reduceSummary;
            //si no hay errores entonces se sale del la función y se retorna false incando que no hubo errores
            if (!inputSummary.error) return false;

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
        //si no hay errores en el proceso entonces se actualiza la orden de levantamiento, cambiando el estado a lecturas cerradas
        if (!thereAreAnyError(context)) {
            const script = runtime.getCurrentScript();
            const order = Number(script.getParameter({
                name: 'custscript_order'
            }));
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: order,
                values: {
                    custrecord_control_inventory_status: 'Lecturas cerradas',
                    custrecord_cerrar_lecturas_taskid: ''
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
     * @param {Number} in_store 
     * @param {Number} in_system 
     * @returns 
     * @description devuelve el porcentaje de confiabilidad de conteo
     */
    function get_confiability(in_store, in_system) {
        if (in_store > in_system) return 0;
        if (in_store == in_system) return 100;
        if (in_store == 0) return 0;
        if (in_store < in_system) return parseFloat(Number(in_store / in_system) * 100).toFixed(2)
    }
    /**
     * @param {Ojbect} item
     * @returns {Void}
     * @description Se crea el registro de Articulos Bins,  
     */
    function create_item_bins_record(item) {

        let binRecord = items.get_item_on_bin({
            itemId: item.itemid,
            orderId: item.order
        })

        let item_bin

        if (!binRecord.id) {
            item_bin = record.create({
                type: 'customrecord_cha_ci_item_bin'
            });
        } else {
            item_bin = record.load({
                type: "customrecord_cha_ci_item_bin",
                id: binRecord.id,
                isDynamic: true
            });
        }

        item_bin.setValue({
            fieldId: 'custrecord_ci_itemsbins_folio',
            value: item.order
        });
        item_bin.setValue({
            fieldId: 'custrecord_ci_itemsbins_item',
            value: item.itemid
        });
        item_bin.setValue({
            fieldId: 'custrecord_ci_itemsbins_bin',
            value: item.bin
        });
        item_bin.setValue({
            fieldId: 'custrecord_ci_itemsbins_amount',
            value: item.count
        });
        item_bin.setValue({
            fieldId: 'custrecord_ci_itemsbins_nombre',
            value: item.name
        });

        item_bin.save();
    }
    /**
     * @param {Number} order 
     * @param {Number} item 
     * @returns 
     * @description se agrega un articulo a la orden que esta en la lectura fisica
     */
    function add_item_to_order(order, item) {

        log.debug("ITEM ADD", item)

        const item_detail = record.create({
            type: 'customrecord_control_inventory_body',
        });
        [{
                fieldId: 'custrecord_ci_body_vendor',
                value: item.vendor
            },
            {
                fieldId: 'custrecord_ci_body_itemid',
                value: item.internalid
            },
            {
                fieldId: 'custrecord_ci_body_purchase_description',
                value: item.purchase_description
            },
            {
                fieldId: 'custrecord_ci_body_displayname',
                value: item.displayname
            },
            {
                fieldId: 'custrecord_ci_body_size',
                value: item.size
            },
            {
                fieldId: 'custrecord_ci_body_color',
                value: item.color
            },
            {
                fieldId: 'custrecord_ci_body_unitstype',
                value: item.unitstype
            },
            {
                fieldId: 'custrecord_ci_body_availabe',
                value: item.availabe
            },
            {
                fieldId: 'custrecord_ci_body_in_store',
                value: item.in_store
            },
            {
                fieldId: 'custrecord_ci_body_difference',
                value: item.difference
            },
            {
                fieldId: 'custrecord_ci_body_confiability',
                value: item.confiability
            },
            {
                fieldId: 'custrecord_ci_body_analysis',
                value: item.analisys
            },
            {
                fieldId: 'custrecord_ci_body_base_price',
                value: item.base_price
            },
            {
                fieldId: 'custrecord_ci_body_average_cost',
                value: item.average_cost
            },
            {
                fieldId: 'custrecord_ci_body_price_amount',
                value: item.price_amount
            },
            {
                fieldId: 'custrecord_ci_body_cost_amount',
                value: item.cost_amount
            },
            {
                fieldId: 'custrecord_ci_body_system_amount',
                value: item.system_amount
            },
            {
                fieldId: 'custrecord_ci_body_system_amount_cost',
                value: item.system_amount_cost
            },
            {
                fieldId: 'custrecord_ci_body_in_store_amount',
                value: item.in_store_amount
            },
            {
                fieldId: 'custrecord_ci_body_vendor_text_',
                value: item.vendor_text
            },
            {
                fieldId: 'custrecord_ci_body_numart_text_',
                value: item.itemid
            },
            {
                fieldId: 'custrecord_ci_body_parent',
                value: order
            },
        ].map(el => {
            item_detail.setValue({
                fieldId: el.fieldId,
                value: el.value
            });
        });
        item_detail.save();
        return item.internalid;
    }
});