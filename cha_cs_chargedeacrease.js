/**
 * @author Octavio Quiroz <octavio.lopez@beexponential.com.mx>
 * @Name cha_cs_chargedeacrease.js
 * @description asigna el valor a la columna por ejercer del registro de merma
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

define([], function () {
    const entry_point = {
        fieldChanged: null,

    };
    entry_point.fieldChanged = function (context) {
        if (context.fieldId === 'custrecord_decrease_ci_cobrado' ||
            context.fieldId === 'custrecord_decrease_ci_ejercido' ||
            context.fieldId === 'custrecord_decrease_ci_amount') {
            context.currentRecord.setValue({
                fieldId: 'custrecord_decrease_ci_porejercier',
                value: Number(context.currentRecord.getValue('custrecord_decrease_ci_amount')) - Number(context.currentRecord.getValue('custrecord_decrease_ci_ejercido')) + Number(context.currentRecord.getValue('custrecord_decrease_ci_cobrado'))
            });
        }

    } //end fieldChanged


    return entry_point;

});