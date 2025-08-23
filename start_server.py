#!/usr/bin/env python3
"""
Server startup script with better error handling
"""
import sys
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info("Starting Enhanced Portia Order Processing API...")
        
        # Test imports first
        logger.info("Testing imports...")
        
        try:
            from websocket_manager import WebSocketManager
            from clarification_handler import ClarificationHandler
            from processing_orchestrator import ProcessingOrchestrator
            logger.info("✓ WebSocket components imported successfully")
        except Exception as e:
            logger.error(f"❌ Failed to import websocket components: {e}")
            traceback.print_exc()
            return 1
        
        # Test initialization
        logger.info("Testing component initialization...")
        try:
            websocket_manager = WebSocketManager()
            clarification_handler = ClarificationHandler(websocket_manager)
            orchestrator = ProcessingOrchestrator(websocket_manager, clarification_handler)
            logger.info("✓ WebSocket components initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize websocket components: {e}")
            traceback.print_exc()
            return 1
        
        # Import and start main app
        logger.info("Starting main application...")
        try:
            import main
            import uvicorn
            
            logger.info("🚀 Starting server on http://0.0.0.0:8000")
            uvicorn.run(main.app, host="0.0.0.0", port=8000, log_level="info")
            
        except Exception as e:
            logger.error(f"❌ Failed to start server: {e}")
            traceback.print_exc()
            return 1
            
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return 0
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())