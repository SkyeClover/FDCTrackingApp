import { useState, useEffect, useRef } from 'react'

export function useVirtualKeyboard() {
  const [isVisible, setIsVisible] = useState(false)
  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Check if it's a touchscreen device
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
          activeInputRef.current = target as HTMLInputElement | HTMLTextAreaElement
          setIsVisible(true)
        }
      }
    }

    const handleBlur = (e: FocusEvent) => {
      // Don't hide immediately - wait a bit in case user clicks keyboard
      setTimeout(() => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          // Only hide if focus didn't move to another input or to the keyboard
          const activeElement = document.activeElement
          const isKeyboardElement = activeElement?.closest('[data-virtual-keyboard]') !== null
          const isInputOrTextarea = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'
          
          if (!isInputOrTextarea && !isKeyboardElement) {
            setIsVisible(false)
            activeInputRef.current = null
          } else if (isInputOrTextarea && activeElement !== target) {
            // Focus moved to another input, update the active input
            activeInputRef.current = activeElement as HTMLInputElement | HTMLTextAreaElement
          }
        }
      }, 200)
    }

    document.addEventListener('focusin', handleFocus)
    document.addEventListener('focusout', handleBlur)

    return () => {
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('focusout', handleBlur)
    }
  }, [])

  const handleKeyPress = (key: string) => {
    if (activeInputRef.current) {
      const input = activeInputRef.current
      
      // Ensure input is focused
      if (document.activeElement !== input) {
        input.focus()
      }
      
      // Save current cursor position BEFORE any changes
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const currentValue = input.value

      // Calculate new value
      const newValue = currentValue.substring(0, start) + key + currentValue.substring(end)
      const newCursorPos = start + 1
      
      // Method 1: Use native value setter to update DOM value
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue)
      }
      
      // Method 2: Create and dispatch a proper input event
      // This is the key - React listens for 'input' events on controlled components
      const inputEvent = new Event('input', { 
        bubbles: true, 
        cancelable: true 
      })
      
      // Set cursor position before dispatching
      input.setSelectionRange(newCursorPos, newCursorPos)
      
      // Dispatch the event - React should catch this
      input.dispatchEvent(inputEvent)
      
      // Method 3: Also try change event (some React versions listen to this)
      const changeEvent = new Event('change', { 
        bubbles: true, 
        cancelable: true 
      })
      input.dispatchEvent(changeEvent)
      
      // Method 4: Try InputEvent with proper properties
      try {
        const nativeInputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: key,
          isComposing: false,
        })
        input.dispatchEvent(nativeInputEvent)
      } catch (e) {
        // InputEvent constructor might not be available
      }
      
      // Method 5: Access React's internal event handler directly
      // React 16+ stores props in __reactInternalInstance or __reactFiber
      const reactKeys = Object.keys(input).filter(key => 
        key.startsWith('__reactInternalInstance') || 
        key.startsWith('__reactFiber') ||
        key.startsWith('__reactProps')
      )
      
      for (const reactKey of reactKeys) {
        try {
          const reactInstance = (input as any)[reactKey]
          if (reactInstance) {
            // Try to find the memoizedProps or props
            const props = reactInstance.memoizedProps || reactInstance.pendingProps || reactInstance.props
            if (props && props.onChange) {
              // Create event-like object
              const event = {
                target: input,
                currentTarget: input,
                type: 'input',
                bubbles: true,
                cancelable: true,
              }
              props.onChange(event)
              break // Found and called, no need to continue
            }
          }
        } catch (e) {
          // Continue trying other methods
        }
      }
      
      // Ensure focus and cursor position are maintained
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const handleBackspace = () => {
    if (activeInputRef.current) {
      const input = activeInputRef.current
      
      // Save current cursor position
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const value = input.value

      let newValue: string
      let newCursorPos: number

      if (start === end && start > 0) {
        newValue = value.substring(0, start - 1) + value.substring(start)
        newCursorPos = start - 1
      } else if (start !== end) {
        newValue = value.substring(0, start) + value.substring(end)
        newCursorPos = start
      } else {
        return // Nothing to delete
      }

      input.value = newValue

      // Re-focus and restore cursor position
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)

      // Trigger input event
      const event = new Event('input', { bubbles: true })
      input.dispatchEvent(event)
      
      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true })
      input.dispatchEvent(changeEvent)
    }
  }

  const handleEnter = () => {
    if (activeInputRef.current) {
      const input = activeInputRef.current
      if (input.tagName === 'TEXTAREA') {
        handleKeyPress('\n')
      } else {
        // For input fields, blur to close keyboard
        input.blur()
        setIsVisible(false)
      }
    }
  }

  const toggle = () => {
    setIsVisible(!isVisible)
  }

  return {
    isVisible,
    toggle,
    handleKeyPress,
    handleBackspace,
    handleEnter,
  }
}

