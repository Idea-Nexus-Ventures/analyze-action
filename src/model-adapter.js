/**
 * OpenRouter Model Adapter
 * Handles LLM API calls via OpenRouter
 */

export class ModelAdapter {
  constructor(config = {}) {
    this.openrouterKey = config.openrouterKey || process.env.OPENROUTER_API_KEY;
    this.defaultModel = config.defaultModel || 'anthropic/claude-3.5-sonnet';
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    if (!this.openrouterKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  async call(model, prompt, options = {}) {
    const requestBody = {
      model: model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 8000
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openrouterKey}`,
          'HTTP-Referer': 'https://github.com/idea-nexus-ventures/analyze-action',
          'X-Title': 'Consciousness Lab GitHub Action'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      return {
        text: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage
      };
    } catch (error) {
      throw new Error(`Failed to call LLM: ${error.message}`);
    }
  }

  async callWithJSON(model, prompt, options = {}) {
    const response = await this.call(model, prompt, options);
    
    try {
      // Try to extract JSON from response - handle both objects and arrays
      const jsonMatch = response.text.match(/[\{\[][\s\S]*[\}\]]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        // Try to find the complete JSON by counting braces/brackets
        let braceCount = 0;
        let bracketCount = 0;
        let endPos = 0;
        
        for (let i = 0; i < jsonStr.length; i++) {
          const char = jsonStr[i];
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
          
          if (braceCount === 0 && bracketCount === 0 && i > 0) {
            endPos = i + 1;
            break;
          }
        }
        
        const completeJson = jsonStr.substring(0, endPos);
        return JSON.parse(completeJson);
      }
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${e.message}`);
    }

    throw new Error('No valid JSON found in response');
  }
}

