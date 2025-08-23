# Enhanced WebSocket Message Protocol Models
from datetime import datetime
from typing import Dict, List, Optional, Any, Literal, Union
from pydantic import BaseModel, Field
import uuid


# Base Message Structure
class BaseMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    client_id: Optional[str] = None
    run_id: Optional[str] = None
    correlation_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))


# Processing Status Messages
class ProcessingStarted(BaseModel):
    run_id: str
    status: str = "started"
    message: str
    total_steps: Optional[int] = None


class ProcessingStatus(BaseModel):
    run_id: str
    status: Literal["starting", "running", "waiting_clarification", "completed", "failed", "cancelled"]
    current_step: Optional[str] = None
    message: Optional[str] = None
    progress_percentage: Optional[float] = None
    steps_completed: Optional[int] = None
    total_steps: Optional[int] = None


class ProcessingCompleted(BaseModel):
    run_id: str
    status: str = "completed"
    message: str
    final_output: Optional[Dict[str, Any]] = None
    processing_time_seconds: Optional[float] = None


# Step Update Messages
class StepUpdate(BaseModel):
    step_id: str
    step_name: str
    status: Literal["started", "running", "completed", "failed", "waiting", "skipped"]
    progress_percentage: Optional[float] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    tool_name: Optional[str] = None
    execution_time_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


# Clarification Messages
class ClarificationRequest(BaseModel):
    clarification_id: str
    question: str
    timeout_seconds: int = 300
    context: Optional[Dict[str, Any]] = None
    options: Optional[List[str]] = None  # For multiple choice questions
    required: bool = True


class ClarificationResponse(BaseModel):
    clarification_id: str
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ClarificationTimeout(BaseModel):
    clarification_id: str
    message: str = "Clarification request timed out"


class ClarificationAcknowledged(BaseModel):
    clarification_id: str
    message: str
    status: Literal["received", "processed", "error"]


# Command Messages (from frontend to backend)
class StartOrderProcessing(BaseModel):
    order_text: str
    options: Optional[Dict[str, Any]] = None


class CancelProcessing(BaseModel):
    run_id: str
    reason: Optional[str] = None


class GetProcessingStatus(BaseModel):
    run_id: str


# Error Messages
class ErrorMessage(BaseModel):
    error_type: str
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    recoverable: bool = False
    suggested_action: Optional[str] = None
    run_id: Optional[str] = None


# Heartbeat and Connection Messages
class HeartbeatMessage(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    server_status: str = "healthy"
    active_connections: Optional[int] = None
    active_processing_sessions: Optional[int] = None


class ConnectionAcknowledged(BaseModel):
    client_id: str
    message: str = "Connection established successfully"
    server_capabilities: Optional[List[str]] = None


# Progress and Phase Messages
class PhaseTransition(BaseModel):
    run_id: str
    from_phase: Optional[str] = None
    to_phase: str
    phase_description: str
    estimated_duration_seconds: Optional[int] = None


class ProgressUpdate(BaseModel):
    run_id: str
    current_step: str
    progress_percentage: float
    estimated_time_remaining_seconds: Optional[int] = None
    message: Optional[str] = None


# Message Type Registry
MESSAGE_TYPES = {
    # Outgoing messages (backend to frontend)
    "processing_started": ProcessingStarted,
    "processing_status": ProcessingStatus,
    "processing_completed": ProcessingCompleted,
    "step_update": StepUpdate,
    "clarification_request": ClarificationRequest,
    "clarification_timeout": ClarificationTimeout,
    "clarification_acknowledged": ClarificationAcknowledged,
    "error": ErrorMessage,
    "heartbeat": HeartbeatMessage,
    "connection_acknowledged": ConnectionAcknowledged,
    "phase_transition": PhaseTransition,
    "progress_update": ProgressUpdate,
    
    # Incoming messages (frontend to backend)
    "start_order_processing": StartOrderProcessing,
    "clarification_response": ClarificationResponse,
    "cancel_processing": CancelProcessing,
    "get_processing_status": GetProcessingStatus,
}


# Message Validation and Serialization Utilities
class MessageValidator:
    @staticmethod
    def validate_message(message_type: str, data: Dict[str, Any]) -> BaseModel:
        """Validate and parse incoming message data"""
        if message_type not in MESSAGE_TYPES:
            raise ValueError(f"Unknown message type: {message_type}")
        
        model_class = MESSAGE_TYPES[message_type]
        try:
            return model_class(**data)
        except Exception as e:
            raise ValueError(f"Invalid data for message type {message_type}: {str(e)}")
    
    @staticmethod
    def serialize_message(message_type: str, data: BaseModel, client_id: str = None, run_id: str = None) -> Dict[str, Any]:
        """Serialize message for websocket transmission"""
        return {
            "type": message_type,
            "data": data.dict(),
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": client_id,
            "run_id": run_id,
            "correlation_id": str(uuid.uuid4())
        }


# Processing Session State
class ProcessingSession(BaseModel):
    run_id: str
    client_id: str
    status: Literal["started", "running", "waiting_clarification", "completed", "failed", "cancelled"]
    start_time: datetime
    current_step: Optional[str] = None
    current_phase: Optional[str] = None
    progress_percentage: float = 0.0
    steps_completed: int = 0
    total_steps: Optional[int] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    
    def update_progress(self, steps_completed: int, total_steps: int = None):
        """Update progress tracking"""
        self.steps_completed = steps_completed
        if total_steps:
            self.total_steps = total_steps
        if self.total_steps and self.total_steps > 0:
            self.progress_percentage = (self.steps_completed / self.total_steps) * 100
        self.last_activity = datetime.utcnow()


# WebSocket Connection State
class WebSocketConnection(BaseModel):
    client_id: str
    connected_at: datetime
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    processing_sessions: List[str] = []
    
    class Config:
        arbitrary_types_allowed = True
    
    def add_processing_session(self, run_id: str):
        """Add a processing session to this connection"""
        if run_id not in self.processing_sessions:
            self.processing_sessions.append(run_id)
        self.last_activity = datetime.utcnow()
    
    def remove_processing_session(self, run_id: str):
        """Remove a processing session from this connection"""
        if run_id in self.processing_sessions:
            self.processing_sessions.remove(run_id)
        self.last_activity = datetime.utcnow()


# Clarification Context
class ClarificationContext(BaseModel):
    clarification_id: str
    client_id: str
    run_id: str
    question: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    timeout_seconds: int = 300
    context: Optional[Dict[str, Any]] = None
    options: Optional[List[str]] = None
    status: Literal["pending", "responded", "timeout", "cancelled"] = "pending"
    response: Optional[str] = None
    responded_at: Optional[datetime] = None