/**
 * Thinking 区域更新优化 Hook
 * 
 * 问题：Thinking 区域更新过于频繁，导致性能问题
 * 解决方案：添加 throttling 机制
 */

import { useRef, useEffect } from 'react';

/**
 * 创建一个带 throttling 的状态更新 Hook
 * 
 * @param {Function} setState - 原始 setState 函数
 * @param {number} delay - 节流延迟（毫秒）
 * @returns {Function} 带节流的 setState 函数
 */
export function useThrottledState(setState, delay = 50) {
  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  const timeoutRef = useRef(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (newValue) => {
    const now = Date.now();

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果距离上次更新时间超过延迟，立即更新
    if (now - lastUpdateRef.current > delay) {
      setState(newValue);
      lastUpdateRef.current = now;
      pendingUpdateRef.current = null;
    } else {
      // 否则，保存待更新的值
      pendingUpdateRef.current = newValue;

      // 设置定时器，确保最终会更新
      timeoutRef.current = setTimeout(() => {
        if (pendingUpdateRef.current !== null) {
          setState(pendingUpdateRef.current);
          lastUpdateRef.current = Date.now();
          pendingUpdateRef.current = null;
        }
      }, delay - (now - lastUpdateRef.current));
    }
  };
}

/**
 * 创建一个混合的节流更新 Hook
 * 
 * 策略：
 * 1. 如果是高频更新（thinking delta），使用 throttling
 * 2. 如果是低频更新（其他事件），立即更新
 * 
 * @param {Function} setState - 原始 setState 函数
 * @param {Object} options - 配置选项
 * @returns {Object} 包含不同更新策略的对象
 */
export function useSmartThrottledState(setState, options = {}) {
  const {
    throttleDelay = 50,        // 节流延迟
    immediateTypes = ['tool_start', 'tool_complete', 'thinking_signature', 'thinking_redacted']
  } = options;

  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  const timeoutRef = useRef(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 立即更新（用于重要事件）
  const updateImmediate = (newValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // 支持函数式更新
    if (typeof newValue === 'function') {
      setState(newValue);
    } else {
      setState(newValue);
    }
    lastUpdateRef.current = Date.now();
    pendingUpdateRef.current = null;
  };

  // 节流更新（用于高频事件）
  const updateThrottled = (newValue) => {
    const now = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (now - lastUpdateRef.current > throttleDelay) {
      // 支持函数式更新
      if (typeof newValue === 'function') {
        setState(newValue);
      } else {
        setState(newValue);
      }
      lastUpdateRef.current = now;
      pendingUpdateRef.current = null;
    } else {
      // 对于函数式更新，我们需要保存函数本身
      pendingUpdateRef.current = newValue;

      timeoutRef.current = setTimeout(() => {
        if (pendingUpdateRef.current !== null) {
          // 支持函数式更新
          if (typeof pendingUpdateRef.current === 'function') {
            setState(pendingUpdateRef.current);
          } else {
            setState(pendingUpdateRef.current);
          }
          lastUpdateRef.current = Date.now();
          pendingUpdateRef.current = null;
        }
      }, throttleDelay - (now - lastUpdateRef.current));
    }
  };

  // 智能更新（根据类型选择策略）
  const updateSmart = (newValue, type) => {
    if (immediateTypes.includes(type)) {
      updateImmediate(newValue);
    } else if (type === 'thinking') {
      updateThrottled(newValue);
    } else {
      updateImmediate(newValue);
    }
  };

  return {
    updateImmediate,
    updateThrottled,
    updateSmart
  };
}
