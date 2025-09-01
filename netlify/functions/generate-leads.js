/* Esta es una función serverless que actuará como un intermediario (proxy) seguro 
  entre tu aplicación (el navegador del usuario) y la API de Google.
  La clave de API se almacena de forma segura en Netlify y nunca se expone al usuario.
*/
exports.handler = async function(event) {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Obtener el prompt y el esquema del cuerpo de la petición del cliente
    const { prompt, schema } = JSON.parse(event.body);
    
    // Obtener la clave de API desde las variables de entorno seguras de Netlify
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Si la clave no está configurada, devolver un error
        console.error('API key not configured in Netlify environment variables.');
        return { statusCode: 500, body: JSON.stringify({ error: 'La clave de API no está configurada en el servidor.' }) };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    };
    
    // Llamar a la API de Gemini desde el servidor de Netlify
    const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // Si la respuesta de Google no es exitosa, devolver el error
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Error:", errorBody);
      return { statusCode: geminiResponse.status, body: JSON.stringify({ error: `Error en la API de Gemini: ${errorBody}` }) };
    }

    const data = await geminiResponse.json();

    // Devolver la respuesta exitosa de Google al cliente
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    // Capturar cualquier otro error inesperado
    console.error('Error in serverless function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
