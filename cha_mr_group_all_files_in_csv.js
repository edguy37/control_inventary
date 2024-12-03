/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_mr_group_all_files_in_csv.js
 * @description Se crea archivo de concentrado de lecturas
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/record', 'N/search', 'N/runtime', './libraries/lib_items', 'N/file'], function (record, search, runtime, items, file) {
    const entry_point = {
        getInputData: null,
        map: null,
        reduce: null,
        summarize: null
    }
    entry_point.getInputData = (context) => {
        const script = runtime.getCurrentScript();
        const order = Number(script.getParameter({ name: 'custscript_order_number' }));
        log.debug('CHA_MR_GROUP_ALL_FILES_IN_CSV order', order);
        const document_id = get_file_id(order, get_folder(order));
        log.debug('CHA_MR_GROUP_ALL_FILES_IN_CSVdocument_id', document_id);
        if (document_id) file.delete({ id: document_id });
        //log.debug('INPUTDATA', `PROCESANDO LA  ORDEN: ${Number(script.getParameter({ name: 'custscript_order' }))}`);
        return search.create({
            type: 'customrecord_control_inventory_files',
            filters: [
                ['custrecord_control_inventory_order', 'anyof', order]
            ],
            columns: [
                'custrecord_control_inventory_files_raw',
                'custrecord_control_inventory_order'
            ]
        });
    }//en getInputData
    entry_point.map = (context) => {
        log.debug('json parse context.value',JSON.parse(context.value));
        const script = runtime.getCurrentScript();
        const order = Number(script.getParameter({ name: 'custscript_order_number' }));
        const file = JSON.parse(context.value);
        const file_id = Number(file.values.custrecord_control_inventory_files_raw.value);
        items_in_file = items.get_items_by_file({ file: file_id, order: order});

        items_in_file.map(el => {
            context.write({
                key: JSON.stringify({
                    file: el.file,
                    internalid: el.internalid,
                    order: Number(file.values.custrecord_control_inventory_order.value),
                    bin: el.bin,
                    itemid: el.itemid,
                    vendor: el.vendor,
                    salesdescription: el.salesdescription,
                    displayname: el.displayname,
                    size: el.size,
                    color: el.color,
                    average_cost: el.average_cost,
                    base_price: el.base_price,
                    unitstype: el.unitstype
                }),
                value: el.count
            });
        })
    }//end map
    entry_point.reduce = (context) => {
        const item = JSON.parse(context.key);
        item.count = context.values.reduce((result, el) => result + Number(el), 0);
        let item_in_file;
        try {
            //item_in_file = file.load({ id: `Lecturas Control de Inventarios/lentamiento ci-${item.order}/Concentrado lecturas levantamiento #${item.order}.csv` });
            item_in_file = file.load({ id: `AUDITORIA/Ordenes de levantamiento/levantamiento ci-${item.order}/Concentrado lecturas levantamiento #${item.order}.csv` });
            item_in_file.appendLine({
                value: `${parseInt(item.vendor)},${item.itemid.replace(/.+ : /, '')}, ${item.displayname}, ${item.size}, ${item.color}, ${item.salesdescription.trim()}, ${item.count}, ${item.average_cost}, ${item.average_cost * item.count}, ${item.order}, ${item.bin}, ${item.file}`
            });
            item_in_file.save()
        } catch (e) {
            //si el archivo ya no existe, se crea uno nuevo por cada petición de archivo de lecturas agrupadas
            file.create({
                name: `Concentrado lecturas levantamiento #${item.order}.csv`,
                fileType: file.Type.CSV,
                contents: `PROVEEDOR, NUMART,MODELO, TALLA, COLOR, DESCRIPCIÓN, LEIDO, COSTO PROMEDIO, COSTO TOTAL, FOLIO, BIN, LECTURA\r\n${item.vendor},${item.itemid}, ${item.displayname}, ${item.size}, ${item.color}, ${item.salesdescription}, ${item.count}, ${item.average_cost}, ${item.average_cost * item.count}, ${item.order}, ${item.bin}, ${item.file}\r\n`,
                encoding: file.Encoding.UTF8,
                folder: get_folder(item.order),
                isOnline: true
            }).save();
        }
    }//end reduce
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
        //si no hay errores en el proceso entonces se actualiza la orden de levantamiento, agregando el archivo consolidado
        if (!thereAreAnyError(context)) {
            const script = runtime.getCurrentScript();
            const order = Number(script.getParameter({ name: 'custscript_order_number' }));
            log.debug('summarize getFolder', get_folder(order));
            log.debug('summarize get_file_id',get_file_id(order, get_folder(order)));
            record.submitFields({
                type: 'customrecord_order_control_inventory',
                id: order,
                values: {
                    custrecord_control_inventory_file: get_file_id(order, get_folder(order)),
                    custrecord_archivo_concentrado_taskid: ''
                }
            });
        }
        log.audit('Summary', [
            { title: 'Usage units consumed', details: context.usage },
            { title: 'Concurrency', details: context.concurrency },
            { title: 'Number of yields', details: context.yields }
        ]);
    }//end summarize

    return entry_point;
    /**
    * @param {Number} folio 
    * @returns {Number}
    * @description Se hace la búsqueda del folio correpondiente a la orden de levantamiento para inciar/continuar con la carga de los archivos de lectura 
    */
    function get_folder(folio) {
        //funcion que obtiene el ID de la carpeta de la orden de levantamiento
        let folder = 0;
        //490949 - ID carpeta "Ordenes de levantamiento"
        search.create({
            type: 'folder',
            filters: [
                ['parent', 'is', 490949],
                'AND',
                ['name', 'is', `levantamiento ci-${folio}`]
            ]
        }).run().each(el => {
            folder = el.id
        });

        return folder;
    }
    /**
     * @param {*} order 
     * @param {*} folio 
     * @returns 
     */
    function get_file_id(order, folio) {
        let file_id = 0;
        search.create({
            type: 'file',
            filters: [
                ['name', 'is', `Concentrado lecturas levantamiento #${order}.csv`],
                'AND',
                ['folder', 'anyof', folio],
            ]
        }).run().each(result => {
            file_id = result.id
        });
        return file_id;
    }
});