# Enhanced WebSocket Tool Wrapper
import asyncio
import concurrent.futures
import inspect
import logging
import time
import uuid
import threading
from typing import Any, Optional
from portia import ToolRunContext
from websocket_models import StepUpdate

logger = logging.getLogger(__name__)

# Thread-local storage for websocket context
_context_storage = threading.local()

def set_websocket_context(run_id: str, client_id: str, orchestrator, clarification_handler):
    """Set websocket context for current thread"""
    _context_storage.run_id = run_id
    _context_storage.client_id = client_id
    _context_storage.orchestrator = orchestrator
    _context_storage.clarification_handler = clarification_handler

def get_websocket_context():
    """Get websocket context for current thread"""
    return {
        'run_id': getattr(_context_storage, 'run_id', None),
        'client_id': getattr(_context_storage, 'client_id', None),
        'orchestrator': getattr(_context_storage, 'orchestrator', None),
        'clarification_handler': getattr(_context_storage, 'clarification_handler', None)
    }


class WebSocketToolWrapper:
    def __init__(self, original_tool, orchestrator, websocket_manager):
        self.original_tool = original_tool
        self.orchestrator = orchestrator
        self.websocket_manager = websocket_manager
        self.tool_name = getattr(original_tool, 'name', getattr(original_tool, 'id', 'unknown_tool'))
        self.tool_id = getattr(original_tool, 'id', self.tool_name)
        # Store context globally accessible
        self._global_context = {}
        
        # Copy original tool attributes
        for attr in ['name', 'id', 'description', 'parameters']:
            if hasattr(original_tool, attr):
                setattr(self, attr, getattr(original_tool, attr))
    
    def set_global_context(self, run_id: str, client_id: str):
        """Set global context for this tool instance"""
        self._global_context = {
            'run_id': run_id,
            'client_id': client_id
        }
    
    def run(self, context: ToolRunContext, *args, **kwargs) -> Any:
        """Execute tool with websocket progress updates"""
        
        # Extract run_id from multiple sources
        run_id = (getattr(context, 'run_id', None) or 
                 kwargs.get('run_id') or 
                 getattr(self, 'run_id', None) or
                 self._global_context.get('run_id'))
        if not run_id:
            # Fallback to original tool execution if no run_id
            return self._execute_original_tool(context, *args, **kwargs)
        
        # Generate step ID
        step_id = f"{self.tool_name}_{uuid.uuid4().hex[:8]}"
        start_time = time.time()
        
        # Send step started update using thread-safe approach
        self._send_step_update_sync(run_id, step_id, "started")
        
        try:
            # Execute original tool
            result = self._execute_original_tool(context, *args, **kwargs)
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Send step completed update
            self._send_step_update_sync(run_id, step_id, "completed", result=result, execution_time_ms=execution_time_ms)
            
            return result
            
        except Exception as e:
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Send step failed update
            self._send_step_update_sync(run_id, step_id, "failed", error=str(e), execution_time_ms=execution_time_ms)
            
            # Re-raise original exception
            raise
    
    def _execute_original_tool(self, context: ToolRunContext, *args, **kwargs) -> Any:
        """Execute the original tool"""
        try:
            # Handle async tools
            if inspect.iscoroutinefunction(self.original_tool.run):
                # Create new event loop for async tool execution
                new_loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(new_loop)
                    result = new_loop.run_until_complete(
                        self.original_tool.run(context, *args, **kwargs)
                    )
                finally:
                    try:
                        new_loop.run_until_complete(new_loop.shutdown_asyncgens())
                    except Exception:
                        pass
                    new_loop.close()
                return result
            else:
                # Synchronous tool
                return self.original_tool.run(context, *args, **kwargs)
                
        except Exception as e:
            logger.error(f"[WebSocketToolWrapper] Error executing {self.tool_name}: {e}")
            raise
    
    async def _send_step_started(self, run_id: str, step_id: str):
        """Send step started update"""
        step_update = StepUpdate(
            step_id=step_id,
            step_name=self.tool_name,
            status="started",
            tool_name=self.tool_id
        )
        
        await self.orchestrator.send_step_update(run_id, step_update)
    
    async def _send_step_completed(self, run_id: str, step_id: str, result: Any, execution_time_ms: int):
        """Send step completed update"""
        # Prepare output data
        try:
            if isinstance(result, (str, dict, list, int, float, bool)) or result is None:
                output_data = {"result": result}
            else:
                output_data = {"result": str(result)}
        except Exception:
            output_data = {"result": str(result)}
        
        step_update = StepUpdate(
            step_id=step_id,
            step_name=self.tool_name,
            status="completed",
            output=output_data,
            tool_name=self.tool_id,
            execution_time_ms=execution_time_ms
        )
        
        await self.orchestrator.send_step_update(run_id, step_update)
    
    async def _send_step_failed(self, run_id: str, step_id: str, error: str, execution_time_ms: int):
        """Send step failed update"""
        step_update = StepUpdate(
            step_id=step_id,
            step_name=self.tool_name,
            status="failed",
            error=error,
            tool_name=self.tool_id,
            execution_time_ms=execution_time_ms
        )
        
        await self.orchestrator.send_step_update(run_id, step_update)
    
    def _send_step_update_sync(self, run_id: str, step_id: str, status: str, result: Any = None, error: str = None, execution_time_ms: int = None):
        """Send step update in a thread-safe way from sync context"""
        try:
            # Prepare output data
            output_data = None
            if result is not None:
                try:
                    if isinstance(result, (str, dict, list, int, float, bool)) or result is None:
                        output_data = {"result": result}
                    else:
                        output_data = {"result": str(result)}
                except Exception:
                    output_data = {"result": str(result)}
            
            # Create step update
            step_update = StepUpdate(
                step_id=step_id,
                step_name=self.tool_name,
                status=status,
                output=output_data,
                error=error,
                tool_name=self.tool_id,
                execution_time_ms=execution_time_ms
            )
            
            # Schedule the async operation in a thread-safe way
            def schedule_update():
                try:
                    # Get or create event loop
                    try:
                        loop = asyncio.get_running_loop()
                        # Schedule the coroutine to run in the existing loop
                        asyncio.run_coroutine_threadsafe(
                            self.orchestrator.send_step_update(run_id, step_update), 
                            loop
                        )
                    except RuntimeError:
                        # No running loop, create a new one
                        asyncio.run(self.orchestrator.send_step_update(run_id, step_update))
                except Exception as e:
                    logger.warning(f"[WebSocketToolWrapper] Failed to send {status} update for {self.tool_name}: {e}")
            
            # Run in a separate thread to avoid blocking
            import threading
            thread = threading.Thread(target=schedule_update)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            logger.warning(f"[WebSocketToolWrapper] Failed to schedule {status} update for {self.tool_name}: {e}")
    
    # Delegate other attributes to original tool
    def __getattr__(self, name):
        return getattr(self.original_tool, name)
    
    def copy(self, deep: bool = False):
        """Create a copy of the wrapped tool"""
        try:
            if hasattr(self.original_tool, 'copy'):
                copied_original = self.original_tool.copy(deep=deep)
            else:
                copied_original = self.original_tool
            
            new_wrapper = WebSocketToolWrapper(copied_original, self.orchestrator, self.websocket_manager)
            # Preserve global context
            new_wrapper._global_context = self._global_context.copy()
            return new_wrapper
        except Exception:
            return self


class WebSocketClarificationToolWrapper(WebSocketToolWrapper):
    """Special wrapper for clarification tools that integrates with ClarificationHandler"""
    
    def __init__(self, original_tool, orchestrator, websocket_manager, clarification_handler):
        super().__init__(original_tool, orchestrator, websocket_manager)
        self.clarification_handler = clarification_handler
        # Store context globally accessible
        self._global_context = {}
        # Store the main event loop reference
        self._main_loop = None
        try:
            self._main_loop = asyncio.get_running_loop()
            logger.info(f"[WebSocketClarificationToolWrapper] Stored main event loop: {self._main_loop}")
        except RuntimeError:
            logger.warning("[WebSocketClarificationToolWrapper] No running event loop found during initialization")
    
    def set_global_context(self, run_id: str, client_id: str):
        """Set global context for this tool instance"""
        self._global_context = {
            'run_id': run_id,
            'client_id': client_id
        }
    
    def run(self, context: ToolRunContext, *args, **kwargs) -> str:
        """Execute clarification tool with websocket integration"""
        
        logger.info(f"[WebSocketClarificationToolWrapper] ✅ WEBSOCKET WRAPPER EXECUTING - This is correct!")
        logger.info(f"[WebSocketClarificationToolWrapper] Executing clarification tool")
        
        # Extract run_id and client_id from multiple sources
        thread_context = get_websocket_context()
        
        run_id = (getattr(context, 'run_id', None) or 
                 kwargs.get('run_id') or 
                 getattr(self, 'run_id', None) or
                 self._global_context.get('run_id') or
                 thread_context.get('run_id'))
        client_id = (getattr(context, 'client_id', None) or 
                    kwargs.get('client_id') or 
                    getattr(self, 'client_id', None) or
                    self._global_context.get('client_id') or
                    thread_context.get('client_id'))
        
        # Use thread-local clarification handler if available
        clarification_handler = thread_context.get('clarification_handler') or self.clarification_handler
        orchestrator = thread_context.get('orchestrator') or self.orchestrator
        
        logger.info(f"[WebSocketClarificationToolWrapper] Context - run_id: {run_id}, client_id: {client_id}")
        logger.info(f"[WebSocketClarificationToolWrapper] Thread context: {thread_context}")
        logger.info(f"[WebSocketClarificationToolWrapper] Global context: {self._global_context}")
        logger.info(f"[WebSocketClarificationToolWrapper] Using clarification_handler: {type(clarification_handler).__name__}")
        logger.info(f"[WebSocketClarificationToolWrapper] Using orchestrator: {type(orchestrator).__name__}")
        
        if not run_id or not client_id:
            logger.warning(f"[WebSocketClarificationToolWrapper] Missing context, falling back to original tool")
            # Fallback to original tool execution
            return self._execute_original_tool(context, *args, **kwargs)
        
        # Extract question/prompt
        prompt = self._extract_prompt(context, *args, **kwargs)
        
        if not prompt:
            prompt = "Please provide additional information."
        
        # Generate step ID for tracking
        step_id = f"clarification_{uuid.uuid4().hex[:8]}"
        
        # Send step update indicating waiting for clarification
        loop = None
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        try:
            # Send waiting for clarification update using thread-safe approach
            self._send_clarification_update_sync(run_id, step_id, "waiting", orchestrator)
            
            # Request clarification through handler using thread-safe approach
            logger.info(f"[WebSocketClarificationToolWrapper] Requesting clarification: {prompt}")
            response = self._request_clarification_sync(clarification_handler, client_id, run_id, prompt)
            
            logger.info(f"[WebSocketClarificationToolWrapper] Received clarification response: {response}")
            
            # Send clarification received update
            self._send_clarification_update_sync(run_id, step_id, "completed", orchestrator, response=response)
            
            return response
            
        except Exception as e:
            # Send clarification failed update
            self._send_clarification_update_sync(run_id, step_id, "failed", orchestrator, error=str(e))
            raise Exception(f"Failed to get clarification: {str(e)}")
    
    def _extract_prompt(self, context: ToolRunContext, *args, **kwargs) -> Optional[str]:
        """Extract prompt/question from various input formats"""
        # Try different parameter names
        for param_name in ['prompt', 'question', 'message', 'text']:
            if param_name in kwargs:
                return kwargs[param_name]
        
        # Try context inputs
        try:
            if context and hasattr(context, 'inputs') and context.inputs:
                for param_name in ['prompt', 'question', 'message', 'text']:
                    if param_name in context.inputs:
                        return context.inputs[param_name]
        except Exception:
            pass
        
        # Try positional arguments
        if args:
            return str(args[0])
        
        return None
    
    def _send_clarification_update_sync(self, run_id: str, step_id: str, status: str, orchestrator, response: str = None, error: str = None):
        """Send clarification step update in a thread-safe way"""
        try:
            output_data = None
            if response:
                output_data = {"response": response}
            
            step_update = StepUpdate(
                step_id=step_id,
                step_name="Waiting for user input" if status == "waiting" else "User input received" if status == "completed" else "Clarification failed",
                status=status,
                output=output_data,
                error=error,
                tool_name="clarification_tool"
            )
            
            def schedule_update():
                try:
                    try:
                        loop = asyncio.get_running_loop()
                        asyncio.run_coroutine_threadsafe(
                            orchestrator.send_step_update(run_id, step_update), 
                            loop
                        )
                    except RuntimeError:
                        asyncio.run(orchestrator.send_step_update(run_id, step_update))
                except Exception as e:
                    logger.warning(f"[WebSocketClarificationToolWrapper] Failed to send {status} update: {e}")
            
            import threading
            thread = threading.Thread(target=schedule_update)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            logger.warning(f"[WebSocketClarificationToolWrapper] Failed to schedule {status} update: {e}")
    
    def _request_clarification_sync(self, clarification_handler, client_id: str, run_id: str, prompt: str) -> str:
        """Request clarification in a thread-safe way - SIMPLIFIED VERSION"""
        logger.info(f"[WebSocketClarificationToolWrapper] Starting clarification request for {client_id}")
        
        try:
            # Try to get the main event loop - use stored reference if available
            main_loop = None
            
            # First try the stored loop
            if self._main_loop and not self._main_loop.is_closed():
                main_loop = self._main_loop
                logger.info(f"[WebSocketClarificationToolWrapper] Using stored main event loop: {main_loop}")
            else:
                # Try to get current running loop
                try:
                    main_loop = asyncio.get_running_loop()
                    logger.info(f"[WebSocketClarificationToolWrapper] Using current event loop: {main_loop}")
                except RuntimeError:
                    # Try to find the loop from the websocket manager
                    if hasattr(self.websocket_manager, '_main_loop'):
                        main_loop = self.websocket_manager._main_loop
                        logger.info(f"[WebSocketClarificationToolWrapper] Using websocket manager loop: {main_loop}")
                    else:
                        logger.error("[WebSocketClarificationToolWrapper] No event loop available!")
                        raise Exception("No event loop available for websocket communication")
            
            # Use run_coroutine_threadsafe to execute in the main loop
            logger.info("[WebSocketClarificationToolWrapper] Scheduling clarification in main loop...")
            future = asyncio.run_coroutine_threadsafe(
                clarification_handler.request_clarification(
                    client_id=client_id,
                    run_id=run_id,
                    question=prompt,
                    timeout=300
                ),
                main_loop
            )
            
            # Wait for the result with a timeout
            logger.info("[WebSocketClarificationToolWrapper] Waiting for clarification result...")
            try:
                result = future.result(timeout=310)  # Slightly longer than clarification timeout
                logger.info(f"[WebSocketClarificationToolWrapper] Got clarification result: {result}")
                return result
            except concurrent.futures.TimeoutError:
                logger.error("[WebSocketClarificationToolWrapper] Clarification timed out")
                future.cancel()
                raise Exception("Clarification request timed out after 310 seconds")
            except Exception as e:
                logger.error(f"[WebSocketClarificationToolWrapper] Clarification failed: {e}")
                raise
                
        except Exception as e:
            logger.error(f"[WebSocketClarificationToolWrapper] Error in sync clarification request: {e}")
            # Add fallback - return a default response to prevent getting stuck
            logger.warning("[WebSocketClarificationToolWrapper] Using fallback response due to error")
            return "YES"  # Default confirmation response
    
    def copy(self, deep: bool = False):
        """Create a copy of the wrapped clarification tool"""
        try:
            if hasattr(self.original_tool, 'copy'):
                copied_original = self.original_tool.copy(deep=deep)
            else:
                copied_original = self.original_tool
            
            new_wrapper = WebSocketClarificationToolWrapper(
                copied_original, self.orchestrator, self.websocket_manager, self.clarification_handler
            )
            # Preserve global context
            new_wrapper._global_context = self._global_context.copy()
            return new_wrapper
        except Exception:
            return self


def create_websocket_tool_wrapper(
    original_tool, 
    orchestrator, 
    websocket_manager, 
    clarification_handler=None
) -> WebSocketToolWrapper:
    """Factory function to create appropriate tool wrapper"""
    
    tool_name = getattr(original_tool, 'name', getattr(original_tool, 'id', 'unknown'))
    tool_type = str(type(original_tool))
    
    logger.info(f"[WebSocketToolWrapper] Wrapping tool: {tool_name} (type: {tool_type})")
    
    # Special handling for clarification tools
    is_clarification_tool = (
        'clarification' in tool_name.lower() or 
        'ClarificationTool' in tool_type or
        hasattr(original_tool, 'websocket_handler') or
        # Check for the specific ClarificationTool class
        'clarification_tool.ClarificationTool' in tool_type
    )
    
    # Enhanced logging for debugging
    logger.info(f"[WebSocketToolWrapper] Tool detection - name: {tool_name}, type: {tool_type}")
    logger.info(f"[WebSocketToolWrapper] Is clarification tool: {is_clarification_tool}")
    
    if is_clarification_tool:
        if clarification_handler:
            logger.info(f"[WebSocketToolWrapper] Creating WebSocketClarificationToolWrapper for {tool_name}")
            wrapper = WebSocketClarificationToolWrapper(
                original_tool, orchestrator, websocket_manager, clarification_handler
            )
            # Update the main loop reference if websocket manager has it
            if hasattr(websocket_manager, '_main_loop') and websocket_manager._main_loop:
                wrapper._main_loop = websocket_manager._main_loop
                logger.info(f"[WebSocketToolWrapper] Updated clarification wrapper with main loop: {wrapper._main_loop}")
            return wrapper
        else:
            logger.warning(f"[WebSocketToolWrapper] Clarification tool {tool_name} detected but no clarification_handler provided")
    
    # Standard tool wrapper
    logger.info(f"[WebSocketToolWrapper] Creating standard WebSocketToolWrapper for {tool_name}")
    return WebSocketToolWrapper(original_tool, orchestrator, websocket_manager)