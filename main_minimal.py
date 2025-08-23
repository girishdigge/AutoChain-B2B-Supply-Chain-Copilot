#!/usr/bin/env python3
"""
Minimal version of main.py for testing
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test websocket components import
try:
    from websocket_manager import WebSocketManager
    from clarification_handler import ClarificationHandler  
    from processing_orchestrator import ProcessingOrchestrator
    logger.info("✓ WebSocket components imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import websocket components: {e}")
    raise

# Initialize components
try:
    websocket_manager = WebSocketManager()
    clarification_handler = ClarificationHandler(websocket_manager)
    orchestrator = ProcessingOrchestrator(websocket_manager, clarification_handler)
    logger.info("✓ WebSocket components initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize websocket components: {e}")
    raise

# FastAPI app
app = FastAPI(title="Minimal Test API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Minimal test API is running"}

@app.get("/health")
async def health_check():
    """Test health check with websocket stats"""
    try:
        stats = websocket_manager.get_connection_stats()
        clarification_stats = clarification_handler.get_stats()
        processing_stats = orchestrator.get_session_stats()
        
        return {
            "status": "healthy",
            "websocket_stats": stats,
            "clarification_stats": clarification_stats,
            "processing_stats": processing_stats
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "error": str(e)}

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")
    await websocket_manager.shutdown()

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting minimal test server...")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")