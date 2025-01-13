/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_rl_controlinventary.js
 * @description El restlet va a recibir los archivos TXT de las lecturas para buscar los articulos devolver las exitencias fisicas deacuerdo al conteo del archivo
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(
  ['N/encode', 'N/file', 'N/search', 'N/record', './libraries/lib_items'], function (encode, file, search, record, items) {
    const entry_point = {
      post: null,
    };

    entry_point.post = function (context) {
      if (file_in_folder(context.file.folder, context.file.name)) {
        return { code: 'error', message: 'Ya existe un archivo con ese nombre, no se ha cargado ' + context.file.name + ' para evitar duplicarlo!'};
      }

      try {
        const lecture = file.create({
          name: context.file.name,
          fileType: file.Type.PLAINTEXT,
          folder: context.file.folder,
          contents: encode.convert({ string: context.file.text, inputEncoding: encode.Encoding.BASE_64, outputEncoding: encode.Encoding.UTF_8 })
        });

        const rawfile = lecture.save();
        if (rawfile > 0) {
          items = items.get_items_by_file({ file: rawfile, order: context.order.folio });
          const friendyfile = create_csv(context.file.name, context.file.folder, context.order, items);

          const record_files = record.create({ type: 'customrecord_control_inventory_files', });
          record_files.setValue({ fieldId: 'name', value: context.file.name.replace('.txt', '') });
          record_files.setValue({ fieldId: 'custrecord_control_inventory_files_raw', value: rawfile });
          record_files.setValue({ fieldId: 'custrecord_control_inventory_files_csv', value: friendyfile.id });
          record_files.setValue({ fieldId: 'custrecord_control_inventory_order', value: context.order.folio });

          return { code: 'success', file_name: context.file.name.replace('.txt', ''), file_id: record_files.save() }
        } else {
          return { code: 'error', message: 'No se ha podido guardar el archivo!' }
        }

      } catch (e) {
        log.error('', e)
        return { code: 'error', message: 'No se ha podido cargar el archivo!' }
      }
    }//end post

    return entry_point;

    /**
     * @param {String} name
     * @param {String} folder
     * @param {Object} order
     * @param {Array} items 
     * @return {Number}
     * @description Se crea el archivo CSV del formato de lectura, este archivo es puramente informativo para chapur
     */
    function create_csv(name, folder, order, items) {
      //se carga el template
      let consult_lecture = file.load({ id: './templates/formato_consulta_lectura.txt' }).getContents();
      consult_lecture = consult_lecture
        .replace('{SUBSIDIARY}', order.subsidiary)
        .replace('{LOCATION}', order.location)
        .replace('{DEPARTMENT}', order.department)
        .replace('{CLASS}', order.class)
        .replace('{VENDOR}', order.vendor)
        .replace('{DATE}', new Date().toLocaleDateString())
        .replace('{ITEMS}', items.map(el => `${parseInt(el.vendor)},${el.itemid.replace(/.+ : /, '')},${el.displayname},${el.size},${el.color},${el.salesdescription.trim()},${el.count},${parseFloat(Number(el.average_cost)).toFixed(2)},${parseFloat(Number(el.average_cost) * el.count).toFixed(2)}, ${order.folio}, ${name.replace(".txt", "")}`).join('\n'))
        .replace('{TOTAL}', items.reduce((result, el) => result + el.count, 0))
        .replace('{EMPLOYEE}', order.employee);

      const _file = file.create({
        name: name.replace('.txt', '.csv'),
        fileType: file.Type.CSV,
        contents: consult_lecture,
        encoding: file.Encoding.UTF8,
        folder: folder,
      });

      return { id: _file.save(), name: _file.name };
    }
    /**
     * @param {Number} folder_id 
     * @param {String} file_name 
     * @description recibe el internalid del folder padre donde estan guardadas las lecturas y checa si ya existe un archivo con el nombre enviado en file_name
     */
    function file_in_folder(folder_id, file_name) {
      const file_uploaded = search.create({
        type: 'folder',
        filters: [
          ['internalid', 'anyof', folder_id],
          'AND',
          ['file.name', 'is', file_name]
        ]
      }).runPaged().count;

      return file_uploaded;
    }
  });
  