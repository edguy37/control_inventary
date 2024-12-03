/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_sl_printanalysis.js
 * @description Genera el pdf de la impresion del ajuste de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/render', 'N/file', 'N/record', 'N/format', 'N/https', 'N/search'], function (render, file, record, format, https, search) {
   const entry_point = {
      onRequest: null,
   };

   entry_point.onRequest = function (context) {
      const {
         parameters
      } = context.request;

      const order = get_order_data(parameters.order);

      const template = file.load('./templates/inventory_control_order_read_close.xml');

      const page = render.create();

      var ajusteIDList = "1,2,5,6,8";
      var seguimientoDList = "3,4,7,9";

      var items_ajust = get_items_from_order(parameters.order, ajusteIDList);
      var items_fallow = get_items_from_order(parameters.order, seguimientoDList);
     
     log.audit('items_ajust',items_ajust.length +typeof(items_ajust));
     log.audit('items_fallow',items_fallow.length + typeof(items_fallow));

      page.templateContent = template.getContents();
      
      if(items_fallow.length !==0 && items_ajust.length !==0 ){
         page.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'order',
            data: {
               folio: order.folio,
               location: order.location,
               department: order.department,
               vendor: order.vendor.replace(/&/g, "&amp;").trim(),
               date: order.date,
               detail_ajust: items_ajust,
               detail_fallow: items_fallow,
               floor: order.floor,
               store: order.store,
               audit: order.audit,
               ajust_totals: {
                  total_items: items_ajust.length,
                  total_store: items_ajust.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_ajust.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_ajust.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_ajust.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               },
               fallow_totals: {
                  total_items: items_fallow.length,
                  total_store: items_fallow.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_fallow.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_fallow.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_fallow.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               }
   
            }
         });
      }
      if(items_ajust.length === 0 && items_fallow.length !== 0){
         page.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'order',
            data: {
               folio: order.folio,
               location: order.location,
               department: order.department,
               vendor: order.vendor.replace(/&/g, "&amp;").trim(),
               date: order.date,
               //detail_ajust: items_ajust,
               detail_fallow: items_fallow,
               floor: order.floor,
               store: order.store,
               audit: order.audit,
               /*ajust_totals: {
                  total_items: items_ajust.length,
                  total_store: items_ajust.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_ajust.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_ajust.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_ajust.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               },*/
               fallow_totals: {
                  total_items: items_fallow.length,
                  total_store: items_fallow.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_fallow.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_fallow.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_fallow.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               }
   
            }
         });
      }
      if(items_fallow.length ===0 && items_ajust.length !==0){
         page.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'order',
            data: {
               folio: order.folio,
               location: order.location,
               department: order.department,
               vendor: order.vendor.replace(/&/g, "&amp;").trim(),
               date: order.date,
               detail_ajust: items_ajust,
               //detail_fallow: items_fallow,
               floor: order.floor,
               store: order.store,
               audit: order.audit,
               ajust_totals: {
                  total_items: items_ajust.length,
                  total_store: items_ajust.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_ajust.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_ajust.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_ajust.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               },
               /*fallow_totals: {
                  total_items: items_fallow.length,
                  total_store: items_fallow.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_fallow.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_fallow.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_fallow.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               }*/
   
            }
         });
      }
     
     //if((items_ajust == null && items_ajust == " " && items_ajust == undefined )&& (items_fallow == null && items_fallow == " " && items_fallow == undefined)){
     if(items_ajust == null && items_fallow == null){
       page.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'order',
            data: {
               folio: order.folio,
               location: order.location,
               department: order.department,
               vendor: order.vendor.replace(/&/g, "&amp;").trim(),
               date: order.date,
               //detail_ajust: items_ajust,
               //detail_fallow: items_fallow,
               floor: order.floor,
               store: order.store,
               audit: order.audit,
               /*ajust_totals: {
                  total_items: items_ajust.length,
                  total_store: items_ajust.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_ajust.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_ajust.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_ajust.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               },*/
               /*fallow_totals: {
                  total_items: items_fallow.length,
                  total_store: items_fallow.map(item => Number(item.in_store)).reduce((prev, next) => prev + next),
                  total_system: items_fallow.map(item => Number(item.system)).reduce((prev, next) => prev + next),
                  total_diff: items_fallow.map(item => Number(item.difference)).reduce((prev, next) => prev + next),
                  total_amount: items_fallow.map(item => Number(item.price_amount)).reduce((prev, next) => prev + next)
               }*/
   
            }
         });
     }
      

      var renderedPage = page.renderAsString();
      context.response.renderPdf({
         xmlString: renderedPage
      });

      log.audit("que tengo?",renderedPage);
   } //end onRequest


   return entry_point;

   function get_order_data(folio) {
      let order = {};
      search.create({
         type: 'customrecord_order_control_inventory',
         filters: [
            ['internalid', 'anyof', folio]
         ],
         columns: [

            'custrecord_control_inventory_date',
            'custrecord_control_inventory_location',
            'custrecord_control_inventory_department',
            'custrecord_control_inventory_subsidiary',
            'custrecord_control_inventory_vendor',
            'custrecord_control_inventory_class',
            'custrecord_control_inventory_floor_manag',
            'custrecord_control_inventory_store_manag',
            'custrecord_control_inventory_in_charge',
            'custrecord_control_inventory_auditor'
         ],
      }).run().each(result => {
         order = {
            folio: result.id,
            date: result.getValue('custrecord_control_inventory_date'),
            location: result.getText('custrecord_control_inventory_location'),
            department: result.getText('custrecord_control_inventory_department'),
            subsidiary: result.getText('custrecord_control_inventory_subsidiary'),
            vendor: (result.getText('custrecord_control_inventory_vendor')).replace(/&/g, "&amp;").trim(),
            class: result.getText('custrecord_control_inventory_class'),
            floor: result.getText('custrecord_control_inventory_floor_manag'),
            store: result.getText('custrecord_control_inventory_store_manag'),
            inCharge: result.getText('custrecord_control_inventory_in_charge'),
            audit: result.getText('custrecord_control_inventory_auditor')
         }
      });
      return order;
      
   }

   function get_items_from_order(folio, observaciones) {
      let url = '/services/rest/query/v1/suiteql?limit=1000';
      let result_body;
      let itembins = [];
      do {
         log.audit('Folio a buscar', folio);
         let result = https.requestSuiteTalkRest({
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Prefer': 'transient'
            },
            url: url,
            body: `{\"q\": \"select custrecord_ci_body_analysis as analisis, custrecord_ci_body_observation as observacion, custrecord_ci_body_itemid as itemid, custrecord_ci_body_numart_text_ as numart, custrecord_ci_body_vendor_text_ as vendor, custrecord_ci_body_displayname as displayname, custrecord_ci_body_purchase_description as description, custrecord_ci_body_in_store as instore, custrecord_ci_body_availabe as system, custrecord_ci_body_difference as difference, custrecord_ci_body_base_price as baseprice, custrecord_ci_body_price_amount as basepriceamount, custrecord_ci_body_size as size, custrecord_ci_itemsbins_bin as binnumber, custrecord_ci_itemsbins_amount as amount, from customrecord_control_inventory_body left join customrecord_cha_ci_item_bin on (custrecord_ci_itemsbins_folio = custrecord_ci_body_parent and custrecord_ci_body_itemid = custrecord_ci_itemsbins_item) where custrecord_ci_body_parent = ${folio} and custrecord_ci_body_difference != 0 and custrecord_ci_body_observation in (${observaciones})  \"}`
         });
         log.audit('Resultado query', result)
         result_body = JSON.parse(result.body);
         log.audit({
            title: 'SQL',
            details: `{\"q\": \"select custrecord_ci_body_observation as observacion, custrecord_ci_body_adjusment_reason as motivo, custrecord_ci_body_itemid as itemid, custrecord_ci_body_numart_text_ as numart, custrecord_ci_body_vendor_text_ as vendor, custrecord_ci_body_displayname as displayname, custrecord_ci_body_purchase_description as description, custrecord_ci_body_in_store as instore, custrecord_ci_body_availabe as system, custrecord_ci_body_difference as difference, custrecord_ci_body_base_price as baseprice, custrecord_ci_body_price_amount as basepriceamount, custrecord_ci_body_size as size, custrecord_ci_itemsbins_bin as binnumber, custrecord_ci_itemsbins_amount as amount, from customrecord_control_inventory_body inner join customrecord_cha_ci_item_bin on (custrecord_ci_itemsbins_folio = custrecord_ci_body_parent and custrecord_ci_body_itemid = custrecord_ci_itemsbins_item) where custrecord_ci_body_parent = ${folio} and custrecord_ci_body_difference != 0\"}`
         })
         let {
            items
         } = result_body;

         var observation_list = search.create({
            type: "customlist_observation_ctrl_inventary",
            columns: [
               'internalid',
               'name'
            ]
         });

         var observations = {};

         observation_list.run().each(function (result) {

            observations[result.id] = result.getValue({
               name: "name"
            })

            return true;
         });

         //se valida si el articulo ya esta en el arreglo itembins, si no esta se crea.
         items.map(el => {
            let index = itembins.map(el => el.itemid).indexOf(el.itemid);
            if (index === -1) {
               itembins.push({
                  itemid: el.itemid,
                  numart: el.numart,
                  vendor: parseInt(el.vendor),
                  model: (el.displayname).replace(/&/g, "&amp;").trim(),
                  description: (el.description).replace(/&/g, "&amp;").trim(),
                  in_store: el.instore,
                  system: el.system,
                  difference: el.difference,
                  base_price: el.baseprice,
                  price_amount: el.basepriceamount,
                  binnumber: [el.binnumber ? `${el.binnumber}/${el.amount}` : ''],
                  observacion: observations[el.observacion],
                  analisis: el.analisis
               });
            } else {
               itembins[index].binnumber.push(el.binnumber ? `${el.binnumber}/${el.amount}` : '');
            }
            log.audit({
               title: "Items para imprimir",
               details: el
            })
         });
         if (result_body.links.map(el => el.rel).indexOf('next') > -1) {
            url = result_body.links[result_body.links.map(el => el.rel).indexOf('next')].href;
         }

      } while (result_body.links.map(el => el.rel).indexOf('next') > -1);
      return itembins;
   }
});