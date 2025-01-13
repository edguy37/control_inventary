/**
 * @author Daniela Camara <daniela.camara@chapur.com>
 * @Name cha_ue_deletelectura.js
 * @description User event para eliminar una lectura. Borra las existencias asociadas a la lectura, elimina los archivos del gabinete y elimina el registro personalizado de inventario.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/file', 'N/search', 'N/record', 'N/log', './libraries/lib_items'], function (file, search, record, log, items) {
  const entry_point = {
    beforeSubmit: function (context) {
      log.debug('context al iniciar', context);
      // Solo proceder si el evento es 'edit' o 'delete'
      if (context.type !== 'delete' && context.type !== 'edit') return;

      try {
        log.debug('Tipo de evento', context.type);

        // Obtener valores del registro anterior
        const order = context.oldRecord.getValue({ fieldId: 'custrecord_control_inventory_order' });
        const idLectura = context.oldRecord.getValue({fieldId: 'id'});
        const idArchivoTXT = context.oldRecord.getValue({ fieldId: 'custrecord_control_inventory_files_raw' });
        const idArchivoCSV = context.oldRecord.getValue({fieldId: 'custrecord_control_inventory_files_csv'});
        
        log.debug('Order:', order);
        log.debug('idLectura', idLectura);
        log.debug('Lectura:', idArchivoTXT);
        log.debug('idArchivoCSV', idArchivoCSV);


        // Obtener los artículos asociados a la lectura
        const file_items = items.get_items_by_file({ order: order, file: idArchivoTXT });
        log.debug('File Items:', file_items);

        if (file_items.length === 0) {
          log.debug('No se encontraron artículos asociados a la lectura');
          return;
        }
        
        
        // Crear un mapa de internalid -> count
        const itemsMap = {};
        file_items.forEach(item => {
          itemsMap[item.internalid] = item.count;
        });
        
        log.debug('itemsMap', itemsMap);
        
        // Crear la búsqueda para los elementos asociados al inventario
        const buscarElementos = search.create({
          type: 'customrecord_control_inventory_body',
          filters: [
            ['custrecord_ci_body_parent', 'anyof', order],
            'AND',
            ['custrecord_ci_body_itemid.internalid', 'anyof', Object.keys(itemsMap)], // Usamos las claves del mapa
            'AND',
            ['custrecord_ci_body_availabe', 'equalto', '0'],
            'AND',
            ['custrecord_ci_body_in_store', 'notequalto', '0']
          ],
          columns: [
            'internalid', 'custrecord_ci_body_itemid', 'custrecord_ci_body_availabe', 'custrecord_ci_body_in_store', 'custrecord_ci_body_difference'
          ]
        });

        log.debug('buscarElementos', buscarElementos);

        // Se ejecuta la busqueda y se procesan los resultados
        buscarElementos.run().each(function (el) {
          // Se obtiene primero el internalId del registro
          const internalid = el.getValue('internalid');
          log.debug('internalid', internalid);

          // Obtener el valor de custrecord_ci_body_itemid (referencia)
          const itemidRecord = el.getValue('custrecord_ci_body_itemid'); // Esto es el ID del registro referenciado
          log.debug('itemidRecord (ID del registro referenciado)', itemidRecord);

          // Verificar si hay una cantidad para este internalid en itemsMap
          const countToSubtract = itemsMap[itemidRecord]; // Aquí usamos itemidRecord para buscar la cantidad
          log.debug('countToSubtract', countToSubtract);
          if (countToSubtract === undefined) {
            log.debug(`No se encontró cantidad para el item con internalid: ${itemidRecord}`);
            return true; // Si no se encuentra, saltamos este item
          }

          // Obtener valores actuales del registro encontrado en la búsqueda
          const available = Number(el.getValue('custrecord_ci_body_availabe'));
          log.debug('available', available);
          const in_store = Number(el.getValue('custrecord_ci_body_in_store'));
          log.debug('in_store', in_store);
          const difference = Number(el.getValue('custrecord_ci_body_difference'));
          log.debug('difference', difference);

          // Restar los valores
          const new_in_store = in_store - countToSubtract;
          log.debug(`Nuevo valor en store para el item ${internalid}: ${new_in_store}`);
          const new_difference = difference - countToSubtract;
          log.debug(`Nuevo valor en store para el item ${internalid}: ${difference}`);


          // Actualización del registro de inventario
          record.submitFields({
            type: 'customrecord_control_inventory_body',
            id: internalid,
            values: {
              custrecord_ci_body_in_store: new_in_store,  // Se agrega el nuevo valor
              custrecord_ci_body_difference: new_difference  // Actualizar la diferencia
            }
          });

          return true; // Continuar con el siguiente registro
        });
        
        //Eliminar archivo .txt y su archivo .csv asociado
        deleteFileAndAssociatedFiles(idArchivoTXT, idArchivoCSV);

        // Eliminar el registro personalizado de inventario (customrecord_control_inventory_files)
        deleteCustomInventoryFileRecord(idLectura);

      } catch (error) {
        log.error('Error en beforeSubmit', error.message);
      }
    }
  };

  return entry_point;

  /**
   * Función para eliminar archivos .txt y su archivo .csv asociado.
   * @param {string} lectura - ID del archivo .txt
   */
  function deleteFileAndAssociatedFiles(idArchivoTXT, idArchivoCSV) {
    log.debug('lectura en deleteFileAndAssociatedFiles,', idArchivoTXT);
    log.debug('lectura en deleteFileAndAssociatedFiles,', idArchivoCSV);
    try {

      if(idArchivoTXT > 0){
        const fileToDeleteTxt = file.load({ id: idArchivoTXT });
        log.debug('Eliminando archivo TXT', fileToDeleteTxt.name);
        file.delete({ id: idArchivoTXT });
        log.debug('Archivo CSV con id ', idArchivoTXT + ' y nombre = ' + fileToDeleteTxt.name + ' eliminado exitosamente...');
      } else{
        log.debug('No se encontró archivo TXT asociado');
      }

      if (idArchivoCSV > 0) {
        const fileToDeleteCSV = file.load({ id: idArchivoCSV });
        log.debug('Eliminando archivo CSV', fileToDeleteCSV.name);
        file.delete({ id: idArchivoCSV });
        log.debug('Archivo CSV con id ', idArchivoCSV + ' y nombre = ' + fileToDeleteCSV.name + ' eliminado exitosamente...');
      } else {
        log.debug('No se encontró archivo CSV asociado');
      }

    } catch (error) {
      log.error('Error al eliminar los archivos', error.message);
    }
  }

  /**
   * Función para eliminar el registro personalizado de inventario (customrecord_control_inventory_files).
   * @param {string} order - ID de la orden
   * @param {string} nombreArchivo - Nombre del archivo de lectura
   */
  function deleteCustomInventoryFileRecord(idLectura) {
    log.debug('id del registro personalizado de lectura de control de inventario a eliminar', idLectura);
    try {
      // Buscar el registro personalizado de inventario (customrecord_control_inventory_files) asociado a la lectura
      if (idLectura > 0) {
        // Eliminar el registro personalizado de inventario
        record.delete({
          type: 'customrecord_control_inventory_files',
          id: idLectura
        });
        log.debug('Registro personalizado de inventario eliminado exitosamente', idLectura);
      } else {
        log.debug('No se encontró registro personalizado de inventario asociado');
      }

    } catch (error) {
      log.error('Error al eliminar el registro personalizado de inventario', error.message);
    }
  }

});