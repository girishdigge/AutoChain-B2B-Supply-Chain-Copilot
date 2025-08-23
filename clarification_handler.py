# Enhanced Clarification Handler for Interactive Workflows
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from websocket_models import (
    ClarificationRequest, ClarificationResponse, ClarificationContext,
    ClarificationTimeout, ClarificationAcknowledged
)

logger = logging.getLogger(__name__)


class ClarificationHandler:
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        self.pending_clarifications: Dict[str, ClarificationContext] = {}
        self.response_futures: Dict[str, asyncio.Future] = {}
        self.timeout_tasks: Dict[str, asyncio.Task] = {}
        
        # Register message handler for clarification responses
        self.websocket_manager.register_message_handler(
            "clarification_response", 
            self.handle_clarification_response
        )
    
    async def request_clarification(
        self, 
        client_id: str, 
        run_id: str,
        question: str, 
        timeout: int = 300,
        context: Optional[Dict] = None,
        options: Optional[list] = None
    ) -> str:
        """Request clarification from client and wait for response"""
        
        clarification_id = f"clarify_{uuid.uuid4().hex[:8]}"
        
        # Create clarification context
        clarification_context = ClarificationContext(
            clarification_id=clarification_id,
            client_id=client_id,
            run_id=run_id,
            question=question,
            timeout_seconds=timeout,
            context=context,
            options=options
        )
        
        # Store context and create future for response
        self.pending_clarifications[clarification_id] = clarification_context
        response_future = asyncio.Future()
        self.response_futures[clarification_id] = response_future
        
        logger.info(f"[ClarificationHandler] Requesting clarification {clarification_id} from client {client_id}")
        
        try:
            # Send clarification request to client
            clarification_request = ClarificationRequest(
                clarification_id=clarification_id,
                question=question,
                timeout_seconds=timeout,
                context=context,
                options=options
            )
            
            success = await self.websocket_manager.send_message(
                client_id, 
                "clarification_request", 
                clarification_request
            )
            
            if not success:
                raise Exception(f"Failed to send clarification request to client {client_id}")
            
            # Set up timeout task
            timeout_task = asyncio.create_task(
                self._handle_timeout(clarification_id, timeout)
            )
            self.timeout_tasks[clarification_id] = timeout_task
            
            # Wait for response or timeout
            try:
                response = await response_future
                
                # Cancel timeout task
                if not timeout_task.done():
                    timeout_task.cancel()
                
                # Update context
                clarification_context.status = "responded"
                clarification_context.response = response
                clarification_context.responded_at = datetime.utcnow()
                
                logger.info(f"[ClarificationHandler] Received response for {clarification_id}: {response[:100]}...")
                return response
                
            except asyncio.TimeoutError:
                # Handle timeout
                clarification_context.status = "timeout"
                await self._send_timeout_notification(client_id, clarification_id)
                raise Exception(f"Clarification request {clarification_id} timed out after {timeout} seconds")
                
        except Exception as e:
            # Cleanup on error
            await self._cleanup_clarification(clarification_id)
            logger.error(f"[ClarificationHandler] Error in clarification {clarification_id}: {e}")
            raise
        
        finally:
            # Always cleanup after completion
            await self._cleanup_clarification(clarification_id)
    
    async def handle_clarification_response(self, client_id: str, response_data: ClarificationResponse):
        """Handle clarification response from client"""
        clarification_id = response_data.clarification_id
        response = response_data.response
        
        logger.info(f"[ClarificationHandler] Handling response for {clarification_id} from {client_id}")
        
        # Validate clarification exists and belongs to this client
        if clarification_id not in self.pending_clarifications:
            await self.websocket_manager.send_message(
                client_id,
                "clarification_acknowledged",
                ClarificationAcknowledged(
                    clarification_id=clarification_id,
                    message="No pending clarification found with this ID",
                    status="error"
                )
            )
            return
        
        clarification_context = self.pending_clarifications[clarification_id]
        
        if clarification_context.client_id != client_id:
            await self.websocket_manager.send_message(
                client_id,
                "clarification_acknowledged",
                ClarificationAcknowledged(
                    clarification_id=clarification_id,
                    message="Clarification does not belong to this client",
                    status="error"
                )
            )
            return
        
        if clarification_context.status != "pending":
            await self.websocket_manager.send_message(
                client_id,
                "clarification_acknowledged",
                ClarificationAcknowledged(
                    clarification_id=clarification_id,
                    message=f"Clarification already {clarification_context.status}",
                    status="error"
                )
            )
            return
        
        # Validate response if options were provided
        if clarification_context.options and response not in clarification_context.options:
            await self.websocket_manager.send_message(
                client_id,
                "clarification_acknowledged",
                ClarificationAcknowledged(
                    clarification_id=clarification_id,
                    message=f"Invalid response. Expected one of: {clarification_context.options}",
                    status="error"
                )
            )
            return
        
        # Set response in future
        if clarification_id in self.response_futures:
            future = self.response_futures[clarification_id]
            if not future.done():
                logger.info(f"[ClarificationHandler] Setting future result for {clarification_id}: {response}")
                future.set_result(response)
            else:
                logger.warning(f"[ClarificationHandler] Future for {clarification_id} already done")
        else:
            logger.error(f"[ClarificationHandler] No future found for {clarification_id}")
        
        # Send acknowledgment
        await self.websocket_manager.send_message(
            client_id,
            "clarification_acknowledged",
            ClarificationAcknowledged(
                clarification_id=clarification_id,
                message="Response received successfully",
                status="processed"
            )
        )
        
        logger.info(f"[ClarificationHandler] Successfully processed response for {clarification_id}")
    
    async def cancel_clarification(self, clarification_id: str, reason: str = "Cancelled"):
        """Cancel pending clarification"""
        if clarification_id not in self.pending_clarifications:
            return
        
        clarification_context = self.pending_clarifications[clarification_id]
        clarification_context.status = "cancelled"
        
        # Cancel future if pending
        if clarification_id in self.response_futures:
            future = self.response_futures[clarification_id]
            if not future.done():
                future.cancel()
        
        # Notify client
        await self.websocket_manager.send_message(
            clarification_context.client_id,
            "clarification_timeout",
            ClarificationTimeout(
                clarification_id=clarification_id,
                message=f"Clarification cancelled: {reason}"
            )
        )
        
        await self._cleanup_clarification(clarification_id)
        logger.info(f"[ClarificationHandler] Cancelled clarification {clarification_id}: {reason}")
    
    async def _handle_timeout(self, clarification_id: str, timeout_seconds: int):
        """Handle clarification timeout"""
        try:
            await asyncio.sleep(timeout_seconds)
            
            # Check if still pending
            if (clarification_id in self.pending_clarifications and 
                self.pending_clarifications[clarification_id].status == "pending"):
                
                # Set timeout status
                self.pending_clarifications[clarification_id].status = "timeout"
                
                # Cancel future with timeout
                if clarification_id in self.response_futures:
                    future = self.response_futures[clarification_id]
                    if not future.done():
                        future.set_exception(asyncio.TimeoutError())
                
                # Send timeout notification
                clarification_context = self.pending_clarifications[clarification_id]
                await self._send_timeout_notification(
                    clarification_context.client_id, 
                    clarification_id
                )
                
        except asyncio.CancelledError:
            # Timeout was cancelled (response received)
            pass
        except Exception as e:
            logger.error(f"[ClarificationHandler] Error in timeout handler for {clarification_id}: {e}")
    
    async def _send_timeout_notification(self, client_id: str, clarification_id: str):
        """Send timeout notification to client"""
        await self.websocket_manager.send_message(
            client_id,
            "clarification_timeout",
            ClarificationTimeout(
                clarification_id=clarification_id,
                message="Clarification request timed out"
            )
        )
    
    async def _cleanup_clarification(self, clarification_id: str):
        """Cleanup clarification resources"""
        # Cancel timeout task
        if clarification_id in self.timeout_tasks:
            task = self.timeout_tasks[clarification_id]
            if not task.done():
                task.cancel()
            del self.timeout_tasks[clarification_id]
        
        # Remove future
        if clarification_id in self.response_futures:
            del self.response_futures[clarification_id]
        
        # Remove context (keep for a short time for debugging)
        # We'll let the cleanup loop handle this
    
    def get_pending_clarifications(self, client_id: str = None) -> Dict[str, ClarificationContext]:
        """Get pending clarifications, optionally filtered by client"""
        if client_id:
            return {
                cid: context for cid, context in self.pending_clarifications.items()
                if context.client_id == client_id and context.status == "pending"
            }
        return {
            cid: context for cid, context in self.pending_clarifications.items()
            if context.status == "pending"
        }
    
    def get_clarification_context(self, clarification_id: str) -> Optional[ClarificationContext]:
        """Get clarification context by ID"""
        return self.pending_clarifications.get(clarification_id)
    
    async def cleanup_old_clarifications(self, max_age_hours: int = 24):
        """Cleanup old clarification contexts"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        old_clarifications = [
            cid for cid, context in self.pending_clarifications.items()
            if context.created_at < cutoff_time and context.status != "pending"
        ]
        
        for clarification_id in old_clarifications:
            await self._cleanup_clarification(clarification_id)
            if clarification_id in self.pending_clarifications:
                del self.pending_clarifications[clarification_id]
        
        if old_clarifications:
            logger.info(f"[ClarificationHandler] Cleaned up {len(old_clarifications)} old clarifications")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get clarification handler statistics"""
        status_counts = {}
        for context in self.pending_clarifications.values():
            status_counts[context.status] = status_counts.get(context.status, 0) + 1
        
        return {
            "total_clarifications": len(self.pending_clarifications),
            "pending_clarifications": len(self.response_futures),
            "active_timeouts": len(self.timeout_tasks),
            "status_breakdown": status_counts
        }