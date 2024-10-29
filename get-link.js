const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();

// Configuración de Google Sheets API
const sheets = google.sheets('v4');
const SHEET_ID = '1vfpez0cdPmo7PTvWtV6QK61lZqZ8cR6CV0GeAdEn98k';  // Cambia este valor si tu Google Sheet es diferente
const RANGE = 'BBDD!A:E';  // Columna A: RUT, Columna B: Link Taller, Columna C: Nombre Completo Correcto

// Función para buscar el nombre y el link del taller en Google Sheets
async function getTallerInfo(rut) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],  // Permisos de solo lectura
  });
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,  // ID de la hoja de Google Sheets
    range: RANGE,  // Rango de columnas (A, B y C)
    auth: client,
  });
  
  const rows = res.data.values;
  const result = rows.find(row => row[1] === rut);  // Buscar el RUT en la primera columna
  
  if (result) {
    return {
      linkTaller: result[4],  // Columna B es el Link Taller
      nombre: result[0]  // Columna C es el Nombre Completo Correcto
    };
  } else {
    throw new Error('Información no encontrada para el RUT proporcionado');
  }
}

// Función para enviar mensaje a MessageBird
async function agregarContactoAFlow(NOMBRE, CELULAR, AREA, MENSAJE, flow) {
  const url = `https://flows.messagebird.com/flows/${flow}/invoke`;  // URL del flujo de MessageBird
  const headers = {
    'NOMBRE': NOMBRE,        // Nombre completo del usuario
    'CELULAR': CELULAR,      // Número de celular
    'AREA': AREA,            // Fijo como "OTROS"
    'MENSAJE': MENSAJE       // Mensaje personalizado con el link
  };

  const response = await axios.post(url, {}, { headers });  // Realiza la solicitud POST a MessageBird
  return response.data;
}

// Endpoint para recibir el RUT y CELULAR desde la URL
app.get('/api/get-link/:celular/:rut', async (req, res) => {
  const { celular, rut } = req.params;  // Capturar los parámetros de la URL (celular y RUT)

  try {
    const { linkTaller, nombre } = await getTallerInfo(rut);  // Buscar el nombre y el link del taller
    const flow = "bb848b58-c891-4aec-ac21-738a857bc778";  // Nuevo flow proporcionado
    const area = "OTROS";  // Área fija
    const mensaje = `SU LINK ES ${linkTaller}`;  // Mensaje personalizado con el link del taller

    // Enviar los datos a MessageBird
    const messageResponse = await agregarContactoAFlow(nombre, celular, area, mensaje, flow);
    
    res.json({ success: true, message: "Mensaje enviado", data: messageResponse });  // Respuesta exitosa
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });  // Manejo de errores
  }
});

module.exports = app;  // Exporta la aplicación para que Vercel pueda usarla

