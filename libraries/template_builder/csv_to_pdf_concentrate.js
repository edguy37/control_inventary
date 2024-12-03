define([], function () {

	function generateFilas(filasItems, orderID, name_file)
	{
		var xmlFilas = "";

		for (let index = 0; index < filasItems.length; index++) {
	
			xmlFilas += createFila(filasItems[index], orderID, name_file);			
		}

		return xmlFilas;
	}

	function createFila(data, orderID, name_file)
	{
		return '<tr>'
			+ '<td align="left">' + data.vendor.split(" ").slice(0,1) + '</td>'
			+ '<td align="left">' + data.itemid.split(" : ").pop() + '</td>'
			+ '<td align="left">' + data.displayname + '</td>'
			+ '<td align="left">' + data.size + '</td>'
			+ '<td align="left">' + data.color + '</td>'
			+ '<td align="left">' + escapeHtml(data.salesdescription) + '</td>'
			+ '<td align="left">' + data.count + '</td>'
            + '<td align="left">' + Number(data.average_cost) + '</td>'
            + '<td align="left">' + data.count * Number(data.average_cost) + '</td>'
            + '<td align="left">' + orderID + '</td>'
            + '<td align="left">' + name_file + '</td>'
			+ '</tr>';
	}
	// Reemplazar caracteres especiales por su equivalente, evitando error al convertir
	function escapeHtml(cadena) {
		return cadena.replace(/&/g, "&amp;")
				  .replace(/</g, "&lt;")
				  .replace(/>/g, "&gt;")
				  .replace(/"/g, "&quot;")
				  .replace(/'/g, "&#039;");
	}	

	function generateXMLString(area, departamento, fechaOrden, filasArticulos, orderID, name_file)
	{		
		return '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">'
		+ '<pdf>'
		+ '<head>'
		+ '<link name="NotoSans" type="font" subtype="truetype" src="${nsfont.NotoSans_Regular}" src-bold="${nsfont.NotoSans_Bold}" src-italic="${nsfont.NotoSans_Italic}" src-bolditalic="${nsfont.NotoSans_BoldItalic}" bytes="2" />'
		
		+ '<style type="text/css">'
		+ '	table { font-size: 9pt; width: 100%; }'
		+ '	th { font-weight: bold; font-size: 8pt; vertical-align: middle; padding: 5px 6px 3px; background-color: #e3e3e3; color: #333333; padding-bottom: 10px; padding-top: 10px; }'
		+ '	td { padding: 4px 6px; }'
		+ '	b { font-weight: bold; color: #333333; }'
		+ '</style>'
		
		+ '</head>'
		+ '<body padding="0.5in 0.5in 0.5in 0.5in" size="A4-LANDSCAPE">'     
		+ '	<table>'
		+ '    	<tr>'
		+ '		    <td align="center">'
		+ '			    <strong>TIENDAS CHAPUR, S.A. DE C.V : ' + area + '</strong>'
		+ '		    </td>'
		+ '   	</tr>'
		+ '   	<tr>'
		+ '     	<td align="center">'
		+ '       		<strong>'+ departamento + '</strong>'
		+ '     	</td>'
		+ '   	</tr>'
        + '    	<tr>'
		+ '		    <td align="center">'
		+ '			    <strong> CONSULTA DE ARTICULOS INVENTARIADOS</strong>'
		+ '		    </td>'
		+ '   	</tr>'        
        + '   	<tr>'
		+ '     	<td align="center">'
		+ '       		<strong>Fecha y Hora: '+ fechaOrden + '</strong>'
		+ '     	</td>'
		+ '   	</tr>'
		+ '</table>' 
		
		+ '<table>'
		+ '<thead>'
		+ '	<tr>'
		+ '	<th><span class="nscke-label">Proveedor</span></th>'
		+ '	<th><span class="nscke-label">Numart</span></th>'
		+ '	<th><span class="nscke-label">Modelo</span></th>'
		+ '	<th><span class="nscke-label">Talla</span></th>'
		+ '	<th><span class="nscke-label">Color</span></th>'
		+ '	<th><span class="nscke-label">Descripción</span></th>'
		+ '	<th><span class="nscke-label">Leido</span></th>'
        + '	<th><span class="nscke-label">Costo Prom</span></th>'
        + '	<th><span class="nscke-label">Costo Total</span></th>'
        + '	<th><span class="nscke-label">Folio</span></th>'
        + '	<th><span class="nscke-label">Mueble</span></th>'
		+ '	</tr>'
		+ '</thead>'

		+	generateFilas(filasArticulos, orderID, name_file)

        +  '<tr></tr>'
        +  '<tr>'
        +   '<td></td>'
        +   '<td></td>'
        +   '<td></td>'
        +   '<td></td>'
        +   '<td></td>'
        +   '<td align="right"><strong>Total Articulos:</strong></td>'
        +   '<td align="center">'
        +       '<strong>' + filasArticulos.map(articulo => articulo.count).reduce((prev, curr) => prev + curr, 0) + '</strong>'
        +   '</td>'        
        +  '</tr>'

		+ '</table>'

		+ '<br />'

		+ '<table>'
		+ '<tr>'
		+ '	<td width="30%">'
		+ '		<strong>'
		+ '			Nombre:'
		+ '		</strong>'
		+ '	</td>'
		+ '	<td width="70%">'
        + '     <strong>'
		+ '         _________________________________'
        + '     </strong>'
		+ '	</td>'
		+ '</tr>'	 
		+ '</table>'

		+ '</body>' 
		+ '</pdf>';
	}

	return {
        generateXMLString: generateXMLString,
		generateFilas : generateFilas
    }

});