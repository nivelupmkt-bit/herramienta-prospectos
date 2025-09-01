const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { GEMINI_API_KEY } = process.env;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const { prompt } = JSON.parse(event.body);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error desde la API de Gemini:', errorBody);
            return { statusCode: response.status, body: `Error en la API de Gemini: ${errorBody}` };
        }

        const data = await response.json();
        
        // 1. Extraer el texto crudo de la respuesta de la API
        let jsonText = data.candidates[0].content.parts[0].text;
        
        // 2. Limpiar el texto: encontrar el primer '[' y el último ']' para extraer el string del array JSON
        const startIndex = jsonText.indexOf('[');
        const endIndex = jsonText.lastIndexOf(']');

        if (startIndex === -1 || endIndex === -1) {
            console.error('Respuesta cruda de la API:', jsonText);
            throw new Error('Respuesta de la API no contiene un array JSON válido.');
        }

        const cleanedJsonString = jsonText.substring(startIndex, endIndex + 1);

        // 3. Validar y enviar
        try {
            // Prueba si es un JSON válido parseándolo aquí.
            JSON.parse(cleanedJsonString); 
            
            // Si se parsea correctamente, envía el string limpio.
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: cleanedJsonString,
            };
        } catch (parseError) {
             console.error('Error al parsear el JSON limpio:', cleanedJsonString);
             throw new Error(`Error al procesar la respuesta JSON de la API: ${parseError.message}`);
        }

    } catch (error) {
        console.error('Error en la función serverless:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Error interno del servidor: ${error.message}` }) };
    }
};

