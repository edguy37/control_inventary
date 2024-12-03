/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_sl_printadjustment.js
 * @description Genera el pdf de la impresion del ajuste de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/render', 'N/file', 'N/record', 'N/format', 'N/https', 'N/search', 'N/log'], function (render, file, record, format, https, search, log) {
   const entry_point = {
      onRequest: null,
   };

   entry_point.onRequest = function (context) {
      const {
         parameters
      } = context.request;
      const order = get_order_data(parameters.order);

      log.audit("ORDER", order);

      const template = file.load('./templates/inventory_control_order.xml');

      const page = render.create();

      page.templateContent = template.getContents();
      page.addCustomDataSource({
         format: render.DataSource.OBJECT,
         alias: 'order',
         data: {
            folio: order.folio,
            department: order.department,
            location: order.location,
            vendor: order.vendor,
            date: order.date,
            detail: get_items_from_order(parameters.order)
         }
      });

      var renderedPage = page.renderAsString();
      context.response.renderPdf({
         xmlString: renderedPage
      });
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
            'custrecord_control_inventory_class'
         ],
      }).run().each(result => {
         order = {
            folio: result.id,
            date: result.getValue('custrecord_control_inventory_date'),
            location: result.getText('custrecord_control_inventory_location'),
            department: result.getText('custrecord_control_inventory_department'),
            subsidiary: result.getText('custrecord_control_inventory_subsidiary'),
            vendor: result.getText('custrecord_control_inventory_vendor'),
            class: result.getText('custrecord_control_inventory_class')
         }
      });
      return order;
   }

   function get_items_from_order(folio) {
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
            body: `{\"q\": \"select custrecord_ci_body_itemid as itemid, custrecord_ci_body_numart_text_ as numart, custrecord_ci_body_vendor_text_ as vendor, custrecord_ci_body_displayname as displayname, custrecord_ci_body_purchase_description as description, custrecord_ci_body_in_store as instore, custrecord_ci_body_availabe as system, custrecord_ci_body_difference as difference, custrecord_ci_body_base_price as baseprice, custrecord_ci_body_price_amount as basepriceamount, custrecord_ci_body_size as size, custrecord_ci_itemsbins_bin as binnumber, custrecord_ci_itemsbins_amount as amount, from customrecord_control_inventory_body left join customrecord_cha_ci_item_bin on (custrecord_ci_itemsbins_folio = custrecord_ci_body_parent and custrecord_ci_body_itemid = custrecord_ci_itemsbins_item) where custrecord_ci_body_parent = ${folio} and custrecord_ci_body_difference != 0 \"}`
         });
         log.audit('Resultado query', result)
         result_body = JSON.parse(result.body);
         log.audit({
            title: 'SQL',
            details: `{\"q\": \"select custrecord_ci_body_itemid as itemid, custrecord_ci_body_numart_text_ as numart, custrecord_ci_body_vendor_text_ as vendor, custrecord_ci_body_displayname as displayname, custrecord_ci_body_purchase_description as description, custrecord_ci_body_in_store as instore, custrecord_ci_body_availabe as system, custrecord_ci_body_difference as difference, custrecord_ci_body_base_price as baseprice, custrecord_ci_body_price_amount as basepriceamount, custrecord_ci_body_size as size, custrecord_ci_itemsbins_bin as binnumber, custrecord_ci_itemsbins_amount as amount, from customrecord_control_inventory_body left join customrecord_cha_ci_item_bin on (custrecord_ci_itemsbins_folio = custrecord_ci_body_parent and custrecord_ci_body_itemid = custrecord_ci_itemsbins_item) where custrecord_ci_body_parent = ${folio} and custrecord_ci_body_difference != 0 \"}`
         })
         let {
            items
         } = result_body;

         //se valida si el articulo ya esta en el arreglo itembins, si no esta se crea.
         items.map(el => {
            let index = itembins.map(el => el.itemid).indexOf(el.itemid);
            if (index === -1) {
               itembins.push({
                  itemid: el.itemid,
                  numart: el.numart,
                  vendor: parseInt(el.vendor),
                  model: el.displayname,
                  description: el.description.toString().replace('&', ' Y '),
                  in_store: el.instore,
                  system: el.system,
                  difference: el.difference,
                  base_price: el.baseprice,
                  price_amount: el.basepriceamount,
                  binnumber: [el.binnumber ? `${el.binnumber}/${el.amount}` : '']
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