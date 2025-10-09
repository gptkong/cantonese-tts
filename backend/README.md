# TTS Service API

A production-grade, high-performance text-to-speech (TTS) backend service built with Python, FastAPI, and edge-tts. This service provides a RESTful API for converting text to natural-sounding speech audio.

## Features

- **Fast & Async**: Built with FastAPI for high-performance asynchronous request handling
- **Streaming Responses**: Efficient audio streaming to minimize memory usage
- **Voice Variety**: Supports multiple languages and voices via Microsoft Edge TTS
- **Caching**: 24-hour voice list caching for optimal performance
- **Validation**: Comprehensive input validation using Pydantic models
- **RESTful API**: Clean, well-documented API endpoints with OpenAPI/Swagger support

## Tech Stack

- **Python 3.9+**
- **FastAPI**: Modern async web framework
- **edge-tts**: Microsoft Edge Text-to-Speech engine
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation

## Project Structure

```
/tts-service
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application and routes
│   ├── models.py         # Pydantic request models
│   ├── tts_generator.py  # Core TTS logic
│   └── utils.py          # Helper functions (voice list, caching)
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager

### Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd tts-service
   ```

2. **Create a virtual environment (recommended)**:
   ```bash
   python -m venv venv

   # On Windows
   venv\Scripts\activate

   # On Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service

Start the server using Uvicorn:

```bash
uvicorn app.main:app --reload
```

The service will be available at:
- **API**: http://127.0.0.1:8000
- **Interactive Docs (Swagger)**: http://127.0.0.1:8000/docs
- **ReDoc Documentation**: http://127.0.0.1:8000/redoc

For production deployment, remove `--reload` and specify host/port:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### 1. Get Available Voices (Cached)

Retrieve the list of all available voices supported by edge-tts with 24-hour caching.

**Endpoint**: `GET /api/v1/voices`

**Response**: JSON array of voice objects (cached)

**Example**:
```bash
curl http://127.0.0.1:8000/api/v1/voices
```

**Response Sample**:
```json
[
  {
    "Name": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
    "ShortName": "zh-CN-XiaoxiaoNeural",
    "Gender": "Female",
    "Locale": "zh-CN"
  },
  {
    "Name": "Microsoft Yunxi Online (Natural) - Chinese (Mandarin, Simplified)",
    "ShortName": "zh-CN-YunxiNeural",
    "Gender": "Male",
    "Locale": "zh-CN"
  }
]
```

### 2. List Voices (Direct from edge-tts)

Get the most up-to-date voice list directly from edge-tts without caching.

**Endpoint**: `GET /api/v1/list-voices`

**Response**: JSON array of voice objects with complete information

**Example**:
```bash
curl http://127.0.0.1:8000/api/v1/list-voices
```

**Response Sample**:
```json
[
  {
    "Name": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
    "ShortName": "zh-CN-XiaoxiaoNeural",
    "Gender": "Female",
    "Locale": "zh-CN",
    "SuggestedCodec": "audio-24khz-48kbitrate-mono-mp3",
    "FriendlyName": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
    "Status": "GA"
  }
]
```

**Note**: This endpoint calls `edge_tts.list_voices()` directly and returns the complete voice data without caching. Use this when you need the latest voice information or additional fields like `SuggestedCodec`, `FriendlyName`, and `Status`.

### 3. Generate Speech

Convert text to speech and receive audio stream.

**Endpoint**: `POST /api/v1/generate`

**Content-Type**: `application/json`

**Request Body**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to convert to speech |
| `voice` | string | Yes | - | Voice ShortName (e.g., `zh-CN-XiaoxiaoNeural`) |
| `rate` | string | No | `"+0%"` | Speech rate adjustment (e.g., `"+20%"`, `"-10%"`) |
| `volume` | string | No | `"+0%"` | Volume adjustment (e.g., `"+20%"`, `"-10%"`) |
| `pitch` | string | No | `"+0Hz"` | Pitch adjustment (e.g., `"+5Hz"`, `"-5Hz"`) |

**Response**: Audio stream (`audio/mpeg`)

**Examples**:

1. **Basic usage** (Chinese):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/generate" \
     -H "Content-Type: application/json" \
     -d '{"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"}' \
     --output output.mp3
```

2. **With custom parameters** (English):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello, welcome to our text-to-speech service!",
       "voice": "en-US-AriaNeural",
       "rate": "+10%",
       "volume": "+5%",
       "pitch": "+2Hz"
     }' \
     --output speech.mp3
```

3. **Using Python requests**:
```python
import requests

url = "http://127.0.0.1:8000/api/v1/generate"
payload = {
    "text": "This is a test.",
    "voice": "en-US-GuyNeural",
    "rate": "+0%",
    "volume": "+0%",
    "pitch": "+0Hz"
}

response = requests.post(url, json=payload)

if response.status_code == 200:
    with open("output.mp3", "wb") as f:
        f.write(response.content)
    print("Audio saved to output.mp3")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK**: Successful request
- **400 Bad Request**: Invalid voice name or malformed request
- **422 Unprocessable Entity**: Validation error (missing required fields)
- **500 Internal Server Error**: Server-side error during TTS generation

**Error Response Example**:
```json
{
  "detail": "Invalid voice name: invalid-voice. Use /api/v1/voices to get available voices."
}
```

## Performance Optimization

- **Streaming**: Audio is streamed chunk-by-chunk, reducing memory usage
- **Caching**: Voice list is cached for 24 hours to avoid repeated API calls
- **Async Operations**: All I/O operations are asynchronous for better concurrency

## Development

### Running in Development Mode

```bash
uvicorn app.main:app --reload --log-level debug
```

### Testing the API

Visit http://127.0.0.1:8000/docs for interactive API documentation where you can test endpoints directly in your browser.

## License

This project uses the open-source `edge-tts` library. Please refer to its license for usage terms.

## Support

For issues or questions:
1. Check the interactive API docs at `/docs`
2. Ensure your voice name is valid by checking `/api/v1/voices`
3. Verify request format matches the examples above

---

**Built with ❤️ using FastAPI and edge-tts**
