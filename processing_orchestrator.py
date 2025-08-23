# Processing Orchestrator for Workflow Coordination
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Optional, Any, List
from websocket_models import (
    ProcessingStarted, ProcessingStatus, ProcessingCompleted,
    StepUpdate, PhaseTransition, ProgressUpdate, ErrorMessage
)

logger = logging.getLogger(__name__)


class ProcessingOrchestrator:
    def __init__(self, websocket_manager, clarification_handler):
        self.websocket_manager = websocket_manager
        self.clarification_handler = clarification_handler
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Register message handlers
        self.websocket_manager.register_message_handler(
            "start_order_processing", 
            self.handle_start_processing
        )
        self.websocket_manager.register_message_handler(
            "cancel_processing", 
            self.handle_cancel_processing
        )
        self.websocket_manager.register_message_handler(
            "get_processing_status", 
            self.handle_get_status
        )
    
    async def start_processing(
        self, 
        client_id: str, 
        order_text: str, 
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Start order processing workflow"""
        
        run_id = str(uuid.uuid4())
        
        # Create processing session
        session = self.websocket_manager.create_processing_session(client_id, run_id)
        
        # Initialize session data
        session_data = {
            "run_id": run_id,
            "client_id": client_id,
            "order_text": order_text,
            "options": options or {},
            "start_time": datetime.utcnow(),
            "current_phase": "initialization",
            "steps_completed": 0,
            "total_steps": None,
            "current_step": None,
            "error": None,
            "result": None
        }
        
        self.active_sessions[run_id] = session_data
        
        # Send processing started message
        await self.websocket_manager.send_message(
            client_id,
            "processing_started",
            ProcessingStarted(
                run_id=run_id,
                message="Order processing started successfully"
            )
        )
        
        logger.info(f"[ProcessingOrchestrator] Started processing session {run_id} for client {client_id}")
        return run_id
    
    async def handle_start_processing(self, client_id: str, request_data):
        """Handle start processing request from client"""
        try:
            order_text = request_data.order_text
            options = getattr(request_data, 'options', None)
            
            run_id = await self.start_processing(client_id, order_text, options)
            
            # Start background processing
            asyncio.create_task(self._execute_processing_workflow(run_id))
            
        except Exception as e:
            logger.error(f"[ProcessingOrchestrator] Error starting processing for {client_id}: {e}")
            await self.websocket_manager.send_error(
                client_id, 
                "start_processing_error", 
                f"Failed to start processing: {str(e)}"
            )
    
    async def handle_cancel_processing(self, client_id: str, request_data):
        """Handle cancel processing request from client"""
        try:
            run_id = request_data.run_id
            reason = getattr(request_data, 'reason', 'User requested cancellation')
            
            await self.cancel_processing(run_id, reason)
            
        except Exception as e:
            logger.error(f"[ProcessingOrchestrator] Error cancelling processing: {e}")
            await self.websocket_manager.send_error(
                client_id, 
                "cancel_processing_error", 
                f"Failed to cancel processing: {str(e)}"
            )
    
    async def handle_get_status(self, client_id: str, request_data):
        """Handle get processing status request from client"""
        try:
            run_id = request_data.run_id
            status = self.get_processing_status(run_id)
            
            if status:
                await self.websocket_manager.send_message(
                    client_id,
                    "processing_status",
                    status
                )
            else:
                await self.websocket_manager.send_error(
                    client_id,
                    "status_not_found",
                    f"Processing session {run_id} not found"
                )
                
        except Exception as e:
            logger.error(f"[ProcessingOrchestrator] Error getting status: {e}")
            await self.websocket_manager.send_error(
                client_id,
                "get_status_error",
                f"Failed to get processing status: {str(e)}"
            )
    
    async def send_step_update(self, run_id: str, step_update: StepUpdate):
        """Send step update to client"""
        if run_id not in self.active_sessions:
            logger.warning(f"[ProcessingOrchestrator] Step update for unknown session {run_id}")
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        
        # Update session data
        session_data["current_step"] = step_update.step_name
        
        if step_update.status == "completed":
            session_data["steps_completed"] += 1
        
        # Calculate progress if total steps known
        if session_data.get("total_steps"):
            progress = (session_data["steps_completed"] / session_data["total_steps"]) * 100
            step_update.progress_percentage = progress
        
        logger.info(f"[ProcessingOrchestrator] Sending step update for {run_id}: {step_update.step_name} - {step_update.status}")
        
        # Send update to client
        success = await self.websocket_manager.send_message(
            client_id,
            "step_update",
            step_update
        )
        
        if not success:
            logger.warning(f"[ProcessingOrchestrator] Failed to send step update to client {client_id}")
        
        # Update websocket manager session
        await self.websocket_manager.update_processing_session(
            run_id,
            current_step=step_update.step_name,
            progress_percentage=step_update.progress_percentage or 0
        )
    
    async def send_phase_transition(self, run_id: str, to_phase: str, description: str, estimated_duration: int = None):
        """Send phase transition update"""
        if run_id not in self.active_sessions:
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        from_phase = session_data.get("current_phase")
        
        # Update session
        session_data["current_phase"] = to_phase
        
        # Send phase transition
        phase_transition = PhaseTransition(
            run_id=run_id,
            from_phase=from_phase,
            to_phase=to_phase,
            phase_description=description,
            estimated_duration_seconds=estimated_duration
        )
        
        await self.websocket_manager.send_message(
            client_id,
            "phase_transition",
            phase_transition
        )
    
    async def send_progress_update(self, run_id: str, current_step: str, progress_percentage: float, message: str = None):
        """Send progress update"""
        if run_id not in self.active_sessions:
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        
        progress_update = ProgressUpdate(
            run_id=run_id,
            current_step=current_step,
            progress_percentage=progress_percentage,
            message=message
        )
        
        await self.websocket_manager.send_message(
            client_id,
            "progress_update",
            progress_update
        )
    
    async def handle_processing_error(self, run_id: str, error: Exception):
        """Handle processing error"""
        if run_id not in self.active_sessions:
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        
        # Update session
        session_data["error"] = str(error)
        
        # Update websocket manager session
        await self.websocket_manager.update_processing_session(
            run_id,
            status="failed",
            error=str(error)
        )
        
        # Send error to client
        error_msg = ErrorMessage(
            error_type="processing_error",
            error_code="workflow_error",
            message=f"Processing failed: {str(error)}",
            run_id=run_id,
            recoverable=False
        )
        
        await self.websocket_manager.send_message(client_id, "error", error_msg)
        
        # Send final status
        await self.websocket_manager.send_message(
            client_id,
            "processing_status",
            ProcessingStatus(
                run_id=run_id,
                status="failed",
                message=f"Processing failed: {str(error)}"
            )
        )
        
        logger.error(f"[ProcessingOrchestrator] Processing error for {run_id}: {error}")
    
    async def complete_processing(self, run_id: str, result: Dict[str, Any]):
        """Complete processing workflow"""
        if run_id not in self.active_sessions:
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        
        # Update session
        session_data["result"] = result
        processing_time = (datetime.utcnow() - session_data["start_time"]).total_seconds()
        
        # Update websocket manager session
        await self.websocket_manager.update_processing_session(
            run_id,
            status="completed",
            result=result
        )
        
        # Send completion message
        completion_msg = ProcessingCompleted(
            run_id=run_id,
            message="Order processing completed successfully",
            final_output=result,
            processing_time_seconds=processing_time
        )
        
        await self.websocket_manager.send_message(
            client_id,
            "processing_completed",
            completion_msg
        )
        
        logger.info(f"[ProcessingOrchestrator] Completed processing for {run_id} in {processing_time:.2f}s")
        
        # Cleanup session after a delay
        asyncio.create_task(self._cleanup_session_delayed(run_id, 300))  # 5 minutes
    
    async def cancel_processing(self, run_id: str, reason: str = "Cancelled"):
        """Cancel processing workflow"""
        if run_id not in self.active_sessions:
            return
        
        session_data = self.active_sessions[run_id]
        client_id = session_data["client_id"]
        
        # Cancel any pending clarifications
        pending_clarifications = self.clarification_handler.get_pending_clarifications(client_id)
        for clarification_id in pending_clarifications:
            await self.clarification_handler.cancel_clarification(clarification_id, reason)
        
        # Update session
        session_data["error"] = reason
        
        # Cancel websocket manager session
        await self.websocket_manager.cancel_processing_session(run_id, reason)
        
        logger.info(f"[ProcessingOrchestrator] Cancelled processing {run_id}: {reason}")
    
    def get_processing_status(self, run_id: str) -> Optional[ProcessingStatus]:
        """Get current processing status"""
        if run_id not in self.active_sessions:
            return None
        
        session_data = self.active_sessions[run_id]
        ws_session = self.websocket_manager.get_processing_session(run_id)
        
        if not ws_session:
            return None
        
        return ProcessingStatus(
            run_id=run_id,
            status=ws_session.status,
            current_step=session_data.get("current_step"),
            message=f"Processing in phase: {session_data.get('current_phase', 'unknown')}",
            progress_percentage=ws_session.progress_percentage,
            steps_completed=session_data.get("steps_completed", 0),
            total_steps=session_data.get("total_steps")
        )
    
    async def _execute_processing_workflow(self, run_id: str):
        """Execute the main processing workflow"""
        try:
            session_data = self.active_sessions[run_id]
            client_id = session_data["client_id"]
            order_text = session_data["order_text"]
            
            # Get processor from global scope to avoid circular imports
            import sys
            main_module = sys.modules.get('__main__')
            if main_module and hasattr(main_module, 'processor'):
                processor = main_module.processor
            else:
                raise Exception("Processor not available in main module")
            
            # Update status to running
            await self.websocket_manager.update_processing_session(run_id, status="running")
            
            await self.websocket_manager.send_message(
                client_id,
                "processing_status",
                ProcessingStatus(
                    run_id=run_id,
                    status="running",
                    message="Starting order processing workflow..."
                )
            )
            
            # Execute the actual processing
            result = await processor.process_order(
                order_text, 
                self.websocket_manager, 
                client_id,
                run_id=run_id,
                orchestrator=self
            )
            
            # Complete processing
            await self.complete_processing(run_id, result)
            
        except Exception as e:
            await self.handle_processing_error(run_id, e)
    
    async def _cleanup_session_delayed(self, run_id: str, delay_seconds: int):
        """Cleanup session after delay"""
        await asyncio.sleep(delay_seconds)
        
        if run_id in self.active_sessions:
            del self.active_sessions[run_id]
        
        self.websocket_manager.cleanup_processing_session(run_id)
        logger.info(f"[ProcessingOrchestrator] Cleaned up session {run_id}")
    
    def get_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get all active processing sessions"""
        return self.active_sessions.copy()
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get processing session statistics"""
        total_sessions = len(self.active_sessions)
        
        phase_counts = {}
        for session in self.active_sessions.values():
            phase = session.get("current_phase", "unknown")
            phase_counts[phase] = phase_counts.get(phase, 0) + 1
        
        return {
            "total_active_sessions": total_sessions,
            "phase_breakdown": phase_counts,
            "websocket_session_stats": self.websocket_manager.get_connection_stats()
        }