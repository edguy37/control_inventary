/**
 * @author Nestor A.
 * @Name cha_sl_render_pdf.js
 * @description Genera el pdf del ajuste de inventario
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/controlinventory/AjusteDeInventario/requireConfig.json
 * @NScriptType Suitelet
 */

define(['N/render', 'N/log', 'N/record', 'N/search', 'templateBuilder', 'utilitiesString'], function (render, log, record, search, templateBuilder, utilitiesString) {
    const entry_point = {
        onRequest: null,
    };

    entry_point.onRequest = function (context) {
        const {
            parameters
        } = context.request;

        var ajuste = record.load({
            type: "inventoryadjustment",
            id: parameters.ajuste_id,
            isDynamic: true
        });

        var createBy = search.lookupFields({
            type: 'inventoryadjustment',
            id: ajuste.id,
            columns: ['createdby']
        });

        var user = createBy.createdby[0] ? createBy.createdby[0].text : "SIN INFORMACIÓN";
        var currentDate = dateFormat(new Date());
        var numDoc = ajuste.getValue({
            fieldId: 'tranid'
        });
        var tranDate = dateFormat(ajuste.getValue({
            fieldId: 'trandate'
        }));
        var observaciones = ajuste.getValue({
            fieldId: 'memo'
        });

        var motivo = search.lookupFields({
            type: 'customrecord_inventory_adjustment_reason',
            id: Number(ajuste.getValue({
                fieldId: 'custbody_bex_motivo_ajuste'
            })),
            columns: ['name']
        });

        motivo = motivo.name ? motivo.name : "SIN INFORMACIÓN";

        ajuste.getValue({
            fieldId: 'custbody_bex_motivo_ajuste'
        });
        var lineasArticulos = ajuste.getLineCount({
            sublistId: 'inventory'
        });

        log.debug({
            title: 'ARTICULOS',
            details: [lineasArticulos]
        });

        /*if (lineasArticulos > 65)
            throw "Demasiados Articulos.... Solo se permite generar reportes con un maximo de 64 lineas";*/

        var datosArticulos = [];

        let acumulado = {
            cantidad_ajuste: 0,
            cantidad_impt_vnta: 0,
            cantidad_impt_cost: 0,
            cantidad_preci_uni: 0
        }

        for (var i = 0; i < lineasArticulos; i++) {

            var current_articulo = ajuste.selectLine({
                sublistId: "inventory",
                line: i
            });

            var item_id = current_articulo.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "item"
            });

            var item = record.load({
                type: "inventoryitem",
                id: item_id,
                isDynamic: true
            });

            var merida_price_line = item.selectLine({
                sublistId: 'price1',
                line: item.findSublistLineWithValue({
                    sublistId: 'price1',
                    fieldId: 'pricelevelname',
                    value: 'Mérida'
                })
            });

            var merida_price = merida_price_line.getCurrentSublistValue({
                sublistId: "price1",
                fieldId: "price_1_"
            });

            var description = utilitiesString.fixUnescapedCharacters(current_articulo.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "description"
            }));//CUM 05Abril2022
            var cantidad_ajuste = Number(current_articulo.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "adjustqtyby"
            }));
            var costo_venta = parseFloat(current_articulo.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "avgunitcost"
            })).toFixed(2);
            var importe_venta = parseFloat(cantidad_ajuste * costo_venta).toFixed(2);

            var costo_promedio = search.lookupFields({
                type: 'inventoryitem',
                id: Number(current_articulo.getCurrentSublistValue({
                    sublistId: "inventory",
                    fieldId: "item"
                })),
                columns: ['averagecost']
            });

            var importe_costo_promedio = parseFloat(cantidad_ajuste * parseFloat(Number(merida_price)).toFixed(4)).toFixed(2);

            locacion = current_articulo.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "location_display"
            });

            datosArticulos[i] = [
                item.getValue({
                    fieldId: 'itemid'
                }), description, cantidad_ajuste, importe_venta, importe_costo_promedio, costo_venta, motivo
            ];

            acumulado.cantidad_ajuste += Number(cantidad_ajuste)
            acumulado.cantidad_impt_vnta += Number(importe_venta)
            acumulado.cantidad_impt_cost += Number(importe_costo_promedio)
            acumulado.cantidad_preci_uni += Number(costo_venta)
        }

        log.debug({
            title: 'ARTICULOS',
            details: datosArticulos
        });

        log.debug({
            title: 'DATA',
            details: [user, currentDate, numDoc, tranDate, locacion, observaciones]
        });

        //CUM 20Abri2022: Validar si cantidad ajuste tiene decimales y aplicar toFixed
        if(acumulado.cantidad_ajuste % 1 !== 0){
            acumulado.cantidad_ajuste = parseFloat(acumulado.cantidad_ajuste).toFixed(3);
        }
    
        acumulado.cantidad_impt_vnta =  acumulado.cantidad_impt_vnta.toFixed(2)
        acumulado.cantidad_impt_cost = acumulado.cantidad_impt_cost.toFixed(2)
        acumulado.cantidad_preci_uni = acumulado.cantidad_preci_uni.toFixed(2)

           
        var stringXML =
            templateBuilder.generateXMLString(user, currentDate, numDoc, tranDate, locacion, datosArticulos, observaciones, acumulado);

        /*log.debug({
            title: 'DATA',
            details: stringXML
        });*/

        context.response.renderPdf({
            xmlString: stringXML
        });

    } 


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


        var dateFormed = formatedDay + "/" + formatedMonth + "/" + year;
        var timerFormed = formatedHour + ':' + formatedMinute + ':' + formatedSecond

        if(timerFormed != "00:00:00")
            return dateFormed + " "  + timerFormed

        return dateFormed;
    };

    return entry_point;

});