import functools
import time
import logging
from typing import Callable, Any, Type, Tuple

logger = logging.getLogger(__name__)

def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """リトライデコレータ"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        logger.error(f"{func.__name__} 最大リトライ回数に達しました: {e}")
                        raise e
                    
                    wait_time = delay * (backoff ** attempt)
                    logger.warning(
                        f"{func.__name__} リトライ {attempt + 1}/{max_attempts}, "
                        f"待機時間: {wait_time:.1f}秒, エラー: {e}"
                    )
                    time.sleep(wait_time)
            
            raise last_exception
        
        return wrapper
    return decorator

def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """非同期リトライデコレータ"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            import asyncio
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        logger.error(f"{func.__name__} 最大リトライ回数に達しました: {e}")
                        raise e
                    
                    wait_time = delay * (backoff ** attempt)
                    logger.warning(
                        f"{func.__name__} リトライ {attempt + 1}/{max_attempts}, "
                        f"待機時間: {wait_time:.1f}秒, エラー: {e}"
                    )
                    await asyncio.sleep(wait_time)
            
            raise last_exception
        
        return wrapper
    return decorator