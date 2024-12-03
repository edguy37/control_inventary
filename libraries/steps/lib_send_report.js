/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_create_report.js
 * @description se construye el primer paso del levantamiento, se hace la busqueda de los articulos que coincidan con los filtros de búsqueda y se muestran en la sublista 
 * @NApiVersion 2.1
 */
define(['N/ui/serverWidget', '../lib_items'], function (widget, items) {
    const entry_point = {
        exec: null,
    }

    entry_point.exec = (context) => {
        //se obtienen aquellos articulos cuyo checkbox esta seleccionado en el paso anterior
        const { form, sublist } = context;
        const inventory_items = items.get_selected_items_in_sublist({ record: context.request });
        //se agregan los campos de carga de archivo y el campo para mostrar las lecturas cargadas
        [
            { id: 'custpage_files', type: widget.FieldType.MULTISELECT, label: 'Lecturas', container: 'control_inventary', is_mandatory: false },
            { id: 'custpage_file', type: widget.FieldType.FILE, label: 'Cargar Archivo', },
        ].map((el) => {
            let field = form.addField(el);
            if (el.hasOwnProperty('is_mandatory') && el.is_mandatory) field.isMandatory = true;
            if (el.hasOwnProperty('defaultValue')) field.defaultValue = el.defaultValue;
            if (el.hasOwnProperty('displayType')) field.updateDisplayType({ displayType: el.displayType });
        });
        inventory_items.map((el, index) => {
            [
                { id: 'vendor', value: el.vendor, line: index },
                { id: 'itemid', value: el.internalid, line: index },
                { id: 'purchase_description', value: el.purchase_description, line: index },
                { id: 'displayname', value: el.displayname, line: index },
                { id: 'size', value: el.size, line: index },
                { id: 'color', value: el.color, line: index },
                { id: 'unitstype', value: el.unitstype, line: index },
                { id: 'availabe', value: el.availabe, line: index },
                { id: 'in_store', value: el.in_store, line: index },
                { id: 'difference', value: el.difference, line: index },
                { id: 'confiability', value: el.confiability, line: index },
                { id: 'base_price', value: el.base_price, line: index },
                { id: 'average_cost', value: el.average_cost, line: index },
                { id: 'price_amount', value: el.price_amount, line: index },
                { id: 'cost_amount', value: el.cost_amount, line: index },
                { id: 'system_amount', value: el.system_amount, line: index },
                { id: 'system_amount_cost', value: el.system_amount_cost, line: index },
                { id: 'in_store_amount', value: el.in_store_amount, line: index },
            ].map(field => {
                sublist.item.setSublistValue(field);
            });
        });
        form.addSubmitButton({ label: 'Cerrar lecturas' });
        return form;
    }
    return entry_point;
});