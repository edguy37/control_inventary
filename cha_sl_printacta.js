/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_sl_printadjustment.js
 * @description Genera el pdf de la impresion del ajuste de inventario
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/controlinventory/libraries/requireConfig.json
 */

define(['N/render', 'N/file', 'N/record', 'N/format', 'N/https', 'N/search', 'N/log', 'moment'], function (render, file, record, format, https, search, log, moment) {
   const entry_point = {
      onRequest: null,
   };

   moment.lang('es', {
      months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'),
      monthsShort: 'Enero._Feb._Mar_Abr._May_Jun_Jul._Ago_Sept._Oct._Nov._Dec.'.split('_'),
      weekdays: 'Domingo_Lunes_Martes_Miercoles_Jueves_Viernes_Sabado'.split('_'),
      weekdaysShort: 'Dom._Lun._Mar._Mier._Jue._Vier._Sab.'.split('_'),
      weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sa'.split('_')
   });

   const SUBSIDIARY_FISCAL = 2

   entry_point.onRequest = function (context) {
      const {
         parameters
      } = context.request;
      const order = get_order_data(parameters.order);

      log.audit("ORDER", order);

      const template = file.load('./templates/acta.xml');

      const page = render.create();

      page.templateContent = template.getContents();

      let items = get_items_from_order(parameters.order)
      page.addCustomDataSource({
         format: render.DataSource.OBJECT,
         alias: 'order',
         data: {
            folio: order.folio,
            address_fiscal: getAddress(SUBSIDIARY_FISCAL, 'subsidiary'),
            address_location: getAddress(order.location_id, 'location'),
            mes: order.mes,
            dateActa: order.dateActa,
            dateOrder: order.dateOrder,
            dateEnd: order.dateEnd,
            subsidiary: order.subsidiary,
            location: order.location,
            department: order.department,
            vendor: order.vendor,
            dateActa: order.dateActa,
            dateOrder: order.dateOrder,
            dateEnd: order.dateEnd,
            inCharge: order.inCharge,
            floor: order.floor,
            store: order.store,
            audit: order.audit,
            detail: items,
            condensado: {
               total_fisico: items.map(item => Number(item.total_fisico)).reduce((acu, curr) => acu + curr),
               total_valor_fisico: items.map(item => Number(item.total_amount)).reduce((acu, curr) => acu + curr).toFixed(2)
            },
         }
      });

      var renderedPage = page.renderAsString();
      context.response.renderPdf({
         xmlString: renderedPage
      });
   }

   return entry_point;

   function get_order_data(folio) {
      let order = {};
      search.create({
         type: 'customrecord_order_control_inventory',
         filters: [
            ['internalid', 'anyof', folio]
         ],
         columns: [
            'custrecord_control_inventory_folio',
            'custrecord_control_inventory_date',
            'custrecord_control_inventory_end_date',
            'custrecord_control_inventory_location',
            'custrecord_control_inventory_department',
            'custrecord_control_inventory_subsidiary',
            'custrecord_control_inventory_vendor',
            'custrecord_control_inventory_class',
            'custrecord_control_inventory_in_charge',
            'custrecord_control_inventory_floor_manag',
            'custrecord_control_inventory_store_manag',
            'custrecord_control_inventory_auditor'
         ],
      }).run().each(result => {
         order = {
            folio: result.getValue('custrecord_control_inventory_folio'),
            mes: moment(new Date()).format('MMMM'),
            dateActa: moment(new Date()).format('DD/MM/YYYY'),
            dateOrder: result.getValue('custrecord_control_inventory_date'),
            dateEnd: result.getValue('custrecord_control_inventory_end_date'),
            subsidiary: result.getText('custrecord_control_inventory_subsidiary'),
            location: result.getText('custrecord_control_inventory_location'),
            location_id: result.getValue('custrecord_control_inventory_location'),
            department: result.getText('custrecord_control_inventory_department'),
            vendor: result.getText('custrecord_control_inventory_vendor'),
            class: result.getText('custrecord_control_inventory_class'),
            inCharge: result.getText('custrecord_control_inventory_in_charge'),
            floor: result.getText('custrecord_control_inventory_floor_manag'),
            store: result.getText('custrecord_control_inventory_store_manag'),
            audit: result.getText('custrecord_control_inventory_auditor')
         }
      });
      return order;
   }

   function getAddress(locationID, type) {

      try {
         let subsidiary = record.load({
            type: type,
            id: locationID,
         });

         let dir = subsidiary.getValue({
            fieldId: 'mainaddress_text'
         });

         log.debug("LOCATION", dir)

         dir = dir.split('<br>')[0].split('\r\n')

         dir.splice(0, 1).join(' ')


         return dir.join(', ')
      } catch (e) {
         return '*****DIRECCIÓN NO CARGADA NETSUITE*****'
      }

   }

   function get_items_from_order(orderID) {
      let url = '/services/rest/query/v1/suiteql?limit=1000';
      let result_body;
      let final_items = [];
      do {
         log.audit('Folio a buscar', orderID);
         let result = https.requestSuiteTalkRest({
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Prefer': 'transient'
            },
            url: url,
            body: `{\"q\": \"select custrecord_ci_body_vendor_text_ as vendor, SUM(custrecord_ci_body_in_store) as fisico, SUM(custrecord_ci_body_in_store * custrecord_ci_body_base_price) as valor_fisico from customrecord_control_inventory_body left join customrecord_cha_ci_item_bin on (custrecord_ci_itemsbins_folio = custrecord_ci_body_parent and custrecord_ci_body_itemid = custrecord_ci_itemsbins_item) where custrecord_ci_body_parent =  ${orderID} and custrecord_ci_body_in_store != 0 group by custrecord_ci_body_vendor_text_\"}`
         });
         log.audit('Resultado query', result)
         result_body = JSON.parse(result.body);

         log.debug("JSON PARSE", result_body)
         let {
            items
         } = result_body;

         items.map(el => {
            let [num_prov, ...name_prov] = el.vendor.split(' ')

            final_items.push({
               num_prov: num_prov,
               name_prov: name_prov.join(' '),
               total_fisico: el.fisico,
               total_amount: el.valor_fisico
            });

         });

         if (result_body.links.map(el => el.rel).indexOf('next') > -1) {
            url = result_body.links[result_body.links.map(el => el.rel).indexOf('next')].href;
         }

      } while (result_body.links.map(el => el.rel).indexOf('next') > -1);
      return final_items;
   }

});