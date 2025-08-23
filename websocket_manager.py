# Enhanced WebSocket Connection Manager
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from fastapi import WebSocket, WebSocketDisconnect
from websocket_models import (
    BaseMessage, MessageValidator, ProcessingSession, WebSocketConnection,
    ErrorMessage, ConnectionAcknowledged, HeartbeatMessage
)

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.connection_info: Dict[str, WebSocketConnection] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.processing_sessions: Dict[str, ProcessingSession] = {}
        self.heartbeat_interval = 30  # seconds
        self.connection_timeout = 300  # seconds
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._background_tasks_started = False
        # Store main event loop reference for tools to use
        self._main_loop = None
        try:
            self._main_loop = asyncio.get_running_loop()
            logger.info(f"[WebSocketManager] Stored main event loop: {self._main_loop}")
        except RuntimeError:
            logger.info("[WebSocketManager] No running event loop found during initialization")
    
    def _start_background_tasks(self):
        """Start background tasks for heartbeat and cleanup"""
        if self._background_tasks_started:
            return
            
        try:
            # Only start if we have a running event loop
            loop = asyncio.get_running_loop()
            # Store the main loop reference
            self._main_loop = loop
            logger.info(f"[WebSocketManager] Updated main event loop reference: {self._main_loop}")
            
            if self._heartbeat_task is None or self._heartbeat_task.done():
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            if self._cleanup_task is None or self._cleanup_task.done():
                self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            self._background_tasks_started = True
            logger.info("[WebSocketManager] Background tasks started")
        except RuntimeError:
            # No event loop running, tasks will be started when first connection is made
            logger.info("[WebSocketManager] No event loop running, background tasks will start later")
    
    async def connect(self, websocket: WebSocket, client_id: str) -> bool:
        """Accept websocket connection and register client"""
        try:
            await websocket.accept()
            
            # Start background tasks if not already started
            if not self._background_tasks_started:
                self._start_background_tasks()
            
            # Store connection
            self.connections[client_id] = websocket
            self.connection_info[client_id] = WebSocketConnection(
                client_id=client_id,
                connected_at=datetime.utcnow()
            )
            
            logger.info(f"[WebSocketManager] Client {client_id} connected")
            
            # Send connection acknowledgment
            await self.send_message(
                client_id,
                "connection_acknowledged",
                ConnectionAcknowledged(
                    client_id=client_id,
                    server_capabilities=["order_processing", "clarifications", "real_time_updates"]
                )
            )
            
            return True
            
        except Exception as e:
            logger.error(f"[WebSocketManager] Error connecting client {client_id}: {e}")
            return False
    
    async def disconnect(self, client_id: str, reason: str = "Client disconnected"):
        """Disconnect client and cleanup resources"""
        if client_id not in self.connections:
            logger.debug(f"[WebSocketManager] Client {client_id} already disconnected")
            return
        
        try:
            # Cancel any active processing sessions for this client
            if client_id in self.connection_info:
                connection = self.connection_info[client_id]
                for run_id in connection.processing_sessions.copy():
                    await self.cancel_processing_session(run_id, f"Client disconnected: {reason}")
            
            # Close websocket connection
            if client_id in self.connections:
                websocket = self.connections[client_id]
                try:
                    await websocket.close()
                except Exception:
                    pass  # Connection might already be closed
                
                # Remove from tracking
                del self.connections[client_id]
            
            if client_id in self.connection_info:
                del self.connection_info[client_id]
            
            logger.info(f"[WebSocketManager] Client {client_id} disconnected: {reason}")
            
        except Exception as e:
            logger.error(f"[WebSocketManager] Error disconnecting client {client_id}: {e}")
    
    async def send_message(self, client_id: str, message_type: str, data: Any) -> bool:
        """Send message to specific client"""
        if client_id not in self.connections:
            logger.warning(f"[WebSocketManager] Client {client_id} not connected; cannot send {message_type}")
            return False
        
        try:
            # Serialize message with proper datetime handling
            if hasattr(data, 'dict'):
                message_data = data.dict()
            elif isinstance(data, dict):
                message_data = data.copy()
            else:
                message_data = {"content": str(data)}
            
            # Convert datetime objects to ISO strings
            message_data = self._serialize_datetime_objects(message_data)
            
            message = {
                "type": message_type,
                "data": message_data,
                "timestamp": datetime.utcnow().isoformat(),
                "client_id": client_id
            }
            
            # Send message
            websocket = self.connections[client_id]
            await websocket.send_text(json.dumps(message, default=str))
            
            # Update last activity
            if client_id in self.connection_info:
                self.connection_info[client_id].last_activity = datetime.utcnow()
            
            logger.debug(f"[WebSocketManager] Sent {message_type} to {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"[WebSocketManager] Error sending {message_type} to {client_id}: {e}")
            await self.disconnect(client_id, f"Send error: {str(e)}")
            return False
    
    def _serialize_datetime_objects(self, obj):
        """Recursively convert datetime objects to ISO strings"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {key: self._serialize_datetime_objects(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_datetime_objects(item) for item in obj]
        else:
            return obj
    
    async def broadcast_message(self, message_type: str, data: Any, exclude_clients: List[str] = None) -> int:
        """Broadcast message to all connected clients"""
        exclude_clients = exclude_clients or []
        sent_count = 0
        
        for client_id in list(self.connections.keys()):
            if client_id not in exclude_clients:
                if await self.send_message(client_id, message_type, data):
                    sent_count += 1
        
        return sent_count
    
    def register_message_handler(self, message_type: str, handler: Callable):
        """Register handler for specific message type"""
        self.message_handlers[message_type] = handler
        logger.info(f"[WebSocketManager] Registered handler for {message_type}")
    
    async def handle_message(self, client_id: str, raw_message: str) -> bool:
        """Handle incoming message from client"""
        try:
            # Parse JSON
            try:
                message_data = json.loads(raw_message)
            except json.JSONDecodeError as e:
                await self.send_error(client_id, "invalid_json", f"Invalid JSON: {str(e)}")
                return False
            
            # Extract message type and data
            message_type = message_data.get("type")
            data = message_data.get("data", {})
            
            if not message_type:
                await self.send_error(client_id, "missing_type", "Message type is required")
                return False
            
            # Validate message
            try:
                validated_data = MessageValidator.validate_message(message_type, data)
            except ValueError as e:
                await self.send_error(client_id, "validation_error", str(e))
                return False
            
            # Handle message
            if message_type in self.message_handlers:
                handler = self.message_handlers[message_type]
                try:
                    await handler(client_id, validated_data)
                    return True
                except Exception as e:
                    logger.error(f"[WebSocketManager] Handler error for {message_type}: {e}")
                    await self.send_error(client_id, "handler_error", f"Error processing {message_type}")
                    return False
            else:
                await self.send_error(client_id, "unknown_type", f"Unknown message type: {message_type}")
                return False
                
        except Exception as e:
            logger.error(f"[WebSocketManager] Error handling message from {client_id}: {e}")
            await self.send_error(client_id, "processing_error", "Error processing message")
            return False
    
    async def send_error(self, client_id: str, error_code: str, message: str, details: Dict[str, Any] = None):
        """Send error message to client"""
        error_msg = ErrorMessage(
            error_type="websocket_error",
            error_code=error_code,
            message=message,
            details=details or {},
            recoverable=True
        )
        await self.send_message(client_id, "error", error_msg)
    
    # Processing Session Management
    def create_processing_session(self, client_id: str, run_id: str) -> ProcessingSession:
        """Create new processing session"""
        session = ProcessingSession(
            run_id=run_id,
            client_id=client_id,
            status="started",
            start_time=datetime.utcnow()
        )
        
        self.processing_sessions[run_id] = session
        
        # Add to client's session list
        if client_id in self.connection_info:
            self.connection_info[client_id].add_processing_session(run_id)
        
        logger.info(f"[WebSocketManager] Created processing session {run_id} for client {client_id}")
        return session
    
    def get_processing_session(self, run_id: str) -> Optional[ProcessingSession]:
        """Get processing session by run_id"""
        return self.processing_sessions.get(run_id)
    
    async def update_processing_session(self, run_id: str, **updates) -> bool:
        """Update processing session"""
        if run_id not in self.processing_sessions:
            return False
        
        session = self.processing_sessions[run_id]
        for key, value in updates.items():
            if hasattr(session, key):
                setattr(session, key, value)
        
        session.last_activity = datetime.utcnow()
        return True
    
    async def cancel_processing_session(self, run_id: str, reason: str = "Cancelled"):
        """Cancel processing session"""
        if run_id not in self.processing_sessions:
            return
        
        session = self.processing_sessions[run_id]
        session.status = "cancelled"
        session.error = reason
        
        # Notify client
        await self.send_message(
            session.client_id,
            "processing_status",
            {
                "run_id": run_id,
                "status": "cancelled",
                "message": reason
            }
        )
        
        # Remove from client's session list
        if session.client_id in self.connection_info:
            self.connection_info[session.client_id].remove_processing_session(run_id)
        
        logger.info(f"[WebSocketManager] Cancelled processing session {run_id}: {reason}")
    
    def cleanup_processing_session(self, run_id: str):
        """Remove completed processing session"""
        if run_id in self.processing_sessions:
            session = self.processing_sessions[run_id]
            
            # Remove from client's session list
            if session.client_id in self.connection_info:
                self.connection_info[session.client_id].remove_processing_session(run_id)
            
            del self.processing_sessions[run_id]
            logger.info(f"[WebSocketManager] Cleaned up processing session {run_id}")
    
    # Background Tasks
    async def _heartbeat_loop(self):
        """Send periodic heartbeat messages"""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                if self.connections:
                    heartbeat = HeartbeatMessage(
                        active_connections=len(self.connections),
                        active_processing_sessions=len(self.processing_sessions)
                    )
                    
                    # Send heartbeat to each client individually to handle errors better
                    for client_id in list(self.connections.keys()):
                        try:
                            await self.send_message(client_id, "heartbeat", heartbeat)
                        except Exception as e:
                            logger.warning(f"[WebSocketManager] Failed to send heartbeat to {client_id}: {e}")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[WebSocketManager] Heartbeat error: {e}")
    
    async def _cleanup_loop(self):
        """Cleanup inactive connections and sessions"""
        while True:
            try:
                await asyncio.sleep(60)  # Run cleanup every minute
                
                current_time = datetime.utcnow()
                timeout_threshold = current_time - timedelta(seconds=self.connection_timeout)
                
                # Cleanup inactive connections
                inactive_clients = []
                for client_id, connection_info in self.connection_info.items():
                    if connection_info.last_activity < timeout_threshold:
                        inactive_clients.append(client_id)
                
                for client_id in inactive_clients:
                    await self.disconnect(client_id, "Connection timeout")
                
                # Cleanup old completed sessions
                old_sessions = []
                for run_id, session in self.processing_sessions.items():
                    if (session.status in ["completed", "failed", "cancelled"] and 
                        session.last_activity < timeout_threshold):
                        old_sessions.append(run_id)
                
                for run_id in old_sessions:
                    self.cleanup_processing_session(run_id)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[WebSocketManager] Cleanup error: {e}")
    
    # Connection Statistics
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "active_connections": len(self.connections),
            "active_processing_sessions": len(self.processing_sessions),
            "total_sessions_by_status": {
                status: len([s for s in self.processing_sessions.values() if s.status == status])
                for status in ["started", "running", "waiting_clarification", "completed", "failed", "cancelled"]
            }
        }
    
    async def shutdown(self):
        """Shutdown manager and cleanup resources"""
        logger.info("[WebSocketManager] Shutting down...")
        
        # Cancel background tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        # Disconnect all clients
        for client_id in list(self.connections.keys()):
            await self.disconnect(client_id, "Server shutdown")
        
        logger.info("[WebSocketManager] Shutdown complete")