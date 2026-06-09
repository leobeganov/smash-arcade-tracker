/**
 * Smashalytics - Gemini AI Module
 * Directly integrates the Google Gemini Vision API to interpret screenshots client-side.
 */

const DEFAULT_MODEL = 'gemini-3.5-flash'; // Widely available, super fast, and supports structured JSON schema

const Gemini = {
  /**
   * Sends a base64 encoded image to the Gemini API for parsing.
   * Uses structured output schema to guarantee a clean JSON response.
   * @param {string} base64Data - Base64 string of the image (without metadata prefix)
   * @param {string} mimeType - e.g., 'image/jpeg' or 'image/png'
   * @param {string} apiKey - The user's Gemini API Key
   * @returns {Promise<Object>} The parsed match details
   */
  async interpretScreenshot(base64Data, mimeType, apiKey, characterList = [], stageList = []) {
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please set it in the Settings tab.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

    const systemInstruction = `You are a highly precise OCR and computer vision system specializing in Super Smash Bros Ultimate screenshots.
Your job is to analyze the uploaded screenshot, determine its screen type, and extract all relevant gameplay details.

Screenshots can be of the following types:
1. "EndScreen" (either the Victory Screen showing characters in rank boxes, or the Detailed Results Table Screen showing KOs, Falls, and SDs in vertical columns for each player).
2. "StartScreen" (versus loading screen presenting character matchups side-by-side).
3. "Match" (gameplay screenshot showing fighters on-stage, percentages, and stocks at the bottom).
4. "StageSelection" (grid of stages with the selected stage preview on the left).

Instructions for EndScreen / Detailed Results:
- Supports matches with 2 to 8 players (P1 through P8). Look for all visible player panels or columns (anywhere from 2 to 8 players can participate).
- Identify the Game Style:
  - If players are on a team, they will share a team color (their character names or boxes share red, blue, green, or yellow outlines/backgrounds on the results screen). Set "gameStyle" to "Teams".
  - Otherwise, set "gameStyle" to "Free-for-All".
- Extract player numbers (P1, P2, P3, P4, P5, P6, P7, P8) and custom nicknames (e.g., 'jack', 'polo', 'Matt', 'sylv') which are usually small text near the player numbers.
- Extract characters (e.g., 'Donkey Kong', 'Ness', 'Pikachu', 'Zero Suit Samus', 'Bayonetta', 'Richter', 'Terry', 'Mario', etc.).
- Extract 'kos', 'falls', and 'sds' from the vertical stats grid if visible. Note: Falls and SDs are shown as negative numbers (e.g., -2 or -3), extract them as positive or negative integers exactly as shown.
- Extract 'outAt' which is the survival time shown in the Results screen (e.g. '2:48', '1:42') or '---' for the winner (1st place).
- If it is a team game ("Teams"), extract the shared team color for each player ("Red", "Blue", "Green", "Yellow"). If it is a Free-for-All, set team color to "None" for all players.

Instructions for Stage Selection:
- Identify the selected stage name shown in the large left panel (e.g., 'Small Battlefield', 'Battlefield', 'Final Destination').
- Extract game rules/mode if visible at the top (e.g., '3 Stock - 5:00').

Always return your response in the specified JSON structure. Ensure all numeric strings are correctly parsed into integers.`;

    const prompt = "Please analyze this Super Smash Bros. Ultimate screenshot and extract all match results, players, characters, placements, and stage data according to the schema. Be extremely accurate with player nicknames and placements.";

    // Custom response schema that dynamically uses custom enum restrictions for guaranteed OCR accuracy
    const responseSchema = {
      type: "OBJECT",
      properties: {
        screenType: { 
          type: "STRING", 
          enum: ["EndScreen", "StartScreen", "Match", "StageSelection"],
          description: "The layout type of the screenshot."
        },
        stage: { 
          type: "STRING", 
          description: "The name of the stage, e.g. 'Small Battlefield', 'Battlefield', 'Final Destination'. Default to 'Small Battlefield' if unknown." 
        },
        rules: { 
          type: "STRING", 
          description: "Match rules, e.g. '3 Stock, 5:00'" 
        },
        gameMode: { 
          type: "STRING", 
          enum: ["1v1", "3-Player", "4-Player", "5-Player", "6-Player", "7-Player", "8-Player"],
          description: "Determine game mode from the number of players participating." 
        },
        gameStyle: {
          type: "STRING",
          enum: ["Free-for-All", "Teams"],
          description: "Identify if the game is Free-for-All or a Team game (where players share a team color)."
        },
        players: {
          type: "ARRAY",
          description: "List of players and their statistics, ordered by placement (1st place first).",
          items: {
            type: "OBJECT",
            properties: {
              playerNumber: { 
                type: "STRING", 
                description: "P1 through P8" 
              },
              playerName: { 
                type: "STRING", 
                description: "The player's nickname, e.g., 'jack', 'polo', 'Matt', 'sylv'. If no name is shown, use player number." 
              },
              character: { 
                type: "STRING", 
                description: "The Smash character name (e.g., Donkey Kong, Ness, Pikachu, Zero Suit Samus, Richter, Bayonetta, Terry)." 
              },
              placement: { 
                type: "INTEGER", 
                description: "Placement rank: 1, 2, 3, 4, 5, 6, 7, or 8" 
              },
              outAt: { 
                type: "STRING", 
                description: "Time of elimination, e.g. '3:15' or '---' if they survived (usually the 1st place winner)" 
              },
              kos: { 
                type: "INTEGER", 
                description: "Number of KOs" 
              },
              falls: { 
                type: "INTEGER", 
                description: "Number of falls (deaths), as a positive or negative integer" 
              },
              sds: { 
                type: "INTEGER", 
                description: "Number of self-destructs, as a positive or negative integer" 
              },
              teamColor: {
                type: "STRING",
                enum: ["Red", "Blue", "Green", "Yellow", "None"],
                description: "The team color if gameStyle is 'Teams'. Otherwise 'None'."
              }
            },
            required: ["playerNumber", "character"]
          }
        }
      },
      required: ["screenType", "players"]
    };

    // Strict validation injection
    if (characterList && characterList.length > 0) {
      responseSchema.properties.players.items.properties.character.enum = characterList;
    }
    if (stageList && stageList.length > 0) {
      responseSchema.properties.stage.enum = stageList;
    }

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      generation_config: {
        response_mime_type: "application/json",
        response_schema: responseSchema
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP error! Status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        throw new Error('No content returned from Gemini API.');
      }

      // Parse the JSON text returned from Gemini
      const parsedData = JSON.parse(textResponse);
      
      // Auto-calculate gameMode based on player count if missing
      if (!parsedData.gameMode && parsedData.players) {
        const count = parsedData.players.length;
        parsedData.gameMode = count === 2 ? '1v1' : `${count}-Player`;
      }
      if (!parsedData.gameStyle) {
        parsedData.gameStyle = 'Free-for-All';
      }

      return parsedData;
    } catch (e) {
      console.error('Error invoking Gemini Vision API:', e);
      throw e;
    }
  }
};

// Bind to window to allow standard non-module script loading (fixes CORS over file://)
window.Gemini = Gemini;
