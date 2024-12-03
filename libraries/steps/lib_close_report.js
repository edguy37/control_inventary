/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_close_report.js
 * @description se construye el primer paso del levantamiento, se hace la busqueda de los articulos que coincidan con los filtros de búsqueda y se muestran en la sublista 
 * @NApiVersion 2.1
 */
define(['N/ui/serverWidget', '../lib_items'], function (widget, items) {
    const entry_point = {
        exec: null,
    }

    entry_point.exec = (context) => {
        let line = 0;
        const { parameters, form, sublist } = context;
        const in_store = items.get_items_in_file({ folder_id: parameters.custpage_folder });
        const field_status = form.getField({ id: 'custpage_status' });
        field_status.defaultValue = 'Pendiente';

        //se obtienen aquellos articulos cuyo checkbox esta seleccionado en el paso anterior
        const inventory_items = items.get_selected_items_in_sublist({ record: context.request });

        form.addFieldGroup({ id: 'control_inventary_filters', label: 'Aplicar filtros a artículos' });
        [
            { id: 'custpage_filter_displayname', type: widget.FieldType.MULTISELECT, label: 'Filtro modelo', container: 'control_inventary_filters', is_mandatory: false },
            { id: 'custpage_filter_color', type: widget.FieldType.MULTISELECT, label: 'Filtro color', container: 'control_inventary_filters', is_mandatory: false },
            { id: 'custpage_filter_average_cost', type: widget.FieldType.MULTISELECT, label: 'Filtro costo promedio', container: 'control_inventary_filters', is_mandatory: false },
            { id: 'custpage_filter_difference', type: widget.FieldType.MULTISELECT, label: 'Filtro diferencia', container: 'control_inventary_filters', is_mandatory: false },
            { id: 'custpage_filter_description', type: widget.FieldType.MULTISELECT, label: 'Filtro descripción', container: 'control_inventary_filters', is_mandatory: false },
        ].map((el) => {
            let field = form.addField(el);
            if (el.hasOwnProperty('is_mandatory') && el.is_mandatory) field.isMandatory = true;
            if (el.hasOwnProperty('defaultValue')) field.defaultValue = el.defaultValue;
            if (el.hasOwnProperty('displayType')) field.updateDisplayType({ displayType: el.displayType });
        });

        inventory_items.map((el) => {
            let in_store_quantity = in_store.reduce((result, item) => {
                if (el.internalid == item.internalid) result = item.count;
                return result;
            }, 0);
            if (in_store_quantity !== 0 || el.availabe !== 0 && (in_store_quantity - el.availabe) !== 0) {
                [
                    { id: 'vendor', value: el.vendor, line: line },
                    { id: 'itemid', value: el.internalid, line: line },
                    { id: 'purchase_description', value: el.purchase_description, line: line },
                    { id: 'displayname', value: el.displayname, line: line },
                    { id: 'size', value: el.size, line: line },
                    { id: 'color', value: el.color, line: line },
                    { id: 'unitstype', value: el.unitstype, line: line },
                    { id: 'availabe', value: el.availabe, line: line },
                    { id: 'in_store', value: in_store_quantity, line: line },
                    { id: 'difference', value: in_store_quantity - el.availabe, line: line },
                    { id: 'confiability', value: isFinite((1 - (Math.abs(in_store_quantity - el.availabe) / in_store_quantity)) || 0) ? Math.abs((1 - ((in_store_quantity - el.availabe) / in_store_quantity))) || 0 : 0, line: line },
                    { id: 'base_price', value: el.base_price, line: line },
                    { id: 'average_cost', value: el.average_cost, line: line },
                    { id: 'price_amount', value: (in_store_quantity - el.availabe) * el.base_price, line: line },
                    { id: 'cost_amount', value: (in_store_quantity - el.availabe) * el.average_cost, line: line },
                    { id: 'system_amount', value: el.system_amount, line: line },
                    { id: 'system_amount_cost', value: el.system_amount_cost, line: line },
                    { id: 'in_store_amount', value: el.base_price * in_store_quantity, line: line },
                ].map(field => {
                    sublist.item.setSublistValue(field);
                });
                line++;
            }
        });
        form.addSubmitButton({ label: 'Completar recuento' });
        return form;
    }
    return entry_point;
});