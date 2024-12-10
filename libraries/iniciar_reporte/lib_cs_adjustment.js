/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name lib_cs_adjustment.js
 * @description Eventos de usuario para el formulario Orden de levantamiento
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
define(['N/record', 'N/search', 'N/currentRecord', 'N/ui/dialog', 'N/url', 'N/https', '../lib_items'], function (record, search, currentRecord, dialog, url, https, item) {
  const entry_point = {
    pageInit: (context) => { },
    fieldChanged: (context) => { },
    backToOrder: (context) => { },
    updateReasonInSublist: (context) => { },
    saveRecord: () => { }
  }
  entry_point.pageInit = (context) => {
    const orderId = Number(context.currentRecord.getValue('custpage_folio'));
    const observation_filter_field = context.currentRecord.getField({ fieldId: 'custpage_observation_filter' });
    const adjustment_reason = context.currentRecord.getField({ fieldId: 'custpage_adjustment_reason' });
    //se insertan las opciones al campo de filtro de proveedor
    observation_filter_field.isDisabled = false;
    adjustment_reason.isDisabled = false;
  }
  entry_point.fieldChanged = (context) => {
    const _currentRecord = currentRecord.get();
    //se cambian los valores de los filtros para contruir la sublista de articulos
    if (context.fieldId === 'custpage_observation_filter') {
        const observationFilter = _currentRecord.getValue({ fieldId: 'custpage_observation_filter' });
        // Validar elemento de filtro de observacion sea diferente de '', para que despues de desmarcarlo en deselectObservationFilter() no ingrese
        if(observationFilter[0] !== ''){
            const url_suitelet = url.resolveScript({ scriptId: 'customscript_cha_s_control_inventary', deploymentId: 'customdeploy_cha_s_control_inventary', });
            window.location.href = url.format({
              domain: url_suitelet,
              params: {
                action: 'adjustmentReason',
                order: Number(_currentRecord.getValue({ fieldId: 'custpage_folio' })),
                data: btoa(
                  JSON.stringify({
                    observation: observationFilter
                  })
                )
              }
            });
        }
    }

    if (context.fieldId === 'custpage_adjustment_reason') {

      const adjustId = _currentRecord.getValue('custpage_adjustment_reason');
      console.log('adjustId', adjustId);
      // Validar filtro de motivo de ajuste sea diferente de '', para que despues de desmarcarlo en deselectAdjustmentReason() no ingrese      
      if (adjustId !== '') {
        const itemsCount = _currentRecord.getLineCount({sublistId: 'items'});
        for (let i = 0; i < itemsCount; i++) {
          const line = _currentRecord.selectLine({ sublistId: 'items', line: i });
  
          _currentRecord.setCurrentSublistValue({ sublistId: 'items', fieldId: 'adjustment_reason', line: i, value: adjustId });
          _currentRecord.commitLine({ sublistId: 'items' });
        }
      } 
    }
    //si se realiza un cambio en el valor de cometarios
    if (context.fieldId === 'custpage_memo'){
      let memo = _currentRecord.getValue('custpage_memo');
      if(memo.trim()){
        record.submitFields({
            type: 'customrecord_order_control_inventory',
            id: _currentRecord.getValue({ fieldId: 'custpage_folio' }),
            values: {
              custrecord_control_inventory_memo: memo
            }
        });
      }
    }
    //si se realiza un cambio en los valores de observación y analisis en la sublita items, se actualiza su valor en el regitro
    if (context.sublistId === 'items') {
      record.submitFields({
        type: 'customrecord_control_inventory_body',
        id: Number(_currentRecord.getSublistValue({ sublistId: 'items', fieldId: 'itemid', line: context.line })),
        values: {
          custrecord_ci_body_adjusment_reason: _currentRecord.getSublistValue({ sublistId: 'items', fieldId: 'adjustment_reason', line: context.line }),
        }
      })
    }
  }
  entry_point.backToOrder = () => {
    const _currentRecord = currentRecord.get();
    /*//CUM 04Nov2021 Guardar información de COMENTARIOS en MEMO
    let memo = _currentRecord.getValue('custpage_memo');
    if(memo.trim()){
      record.submitFields({
          type: 'customrecord_order_control_inventory',
          id: _currentRecord.getValue({ fieldId: 'custpage_folio' }),
          values: {
            custrecord_control_inventory_memo: memo
          }
      });
    }*/
    const urlToRecord = url.resolveRecord({ recordType: 'customrecord_order_control_inventory', recordId: _currentRecord.getValue('custpage_folio'), });
    window.location.href = urlToRecord;
  }
  entry_point.updateReasonInSublist = (context) => {
    const _currentRecord = currentRecord.get();
    if (_currentRecord.getValue('custpage_adjustment_reason')) {
      const response = https.post({
        url: url.resolveScript({ scriptId: 'customscript_cha_add_adjustment_reason', deploymentId: 'customdeploy_cha_add_adjustment_reason' }),
        headers: {
          'content-type': ' application/json'
        },
        body: {
          order: _currentRecord.getValue('custpage_folio'),
          reason: _currentRecord.getValue('custpage_adjustment_reason'),
          observation: _currentRecord.getValue('custpage_observation_filter')
        }
      });
      const response_body = JSON.parse(response.body);
      console.log(response_body)
      if (response_body.code === 'error') {
        dialog.alert({ title: 'Error!', message: response_body.message });
        return false;
      }
      //window.location.href = url.resolveRecord({ recordType: 'customrecord_order_control_inventory', recordId: _currentRecord.getValue('custpage_folio'), });
      dialog.alert({title: 'MOTIVOS DE AJUSTE ACTUALIZADOS', message: 'Puede continuar asignando motivos de ajuste para otra OBSERVACIÓN.'});
      //Una vez actualizados los motivos se limpia el multiselect y el select para continuar con la asignacion de motivos (para iniciar un nuevo flujo al seleccionar una observacion)
      //desmarcar el MULTISELECT observacion "custpage_observation_filter"
      deselectObservationFilter();
      //desmarcar el SELECT motivos de ajuste "custpage_adjustment_reason"
      deselectAdjustmentReason();

    }else{
      dialog.alert({title: 'Error!', message: 'Selecciona un motivo de ajuste'});
    }
  }
  entry_point.saveRecord = (context) => {
    const pendingToObservation = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'anyof', context.currentRecord.getValue('custpage_folio')],
        'AND',
        ['custrecord_ci_body_observation', 'anyof', [1, 2, 3, 5, 6, 8]],
        'AND',
        ['custrecord_ci_body_adjusment_reason', 'is', '@NONE@']
      ]
    });
    if (pendingToObservation.runPaged().count > 0) {
      dialog.alert({
        title: 'Error!',
        message: 'Aún existen artículos sin motivo de ajuste'
      });
      return false;
    }
    return true;
  }
  return entry_point;
  /**
   * @param {Number} orderId
   * @returns {Array} 
   * @description Se obtienen todos los proveedores según los articulos en la orden de levantamiento
   */
  function getVendorFromOrder(orderId) {
    let vendor = [];
    const vendorSearch = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        'custrecord_ci_body_parent', 'anyof', orderId
      ],
      columns: [
        vendorColumn = search.createColumn({ name: 'custrecord_ci_body_vendor', summary: search.Summary.GROUP })
      ]
    });
    const pageData = vendorSearch.runPaged({ pageSize: 1000 });
    for (let i = 0; i < pageData.pageRanges.length; i++) {
      const customrecord_control_inventory_bodySearchPage = pageData.fetch({ index: i });
      customrecord_control_inventory_bodySearchPage.data.forEach(function (result) {
        vendor.push({ id: Number(result.getValue(vendorColumn)), name: result.getText(vendorColumn) });
      });
    }
    return vendor;
  }
  // Desmarca todos los valores del multiselect de OBSERVACION 
  function deselectObservationFilter() {
    let _currentRecord = currentRecord.get();
    
    // resetear el multiselect
    _currentRecord.setValue({
      fieldId: 'custpage_observation_filter',
      value: [] 
    });
  }
  // Desmarca el valor del select de MOTIVO DE AJUSTE
  function deselectAdjustmentReason() {
    let _currentRecord = currentRecord.get();
  
    // resetear el select
    _currentRecord.setValue({
      fieldId: 'custpage_adjustment_reason',  
      value: ''  
    });
  }
  
});