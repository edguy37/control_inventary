/**
 * @author Daniela Camara <daniela.camara@chapur.com>
 * @Name cha_mr_reverseadjustment.js
 * @description Elimina los ajustes de inventario asociados a una orden de levantamiento y restaura los valores de merma si aplica.
 * @NApiVersion 2.1
 * @NScriptType MapreduceScript
 */

define(['N/search', 'N/record', 'N/runtime', 'N/log'], function (search, record, runtime, log) {

  // Definición del punto de entrada para el script
  const entry_point = {
    // Función que obtiene los datos de entrada para el script
    getInputData: function (context) {
      log.debug('context - getInputData', context);
      const script = runtime.getCurrentScript(); // Obtiene el script actual
      log.debug('script - getInputData', script); 
      const orderId = script.getParameter({
        name: 'custscript_order_inventory_' // ID de la orden de levantamiento
      });
      log.debug('orderId - getInputData', orderId);

      // Carga el registro de la orden de levantamiento
      const orderRecordCampo = record.load({
        type: 'customrecord_order_control_inventory',
        id: orderId
      });
      log.debug('orderRecordCampo', orderRecordCampo);
      const campoOrden = orderRecordCampo.getValue('custrecord_cha_ajustesasociados'); // Obtiene el valor de los ajustes asociados
      log.debug('campoOrden', campoOrden);

      let dividirCampoOrden = campoOrden.split(', ').map(id => id.trim()); // Se obtienen los ids de ajustes en dado caso que la orden tenga asociado más de 1 ajuste
      log.debug('dividirCampoOrden', dividirCampoOrden);

      // Realiza la búsqueda de los ajustes de inventario asociados a la orden de levantamiento
      return search.create({
        type: search.Type.INVENTORY_ADJUSTMENT,
        filters: [
          ['internalid', 'anyof', dividirCampoOrden], // Relaciona con la orden a través del campo de ajustes asociados
          'AND',
          ['custbody_cha_order_id', 'is', orderId] // Relaciona con la orden de levantamiento
        ],
        columns: [
          'internalid', // ID del ajuste de inventario
          'custbody_cha_order_id', // ID de la orden de levantamiento
          'memo', // Memo asociado al ajuste
          'custbody_bex_motivo_ajuste', // Motivo del ajuste
        ]
      });
    },

    // Función para mapear cada uno de los resultados obtenidos en la búsqueda
    map: function (context) {
      log.debug('context - map', context);
      const result = context.value; // No hace falta parsear
      log.debug('result - map', result);

      const adjustmentId = result.id; // ID del ajuste de inventario
      const script = runtime.getCurrentScript(); // Obtiene el script actual
      log.debug('script - map', script);
      const orderId = script.getParameter({
        name: 'custscript_order_inventory_' // ID de la orden de levantamiento
      });

      const memo = result.values.memo; // Obtiene el memo asociado al ajuste

      log.debug('adjustmentId - map', adjustmentId); 
      log.debug('orderId - map', orderId);
      log.debug('memo - map', memo);

      // Se obtienen los artículos afectados por merma
      const itemToRestore = getItemsAffectedByMerma(orderId);
      log.debug('itemToRestore - map', itemToRestore);

      // Escribe los ajustes que vamos a eliminar
      context.write({
        key: orderId,
        value: {
          adjustmentId: adjustmentId,
          itemToRestore: itemToRestore
        }
      });
    },

    // Función que procesa y elimina los ajustes de inventario en la etapa reduce
    reduce: function (context) {
      log.debug('context - reduce', context);
      const data = JSON.parse(context.values[0]); // Parsea el primer valor de los datos
      const adjustmentId = data.adjustmentId; // ID del ajuste de inventario a eliminar
      const itemToRestore = data.itemToRestore; // Artículos que necesitan restaurarse debido a la merma

      log.debug('data - reduce', data);
      log.debug('adjustmentId - reduce', adjustmentId);
      log.debug('itemToRestore - reduce', itemToRestore);

      let adjustCostAmount = 0; // Variable para el importe de costo a ajustar

      try {
        // Carga el registro de la orden de levantamiento
        const orderRecord = record.load({
          type: 'customrecord_order_control_inventory',
          id: context.key
        });
        log.debug('orderRecord - Reduce', orderRecord);

        const locationOrder = orderRecord.getValue('custrecord_control_inventory_location'); // Obtiene la ubicación de la orden de levantamiento
        log.debug('locationOrder', locationOrder); 
        const departmentOrder = orderRecord.getValue('custrecord_control_inventory_department'); // Obtiene el departamento de la orden de levantamiento
        log.debug('departmentOrder', departmentOrder); 
        const classOrder = orderRecord.getValue('custrecord_control_inventory_class'); // Obtiene la clase de la orden de levantamiento
        log.debug('classOrder', classOrder);
        const estatusOrder = orderRecord.getValue('custrecord_control_inventory_status'); // Se obtiene el estatus de la orden
        log.debug('estatusOrder', estatusOrder);

        // Recorre los artículos para verificar y restaurar los costos de merma
        itemToRestore.forEach(item => {
          if (item.merma_decrease === true) { // Verifica si 'merma_decrease' es verdadero
            log.debug('merma_decrease', item.merma_decrease); // Verifica si merma_decrease es 'true'
            if ([1, 2, 5, 6, 8].indexOf(item.observacionArticulo) > -1) {
              log.debug('observacionArticulo', item.observacionArticulo); // Verifica la observación del artículo
              if ([1, 2].indexOf(item.motivoAjusteArticulo) > -1) {
                log.debug('motivoAjusteArticulo', item.motivoAjusteArticulo); // Verifica el motivo de ajuste del artículo
                const costo = parseFloat(item.importeCosto); // Convierte el 'importeCosto' a un número
                log.debug('importeCosto', item.importeCosto); // Muestra el valor de 'importeCosto'
                if (!isNaN(costo)) {
                  adjustCostAmount += costo; // Suma el importe de costo
                  log.debug('adjustCostAmount', adjustCostAmount); // Muestra el valor acumulado
                } else {
                  log.error('Invalid cost value', `El valor de 'importeCosto' para el artículo ${item.itemId} no es válido: ${item.importeCosto}`);
                }
              }
            }
          }
        });

        log.debug('adjustCostAmount', adjustCostAmount);

        // Llama a la función para obtener el registro de merma afectado
        const decrease = get_decreased({ location: locationOrder, department: departmentOrder, class: classOrder });
        log.debug('Se imprime el resultado de la busqueda - donde se obtiene la tabla de merma afectada', decrease);

        // Si no se encuentra el registro de merma, sale de la función
        if (!decrease.internalid) return;

        // Actualiza el registro de merma con los nuevos valores calculados
        record.submitFields({
          id: decrease.internalid,
          type: 'customrecord_control_inventary_decrease',
          values: {
            'custrecord_decrease_ci_ejercido': (parseFloat(decrease.executed - adjustCostAmount)).toFixed(2),
            'custrecord_decrease_ci_porejercier': (parseFloat(decrease.porEjercer + adjustCostAmount)).toFixed(2),
          }
        });

        // Elimina el ajuste de inventario
        record.delete({
          type: 'inventoryadjustment',
          id: adjustmentId
        });
        log.debug('Reduce - Ajuste de inventario ID', adjustmentId); // Loguea el ID del ajuste eliminado

        // Actualiza el estado de la orden de levantamiento
        orderRecord.setValue({
          fieldId: 'custrecord_control_inventory_status',
          value: 'Pendiente aprobación' // Cambia el estado de la orden a 'Pendiente de aprobación'
        });

        orderRecord.save(); // Guarda la orden actualizada
        log.debug('Reduce - Estado de la orden actualizado a Pendiente de aprobación.');

      } catch (error) {
        log.error({
          title: 'Error al procesar el ajuste de inventario',
          details: error
        }); // Loguea el error si algo falla

        // Si ocurre un error, no eliminamos los ajustes ni cambiamos el estado de la orden
        const orderRecord = record.load({
          type: 'customrecord_order_control_inventory',
          id: context.key
        });

        orderRecord.setValue({
          fieldId: 'custrecord_control_inventory_status',
          value: 'Aprobada' // Deja el estado como 'Aprobada' en caso de error
        });

        orderRecord.save(); // Guarda la orden con el estado 'Aprobada'
        log.debug('Reduce - En el catch, el estado permanece como Aprobada.'); // Loguea que el estado no ha cambiado
      }
    },

    // Función para resumir el proceso al final
    summarize: function (context) {
      log.audit({
        title: 'Resumen',
        details: 'Se procesaron ajustes de inventario y se restauraron artículos correctamente.' // Loguea el resumen del procesamiento
      });
    }
  };

  /**
   * Función para obtener los artículos afectados por merma
   * @param {number} orderId - ID de la orden de levantamiento
   * @returns {Array} Lista de artículos afectados por merma
   */
  function getItemsAffectedByMerma(orderId) {
    log.debug('Entramos a la función getItemsAffectedByMerma');
    
    // Realiza una búsqueda para obtener los artículos afectados por merma
    const itemsSearch = search.create({
      type: 'customrecord_control_inventory_body',
      filters: [
        ['custrecord_ci_body_parent', 'anyof', orderId], // Relaciona con la orden de levantamiento
        'AND',
        ['custrecord_ci_body_inventory', 'is', 'T'] // Asegura que solo se obtengan artículos con inventario
      ],
      columns: [
        'custrecord_ci_body_item', // ID del artículo
        'custrecord_ci_body_merma_decrease', // Si el artículo tiene merma
        'custrecord_ci_body_motivo_ajuste', // Motivo del ajuste
        'custrecord_ci_body_observacion_articulo', // Observación del artículo
        'custrecord_ci_body_importe_costo' // Importe de costo
      ]
    });

    log.debug('itemsSearch getItemsAffectedByMerma', itemsSearch);

    const items = [];
    itemsSearch.run().each(function (result) {
      items.push({
        itemId: result.getValue('custrecord_ci_body_item'), // ID del artículo
        merma_decrease: result.getValue('custrecord_ci_body_merma_decrease'), // Verifica si tiene merma
        motivoAjusteArticulo: result.getValue('custrecord_ci_body_motivo_ajuste'), // Motivo del ajuste
        observacionArticulo: result.getValue('custrecord_ci_body_observacion_articulo'), // Observación del artículo
        importeCosto: result.getValue('custrecord_ci_body_importe_costo') // Importe de costo
      });
      return true;
    });

    log.debug('items getItemsAffectedByMerma', items);
    return items; // Retorna los artículos afectados por merma
  }

  /**
   * Función para obtener la merma de la orden
   * @param {Object} params - Parámetros para la búsqueda
   * @returns {Object} Datos de la merma
   */
  function get_decreased(params) {
    log.debug('params get_decreased', params);
    const decrease = search.create({
      type: 'customrecord_control_inventary_decrease', // Tipo de registro de merma
      filters: [
        ['custrecord_decrease_ci_location', 'anyof', params.location], // Filtra por ubicación
        'AND',
        ['custrecord_decrease_ci_department', 'anyof', params.department], // Filtra por departamento
        'AND',
        ['custrecord_decrease_ci_class', 'anyof', params.class] // Filtra por clase
      ],
      columns: [
        'custrecord_decrease_ci_ejercido', // Ejercido
        'custrecord_decrease_ci_porejercier', // Por ejercer
        'internalid' // ID interno de la merma
      ]
    });

    log.debug('decrease get_decreased', decrease);

    const result = decrease.run().getRange({
      start: 0,
      end: 1
    });

    return result[0] || {}; // Retorna el primer resultado de la búsqueda o un objeto vacío
  }

  return entry_point;
});
