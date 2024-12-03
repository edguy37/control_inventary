/**
 * Provides click handler for impresion button on Item Inventory
 * 
 * @author Nestor Avila
 *
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @NAmdConfig /SuiteScripts/controlinventory/AjusteDeInventario/requireConfig.json
 */

define(['N/url', 'swal'], function (url, Swal) {

    var exports = {};

    var urlGif = "https://5256282.app.netsuite.com/core/media/media.nl?id=1008026&c=5256282&h=NbdUYfwz7-SVBQ02zpdmeByWUN0gxQZmnWod5h_MmWmK4EPV";

    function pageInit() {}

    function printReport(recordID) {
        try{

           Swal.fire({
                title: 'Generando:',
                text: 'Se está generando tu reporte...',
                imageUrl: urlGif,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                
            }); 

            const _resolve = url.resolveScript({
                scriptId: 'customscriptcha_sl_render_pdf',
                deploymentId: 'customdeploycha_sl_render_pdf',
                params: { ajuste_id: recordID }
             });       
                                

            setTimeout(function () {
                Swal.close();

                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: 'Reporte Creado',
                    showConfirmButton: false,
                    timer: 5000
                  })

                window.open(_resolve);
            }, 2000)
        
            
        }catch(e){
            Swal.close();

            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: e,
            })


            log.error({
                title: 'ERROR IN PROCESS',
                details: e
            });
        }                    
    }


    exports.printReport = printReport;
    exports.pageInit = pageInit;
    return exports;
});