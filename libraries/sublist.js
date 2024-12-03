/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name sublist.js
 * @description Suitelet para construir el formulario para el levatamiento de ordenes de inventario
 * @NApiVersion 2.1
 */
define(['N/ui/serverWidget',], function (serverWidget) {
  const entry_point = {
    item: null
  }

  entry_point.item = (context) => {
    return {
      id: 'items',
      type: serverWidget.SublistType.LIST,
      label: 'Artículos',
      fields: [
        {
          id: 'selection',
          label: 'Agregar',
          type: serverWidget.FieldType.CHECKBOX,
          displayType: ((context || {}).selection || {}).display || serverWidget.FieldDisplayType.HIDDEN,
        },
        {
          id: 'itemid',
          label: 'id',
          type: serverWidget.FieldType.INTEGER,
          displayType: ((context || {}).vendor || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'vendor',
          label: 'No. Proveedor',
          type: serverWidget.FieldType.SELECT,
          displayType: ((context || {}).vendor || {}).display || serverWidget.FieldDisplayType.INLINE,
          source: 'vendor'
        },
        {
          id: 'internalid',
          label: 'Numart',
          type: serverWidget.FieldType.SELECT,
          source: 'item',
          displayType: ((context || {}).itemid || {}).display || serverWidget.FieldDisplayType.INLINE,
        },
        //PABC 03-11-22 Agregado de un nuevo campo
        {
          id: 'codigo',
          label: 'Num. Articulo',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).codigo || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'purchase_description',
          label: 'Descripción',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).purchase_description || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'displayname',
          label: 'Modelo',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).displayname || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'size',
          label: 'Talla',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).size || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'color',
          label: 'Color',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).color || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'unitstype',
          label: 'Unidad',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).unitstype || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'available',
          label: 'Sistema',
          type: serverWidget.FieldType.FLOAT,
          displayType: ((context || {}).available || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'in_store',
          label: 'Fisico',
          type: serverWidget.FieldType.FLOAT,
          displayType: ((context || {}).in_store || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'difference',
          label: 'Diferencia',
          type: serverWidget.FieldType.FLOAT,
          displayType: ((context || {}).difference || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'confiability',
          label: '% Confiabilidad',
          type: serverWidget.FieldType.FLOAT,
          displayType: ((context || {}).difference || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'observation',
          label: 'Observación',
          type: serverWidget.FieldType.SELECT,
          source: 'customlist_observation_ctrl_inventary',
          displayType: ((context || {}).observation || {}).display || serverWidget.FieldDisplayType.NORMAL
        },
        {
          id: 'analysis',
          label: 'Análisis',
          type: serverWidget.FieldType.TEXT,
          displayType: ((context || {}).analysis || {}).display || serverWidget.FieldDisplayType.ENTRY,
        },
        {
          id: 'adjustment_reason',
          label: 'Motivo de Ajuste',
          type: serverWidget.FieldType.SELECT,
          source: 'customlist_reasonadjust_ctrl_inventary',
          displayType: ((context || {}).adjustment_reason || {}).display || serverWidget.FieldDisplayType.INLINE,
        },
        {
          id: 'decrease',
          label: 'Merma',
          type: serverWidget.FieldType.CHECKBOX,
          displayType: ((context || {}).decrease || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'base_price',
          label: 'Precio',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).base_price || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'average_cost',
          label: 'Costo Promedio',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).average_cost || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'price_amount',
          label: 'Importe Precio',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).price_amount || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'cost_amount',
          label: 'Importe Costo',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).cost_amount || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'system_amount',
          label: 'Valor Sistema',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).system_amount || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'system_amount_cost',
          label: 'Valor Sistema Costo',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).system_amount_cost || {}).display || serverWidget.FieldDisplayType.NORMAL,

        },
        {
          id: 'in_store_amount',
          label: 'Valor Físico',
          type: serverWidget.FieldType.CURRENCY,
          displayType: ((context || {}).in_store_amount || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
        {
          id: 'id',
          label: 'No. Registro',
          type: serverWidget.FieldType.INTEGER,
          displayType: ((context || {}).id || {}).display || serverWidget.FieldDisplayType.NORMAL,
        },
      ],
    }
  }

  return entry_point;
});