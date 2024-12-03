/**
 * @author Nestor A.
 * @Name cha_sl_convertcsvtopdf_concentrates.js
 * @description Genera el pdf de un concentrado de csv
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/controlinventory/libraries/requireConfig.json
 * @NScriptType Suitelet
 */

define(['N/render', 'N/log', 'N/record', 'N/search', 'N/file', './libraries/lib_items', 'builderConcentrate'], function (render, log, record, search, file, items, builderConcentrate) {

    const entry_point = {
        onRequest: null,
    };

    entry_point.onRequest = function (context) {

        const {
            parameters
        } = context.request;

        var lectura = record.load({
            type: "customrecord_control_inventory_files",
            id: parameters.lectura_id,
            isDynamic: true
        });

        var file_raw_id = lectura.getValue({
            fieldId: 'custrecord_control_inventory_files_raw'
        });

        var name_file = lectura.getValue({
            fieldId: 'name'
        });

        var orden = record.load({
            type: "customrecord_order_control_inventory",
            id: lectura.getValue({
                fieldId: 'custrecord_control_inventory_order'
            }),
            isDynamic: true
        });


        var location = search.lookupFields({
            type: 'location',
            id: Number(orden.getValue({
                fieldId: 'custrecord_control_inventory_location'
            })),
            columns: ['name']
        });

        var deparment = search.lookupFields({
            type: 'department',
            id: Number(orden.getValue({
                fieldId: 'custrecord_control_inventory_department'
            })),
            columns: ['name']
        });

        var fecha = orden.getValue({
            fieldId: 'custrecord_control_inventory_date'
        });

        items = items.get_items_by_file({
            file: file_raw_id,
            order: orden.id
        });

        var renderer = render.create();
        renderer.templateContent = builderConcentrate.generateXMLString(location.name, deparment.name, dateFormat(fecha), items, orden.id, name_file);

        var invoicePdf = renderer.renderAsPdf();

        invoicePdf.name = name_file + '.pdf'

        context.response.writeFile(invoicePdf); // this is a concern area     
    } //end onRequest

    function dateFormat(date) {
        year = date.getFullYear(),
            month = (date.getMonth() + 1).toString(),
            formatedMonth = (month.length === 1) ? ("0" + month) : month,
            day = date.getDate().toString(),
            formatedDay = (day.length === 1) ? ("0" + day) : day,
            hour = date.getHours().toString(),
            formatedHour = (hour.length === 1) ? ("0" + hour) : hour,
            minute = date.getMinutes().toString(),
            formatedMinute = (minute.length === 1) ? ("0" + minute) : minute,
            second = date.getSeconds().toString(),
            formatedSecond = (second.length === 1) ? ("0" + second) : second;
        return formatedDay + "/" + formatedMonth + "/" + year + " " + formatedHour + ':' + formatedMinute + ':' + formatedSecond;
    };

    return entry_point;
});