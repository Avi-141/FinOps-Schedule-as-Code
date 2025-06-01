# cisco_ai_simple.py - Simple drop-in replacement for OpenAI
import requests
import base64
import os
import json
from typing import Dict, Any

def get_cisco_ai_response(messages: list, model: str = "gpt-4o", temperature: float = 0.1) -> Dict[str, Any]:
    """
    Simple drop-in replacement for OpenAI chat completions using Cisco AI
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Model name (default: gpt-4o)
        temperature: Temperature for response generation
    
    Returns:
        Dict with parsed response content (mimics OpenAI response structure)
    """
    try:
        # Get Cisco AI token
        token_url = 'https://id.cisco.com/oauth2/default/v1/token'
        credentials = f'{os.getenv("OKTA_CLIENT_ID")}:{os.getenv("OKTA_CLIENT_SECRET")}'
        encoded_creds = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        token_headers = {
            'Accept': '*/*',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {encoded_creds}'
        }
        
        token_response = requests.post(
            token_url, 
            headers=token_headers, 
            data='grant_type=client_credentials',
            timeout=30
        )
        token_response.raise_for_status()
        access_token = token_response.json()['access_token']
        
        # Step 2: Call Cisco AI endpoint
        ai_url = f"{os.getenv('OPENAI_ENDPOINT', 'https://chat-ai.cisco.com')}/openai/deployments/{model}/chat/completions"
        
        ai_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}',
            'api-key': access_token
        }
        
        ai_payload = {
            'messages': messages,
            'temperature': temperature,
            'response_format': {'type': 'json_object'},
            'user': json.dumps({"appkey": os.getenv("OPENAI_APPKEY")})
        }
        
        ai_response = requests.post(ai_url, headers=ai_headers, json=ai_payload, timeout=60)
        ai_response.raise_for_status()
        
        # Step 3: Return in OpenAI-compatible format
        cisco_result = ai_response.json()
        return {
            'choices': [{
                'message': {
                    'content': cisco_result['choices'][0]['message']['content']
                }
            }]
        }
        
    except Exception as e:
        print(f"❌ Cisco AI failed: {e}, falling back to OpenAI...")
        
        # Fallback to OpenAI
        if os.getenv("OPENAI_API_KEY"):
            from openai import OpenAI
            client = OpenAI()
            return client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"}
            )
        else:
            raise Exception("No AI provider available")