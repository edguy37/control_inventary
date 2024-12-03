/**
 * @author Nestor Avila
 * @Name cha_ue_ajuste_inventario_reporte.js
 * @description Boton para imprimir el ajuste de inventario
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define([], function () {

    var exports = {};

    function beforeLoad(context) {

        if(context.type == context.UserEventType.VIEW){

            context.form.addButton({
                id: "custpage_mybutton",
                label: "Imprimir Reporte",
                functionName: 'printReport('+ context.newRecord.id.toString() + ')'
            });
            
            context.form.clientScriptModulePath = "SuiteScripts/controlinventory/AjusteDeInventario/button_impresion_handler.js";
        }      
    }

    exports.beforeLoad = beforeLoad;
    return exports;
});