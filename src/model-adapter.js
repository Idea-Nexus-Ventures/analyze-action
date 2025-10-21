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
      max_tokens: options.maxTokens || 4000
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
      // Try to extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${e.message}`);
    }

    throw new Error('No valid JSON found in response');
  }
}

