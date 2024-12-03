define([], function () {


	function generateFilas(filasItems) {
		var xmlFilas = "";

		for (let index = 0; index < filasItems.length; index++) {

			xmlFilas += createFila(filasItems[index]);
		}

		return xmlFilas;
	}

	function createFila(data) {
		return '<tr>' +
			'<td>' + data[0] + '</td>' +
			'<td>' + data[1] + '</td>' +
			'<td align="center">' + data[2] + '</td>' +
			'<td align="center">' + data[3] + '</td>' +
			'<td align="center">' + data[4] + '</td>' +
			'<td align="center">' + data[5] + '</td>' +
			'<td>' + data[6] + '</td>' +
			'</tr>';

	}

	function generateXMLString(usuario, fechaActual, folioAjuste, fechaAjuste, area, datosArticulos, observaciones, acumulado) {
		return '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">' +
			'<pdf>' +
			'<head>' +
			'<link name="NotoSans" type="font" subtype="truetype" src="${nsfont.NotoSans_Regular}" src-bold="${nsfont.NotoSans_Bold}" src-italic="${nsfont.NotoSans_Italic}" src-bolditalic="${nsfont.NotoSans_BoldItalic}" bytes="2" />'

			+
			'<style type="text/css">' +
			'	table { font-size: 9pt; width: 100%; }' +
			'	th { font-weight: bold; font-size: 8pt; vertical-align: middle; padding: 5px 6px 3px; background-color: #e3e3e3; color: #333333; padding-bottom: 10px; padding-top: 10px; }' +
			'	td { padding: 4px 6px; }' +
			'	b { font-weight: bold; color: #333333; }' +
			'</style>'

			+
			'</head>' +
			'<body padding="0.5in 0.5in 0.5in 0.5in" size="A4-LANDSCAPE">' +
			'	<table>' +
			'	<tr>' +
			'		<td align="left">' +
			fechaActual +
			'		</td>' +
			'   	</tr>' +
			'    	<tr>' +
			'		<td align="center">' +
			'			<strong>TIENDAS CHAPUR, S.A. DE C.V</strong>' +
			'		</td>' +
			'   	</tr>' +
			'	<tr>' +
			'     	<td align="center">' +
			'			<strong>CALLE 63 No. 474 X 56 Y 54 CENTRO C.P 97000 MERIDA, YUCATAN, MEXICO</strong>' +
			'     	</td>' +
			'   	</tr>' +
			'   	<tr>' +
			'     	<td align="center">' +
			'       		<strong>IMPRESIÓN DE FOLIOS DE AJUSTE </strong>' +
			'     	</td>' +
			'   	</tr>' +
			'</table>' +
			'<table>' +
			'   <tr>' +
			'     <td align="center">' +
			'       # de Folio: ' + folioAjuste +
			'     </td>' +
			'     <td align="center">' +
			'       Fecha Elaboración: ' + fechaAjuste +
			'     </td>' +
			'     <td align="center">' +
			'       Área: ' + area +
			'     </td>' +
			'   </tr>' +
			'</table>'


			+
			'<table>' +
			'<thead>' +
			'	<tr>' +
			'	<th><span class="nscke-label" title="COLUMNA1">Num. Art.</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA2">Artículo</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA3">Ajuste</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA4">Imp. Vta.</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA5">Imp. Costo.</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA6">C. Prem. Uni.</span></th>' +
			'	<th><span class="nscke-label" title="COLUMNA7">Motivo</span></th>' +
			'	</tr>' +
			'</thead>'

			+
			generateFilas(datosArticulos)

			+
			'<tr style="border-top: 1pt solid black;">' +
			'<td>' + '</td>' +
			'<td>' + '</td>' +
			'<td  align="center"> <strong>' + acumulado.cantidad_ajuste + '</strong> </td>' +
			'<td  align="center"> <strong>' + acumulado.cantidad_impt_vnta + '</strong> </td>' +
			'<td  align="center"> <strong>' + acumulado.cantidad_impt_cost + '</strong> </td>' +
			'<td  align="center"> <strong>' + acumulado.cantidad_preci_uni + '</strong> </td>' +
			'<td>' + '</td>' +
			'</tr>' +
			'</table>'

			+
			'<br />'

			+
			'<table>' +
			'<tr>' +
			'	<td width="30%">' +
			'		<strong>' +
			'			Observaciones:' +
			'		</strong>' +
			'	</td>' +
			'	<td width="70%">' +
			observaciones +
			'	</td>' +
			'</tr>' +
			'</table>'

			+
			'<br />' +
			'<br />'

			+
			'<table>' +
			' 	<tr>' +
			'   		<td width="50%" align="center">' +
			'				<strong>' +
			'             	Elaboró:' +
			'           	</strong>' +
			'       	</td>' +
			'   		<td width="50%" align="center">' +
			'           	<strong>' +
			'             	Autorizó:' +
			'           	</strong>' +
			'       	</td>' +
			' 		</tr>' +
			'       	<tr>' +
			'           	<td width="50%" align="center">' +
			usuario +
			'           	</td>' +
			'           	<td width="50%" align="center">' +
			'             	<strong>' +
			'               		_________________________________' +
			'            		</strong>' +
			'           	</td>' +
			'		</tr>' +
			'</table>  '

			+
			'</body>' +
			'</pdf>';
	}


	return {
		generateXMLString: generateXMLString
	}

});