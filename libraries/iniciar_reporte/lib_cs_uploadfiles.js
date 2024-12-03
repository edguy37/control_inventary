/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_control_inventory.js
 * @description control de eventos en el suitelet de levantamiento de inventarios, uso de filtros y carga de archivos de lecturas
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */

define(['N/runtime', 'N/https', 'N/url', 'N/ui/dialog', 'N/search', 'N/record', 'N/currentRecord'], function (runtime, https, url, dialog, search, record, currentRecord) {
    const entry_point = {
        pageInit: (context) => { },
        saveFiles: (context) => { },
        saveRecord: (context) => { }
    }
    entry_point.pageInit = (context) => {
        const upload_field = context.currentRecord.getField({ fieldId: 'custpage_file' });
        const user = runtime.getCurrentUser();
        const files = get_files_in_order(Number(context.currentRecord.getValue('custpage_folio')));

        //se habilitan los campos de carga de archivos
        upload_field.isDisabled = false;

        context.currentRecord.getField({ fieldId: 'custpage_files' }).removeSelectOption({ value: '', });
        files.map(el => context.currentRecord.getField({ fieldId: 'custpage_files' }).insertSelectOption({ value: el.internalid, text: el.name }));
        context.currentRecord.setValue({ fieldId: 'custpage_files', value: files.map(el => el.internalid) });
        //cuando se detecta un cambio en el campo file se disparan los eventos de carga del archivo al filecabinet
        if (document.querySelector('input[name="custpage_file"]')) {
            upload_file(
                document.querySelector('input[name="custpage_file"]'),
                context.currentRecord.getValue('custpage_folder'),
                context.currentRecord.getField({ fieldId: 'custpage_files' }),
                {
                    subsidiary: context.currentRecord.getText({ fieldId: 'custpage_subsidiary' }),
                    department: context.currentRecord.getText({ fieldId: 'custpage_department' }),
                    location: context.currentRecord.getText({ fieldId: 'custpage_location' }),
                    vendor: context.currentRecord.getText({ fieldId: 'custpage_vendor' }),
                    class: context.currentRecord.getText({ fieldId: 'custpage_class' }),
                    folio: context.currentRecord.getValue({ fieldId: 'custpage_folio' }),
                    employee: user.name
                }
            );
        }
    }

    entry_point.saveFiles = function (context) {
        const _currentRecord = currentRecord.get();
        //se valida que se haya elegido al menos un archivo para vincular a la orden de levantamiento
        if (_currentRecord.getValue({ fieldId: 'custpage_files' }).length == 1 && !_currentRecord.getValue({ fieldId: 'custpage_files' })[0]) {
            dialog.alert({ title: 'ERROR...', message: 'Se debe elegir al menos un archivo de lectura' });
            return false;
        }
        //se edita el registro y el valor de los archivos cargados, 
        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: Number(_currentRecord.getValue('custpage_folio')),
            values: {
                custrecord_control_inventory_status: 'Cargando lecturas'
            }
        });
        dialog.alert({ title: 'Exito...', message: 'Se ha actualzado la orden ' + Number(_currentRecord.getValue('custpage_folio')) });
    }

    entry_point.saveRecord = function (context) {
        const _currentRecord = context.currentRecord;
        //se valida que se haya elegido al menos un archivo para vincular a la orden de levantamiento
        if (_currentRecord.getValue({ fieldId: 'custpage_files' }).length == 1 && !_currentRecord.getValue({ fieldId: 'custpage_files' })[0]) {
            dialog.alert({ title: 'Error...', message: 'Se debe elegir al menos un archivo de lectura' });
            return false;
        }
        return true;
    }

    return entry_point;

    /**
     * @param {Number} order
     * @returns {Aarray} 
     * @description Se retornan todos los archivos de text que esten en el directorio
     */
    function get_files_in_order(order) {
        let files = [];
        search.create({
            type: 'customrecord_control_inventory_files',
            filters: [
                ['custrecord_control_inventory_order', 'anyof', order]
            ],
            columns: [
                search.createColumn({ name: 'name' }),
            ],
        }).run().each(_result => {
            files.push({
                internalid: _result.id,
                name: _result.getValue('name')
            });
            return true;
        });
        return files;
    }
    /**
     * @param {HTMLElement} field_file
     * @returns {Void}
     * @description se encarga de carga el documento de lectura, y validar que no se encuentre duplicado en el filecabinet 
     */
    function upload_file(field_file, folder_id, lecture_field, order) {
        field_file.onchange = function (e) {
            const _currentRecord = currentRecord.get();
            console.log(e);
            //se valida que el archivo que se este cargando sea con extensión txt
            if (!e.target.value.match(/.+\.txt/i)) {
                e.target.value = '';
                dialog.alert({ title: 'Error...', message: 'El archivo debe ser un TXT' });
                return false;
            }
            const reader = new FileReader();
            reader.onerror = function (error) { dialog.alert({ title: 'Error...', message: error }); }

            reader.onload = function (evt) {
                const response = https.post({
                    url: url.resolveScript({ scriptId: 'customscript_rl_controlinventary', deploymentId: 'customdeploy_rl_controlinventary_1' }),
                    headers: {
                        'content-type': ' application/json'
                    },
                    body: {
                        order: order,
                        file: {
                            name: e.target.value.replace(/.*[\/\\]/, ''),
                            folder: folder_id, text:
                                btoa(evt.target.result)
                        }
                    }
                });
                e.target.value = '';
                const response_body = JSON.parse(response.body);
                //si el restlet no puede cargar el archivo entonces se regresar el error
                if (response.code !== 200 || response_body.code === 'error') {
                    dialog.alert({ title: 'Error...', message: response_body.message });
                    return false;
                }
                //se agrega el archivo recientemente cargado a la lista de archivos
                lecture_field.insertSelectOption({ value: response_body.file_id, text: response_body.file_name });
                const files_in_field = _currentRecord.getValue('custpage_files');
                _currentRecord.setValue({ fieldId: 'custpage_files', value: [] });
                //se seleccionan todos los archivos cargados
                _currentRecord.setValue({ fieldId: 'custpage_files', value: [...files_in_field, ...[`${response_body.file_id}`]] })
                //se actualiza el estado del registro a "Cargando lecturas"
                record.submitFields({
                    type: 'customrecord_order_control_inventory',
                    id: order.folio,
                    values: {
                        custrecord_control_inventory_status: 'Cargando lecturas'
                    }
                });
            }
            reader.readAsText(e.target.files[0]);
        };
    }
});