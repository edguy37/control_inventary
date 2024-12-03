/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name fields.js
 * @description Se definen todos los campos que se vana utilizar en el formulario deacuerdo a su grupo
 * @NApiVersion 2.1
 */

 define(['N/ui/serverWidget'], function (serverWidget) {
    const entry_point = {
        record_information: null,
        search_filter: null,
        upload_file: null,
        adjustment_reason: null,
        analysis: null,
        adjustment: null
    }
    entry_point.search_filter = (context) => {
        return {
            id: 'search_filter',
            label: 'Datos de cabecera de la orden',
            fields: [
                {
                    id: 'custpage_subsidiary',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Subsidiaria',
                    source: 'subsidiary',
                    defaultValue: ((context || {}).custpage_subsidiary || {}).value || '',
                    displayType: ((context || {}).custpage_subsidiary || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_subsidiary || {}).mandatory || true
                },
                {
                    id: 'custpage_location',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Ubicación',
                    source: 'location',
                    defaultValue: ((context || {}).custpage_location || {}).value || '',
                    displayType: ((context || {}).custpage_location || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_location || {}).mandatory || true
                },
                {
                    id: 'custpage_department',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Departamento',
                    source: 'department',
                    defaultValue: ((context || {}).custpage_department || {}).value || '',
                    displayType: ((context || {}).custpage_department || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_department || {}).mandatory || true
                },
                {
                    id: 'custpage_class', type: serverWidget.FieldType.SELECT,
                    label: 'Clase',
                    source: 'classification',
                    defaultValue: ((context || {}).custpage_class || {}).value || '',
                    displayType: ((context || {}).custpage_class || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_class || {}).mandatory || false
                },
                {
                    id: 'custpage_vendor',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Proveedor',
                    source: 'vendor',
                    defaultValue: ((context || {}).custpage_vendor || {}).value || '',
                    displayType: ((context || {}).custpage_vendor || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_vendor || {}).mandatory || false
                },
                {
                    id: 'custpage_memo',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'Memo',
                    defaultValue: ((context || {}).custpage_memo || {}).value || '',
                    displayType: ((context || {}).custpage_memo || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_memo || {}).mandatory || true
                },
                {
                    id: 'custpage_last_order_created',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'útima orden creada',
                    source: ' ',
                    defaultValue: ((context || {}).custpage_last_order_created || {}).value || '',
                    displayType: ((context || {}).custpage_last_order_created || {}).display || serverWidget.FieldDisplayType.HIDDEN,
                    isMandatory: ((context || {}).custpage_last_order_created || {}).mandatory || false
                },
            ]
        }

    }
    entry_point.record_information = (context) => {
        return {
            id: 'control_inventary',
            label: 'Detalle de la orden',
            fields: [
                {
                    id: 'custpage_folio',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'Folio',
                    defaultValue: ((context || {}).custpage_folio || {}).value || 0,
                    displayType: ((context || {}).custpage_folio || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_folio || {}).mandatory || false
                },
                {
                    id: 'custpage_folder',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'Folder',
                    defaultValue: ((context || {}).custpage_folder || {}).value || 0,
                    displayType: ((context || {}).custpage_folder || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_folder || {}).mandatory || false
                },
                {
                    id: 'custpage_status',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Estado',
                    defaultValue: ((context || {}).custpage_status || {}).value || 'Sin lecturas',
                    displayType: ((context || {}).custpage_status || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_status || {}).mandatory || false
                },
                {
                    id: 'custpage_date',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha',
                    defaultValue: ((context || {}).custpage_date || {}).value || new Date(),
                    displayType: ((context || {}).custpage_date || {}).display || serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_date || {}).mandatory || false
                }
            ]
        }
    }
    entry_point.upload_file = (context) => {
        return {
            id: '',
            label: '',
            fields: [
                {
                    id: 'custpage_file',
                    type: serverWidget.FieldType.FILE,
                    label: 'Cargar Archivo',
                    defaultValue: ((context || {}).custpage_file || {}).value || ' ',
                    displayType: ((context || {}).custpage_file || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_file || {}).mandatory || false
                },
                {
                    id: 'custpage_files',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Lecturas',
                    defaultValue: ((context || {}).custpage_files || {}).value || ' ',
                    displayType: ((context || {}).custpage_files || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_files || {}).mandatory || false
                },
            ]
        }
    }
    entry_point.adjustment_reason = (context) => {
        return {
            id: 'adjustment_reason',
            label: 'Motivos de ajuste',
            fields: [
                {
                    id: 'custpage_observation',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Observación',
                    defaultValue: ((context || {}).custpage_observation || {}).value || ' ',
                    displayType: ((context || {}).custpage_observation || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_observation || {}).mandatory || false,
                    source: 'customlist_observation_ctrl_inventary'
                },
                {
                    id: 'custpage_adjustment_reson',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Motivo de ajuste',
                    defaultValue: ((context || {}).custpage_adjustment_reson || {}).value || ' ',
                    displayType: ((context || {}).custpage_adjustment_reson || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_adjustment_reson || {}).mandatory || false,
                    source: 'customlist_reasonadjust_ctrl_inventary'
                },
            ]
        }
    }
    entry_point.analysis = (context) => {
        return {
            id: 'analisys',
            label: 'Filtros para búscar articulos en la orden',
            fields: [
                {
                    id: 'custpage_vendor_filter_all',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Seleccionar todos los proveedores',
                    displayType: serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: false,
                    layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                },
                {
                    id: 'custpage_vendor_filter',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Proveedor',
                    defaultValue: ((context || {}).custpage_vendor_filter || {}).value || ' ',
                    displayType: ((context || {}).custpage_vendor_filter || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_vendor_filter || {}).mandatory || false,
                },
                
                {
                    id: 'custpage_model_filter',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Modelo',
                    defaultValue: ((context || {}).custpage_model_filter || {}).value || ' ',
                    displayType: ((context || {}).custpage_model_filter || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_model_filter || {}).mandatory || false,
                },
                {
                    id: 'custpage_model_filter_all',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Seleccionar todos los modelos',
                    displayType: serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: false,
                    layoutType: serverWidget.FieldLayoutType.ENDROW
                },
                {
                    id: 'custpage_filter_description',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'Descripción',
                    defaultValue: ((context || {}).custpage_filter_description || {}).value || '',
                    displayType: serverWidget.FieldDisplayType.NORMAL,
                    isMandatory: ((context || {}).custpage_filter_description || {}).mandatory || false,
                }
            ]
        }
    }
    entry_point.adjustment = (context) => {
        return {
            id: 'adjustment_reason',
            label: 'Filtros para búscar articulos en la orden',
            fields: [
                {
                    id: 'custpage_observation_filter',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Observación',
                    defaultValue: ((context || {}).custpage_observation_filter || {}).value || ' ',
                    displayType: ((context || {}).custpage_observation_filter || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_observation_filter || {}).mandatory || false,
                    source: 'customlist_observation_ctrl_inventary'
                },
                {
                    id: 'custpage_adjustment_reason',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Motivo de ajuste',
                    defaultValue: ((context || {}).custpage_adjustment_reason || {}).value || ' ',
                    displayType: ((context || {}).custpage_adjustment_reason || {}).display || serverWidget.FieldDisplayType.DISABLED,
                    isMandatory: ((context || {}).custpage_adjustment_reason || {}).mandatory || false,
                    source: 'customlist_reasonadjust_ctrl_inventary'
                }
            ]
        }
    }
    entry_point.message = (context) => {
        return {
            id: '',
            label: '',
            fields: [
                {
                    id: 'custpage_helper_text',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' ',
                    defaultValue: '<div style="width:100%; font-size:16px">Al seleccionar una observación y anotar el analisis el resigtro se actualizará automaticamente</div>',
                    displayType: ((context || {}).custpage_helper_text || {}).display || serverWidget.FieldDisplayType.INLINE,
                    isMandatory: ((context || {}).custpage_helper_text || {}).mandatory || false,
                }, ,
            ]
        }
    }
    return entry_point;
});

