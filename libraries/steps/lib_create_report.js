/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_create_report.js
 * @description se construye el primer paso del levantamiento, se hace la busqueda de los articulos que coincidan con los filtros de búsqueda y se muestran en la sublista 
 * @NApiVersion 2.1
 */
define(['N/record', '../lib_items'], function (record, items) {
    const entry_point = {
        exec: null,
    }
    entry_point.exec = (context) => {
        const { form, parameters, sublist } = context;
        //se crea un registro para asignar como folio a la nueva orden de lavantamiento
        const control_inventary_record_id = create_inventory_control_record(parameters);
        const field_folio = form.getField({ id: 'custpage_folio' });
        //se crea el folder donde se estarán almacenando las lecturas de la orden de lavantamiento
        const field_folder = form.getField({ id: 'custpage_folder' });
        field_folder.defaultValue = create_folder(control_inventary_record_id);
        field_folio.defaultValue = control_inventary_record_id;
        //se agrea el botón de marcar/desmarcar todo
        sublist.item.addMarkAllButtons();
        //se obtienen los articulos segun los filtros ingresados en el formulario
        const inventory_items = items.get_items_by_filters({ subsidiary: parameters.custpage_subsidiary, location: parameters.custpage_location, department: parameters.custpage_department, class: parameters.custpage_class, vendor: parameters.custpage_vendor });
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
                { id: 'in_store', value: 0, line: index },
                { id: 'difference', value: el.availabe - 0, line: index },
                { id: 'confiability', value: (1 - (Math.abs(el.availabe - 0) / el.availabe)) || 0, line: index },
                { id: 'base_price', value: el.base_price, line: index },
                { id: 'average_cost', value: el.average_cost, line: index },
                { id: 'price_amount', value: (el.availabe - 0) * el.base_price, line: index },
                { id: 'cost_amount', value: (el.availabe - 0) * el.average_cost, line: index },
                { id: 'system_amount', value: el.availabe * el.base_price, line: index },
                { id: 'system_amount_cost', value: el.availabe * el.average_cost, line: index },
                { id: 'in_store_amount', value: el.base_price * 0, line: index }
            ].map(field => {
                sublist.item.setSublistValue(field);
            })
        });
        form.addSubmitButton({ label: 'Enviar' });
        return form;
    }

    return entry_point;

    /**
     * @param {Object} parameters 
     * @returns {Number}
     * @description Se crea el record para asignar un folio al levantamiento de la lectura de inventarios
     */
    function create_inventory_control_record(parameters) {
        const control_inventary = record.create({ type: 'customrecord_order_control_inventory' });
        [
            { fieldId: 'custrecord_control_inventory_subsidiary', value: parameters.custpage_subsidiary },
            { fieldId: 'custrecord_control_inventory_location', value: parameters.custpage_location },
            { fieldId: 'custrecord_control_inventory_department', value: parameters.custpage_department },
            { fieldId: 'custrecord_control_inventory_class', value: parameters.custpage_class },
            { fieldId: 'custrecord_control_inventory_vendor', value: parameters.custpage_vendor },
            { fieldId: 'custrecord_control_inventory_status', value: parameters.custpage_status },
            { fieldId: 'custrecord_control_inventory_date', value: new Date() },
        ].map(el => {
            control_inventary.setValue(el);
        });
        return control_inventary.save();
    }
    /**
     * @param {Number} folio
     * @return {Number} 
     * @description Crea un folder para guardar las lecturas de inventario relacionadas al folio de la orden de levantamiento
     */
    function create_folder(folio) {
        const folder = record.create({ type: record.Type.FOLDER, isDynamic: true });
        folder.setValue({ fieldId: 'name', value: `lentamiento ci-${folio}` });
        folder.setValue({ fieldId: 'parent', value: 1981 });

        return folder.save({ enableSourcing: true, ignoreMandatoryFields: true });
    }
});